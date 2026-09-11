import OSS from "ali-oss";
import { getToken } from "../api/client";
import { getOSSSts } from "../api/ossAi";

/** 百炼文生图返回的临时 OSS 地址（需走代理显示，可再转存到用户 bucket） */
export function isDashscopeTemporaryImageUrl(src: string): boolean {
  if (!src.startsWith("http")) return false;
  try {
    return new URL(src).hostname.toLowerCase().includes("dashscope-result");
  } catch {
    return false;
  }
}

async function readJsonError(res: Response): Promise<string> {
  const text = await res.text();
  if (!text) return `请求失败 (${res.status})`;
  try {
    const j = JSON.parse(text) as { error?: string };
    if (typeof j.error === "string" && j.error.trim()) return j.error.trim();
  } catch {
    /* not JSON */
  }
  return text.length > 300 ? `${text.slice(0, 300)}…` : text;
}

/** 使用 STS 直传阿里云 OSS，返回可访问 URL（需 bucket 规则允许读取） */
export async function uploadLocalImage(file: File): Promise<string> {
  const sts = await getOSSSts();
  const client = new OSS({
    region: sts.region,
    /** 与后端 .env 的 OSS_REGION 一致，避免仅用 region 时偶发解析到错误接入点 */
    endpoint: sts.endpoint,
    accessKeyId: sts.access_key_id,
    accessKeySecret: sts.access_key_secret,
    stsToken: sts.security_token,
    bucket: sts.bucket,
    secure: true,
  });

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "png";
  const safeExt = ext && ext.length <= 8 ? ext : "png";
  const rawPrefix = (sts.prefix ?? "").trim().replace(/\/+$/, "");
  const prefix = rawPrefix.length > 0 ? rawPrefix : "uploads";
  const key = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${safeExt}`;

  try {
    await client.put(key, file, {
      headers: {
        /** 避免 Bucket 默认「归档」等类型导致控制台无法即时预览、需解冻 */
        "x-oss-storage-class": "Standard",
      },
    });
    /**
     * 私有读 Bucket 下，裸的 https://bucket/endpoint/key 匿名 GET 会 403；
     * 画布（Fabric）加载跨域图时，服务端代理拉原图也必须带签名才能 200。
     */
    const signed = client.signatureUrl(key, {
      expires: 3300,
      method: "GET",
    });
    return typeof signed === "string" ? signed : String(signed);
  } catch (e: unknown) {
    const raw = e instanceof Error ? e.message : String(e);
    const looksCorsOrNetwork =
      /XHR error|status:\s*-1|connected:\s*false|NetworkError|Failed to fetch|CORS|cors/i.test(raw);
    if (looksCorsOrNetwork) {
      throw new Error(
        `${raw}\n\n【说明】这是浏览器直连 OSS 的上传请求被拦截或未连上，多为 Bucket 未配置跨域 CORS。\n请在阿里云 OSS 控制台打开 Bucket「${sts.bucket}」→ 数据安全 → 跨域设置 → 创建规则：来源填 http://localhost:5173 与 http://127.0.0.1:5173（若用其它端口或域名一并加上）；允许 Methods 至少包含 PUT、GET、HEAD；允许 Headers 填 *；暴露 Headers 可填 ETag。保存后等待约 1 分钟再试上传。`,
      );
    }
    throw e instanceof Error ? e : new Error(raw);
  }
}

/**
 * 经服务端 /api/ai/proxy-image 拉取百炼临时 OSS 图，再 STS 直传到用户 bucket。
 * 成功返回 OSS URL；失败抛出 Error（message 含后端返回说明，便于排查 STS/OSS 配置）。
 */
export async function uploadAIResultViaProxy(dashscopeUrl: string): Promise<string> {
  const token = getToken();
  if (!token) {
    throw new Error("请先登录后再保存到 OSS");
  }
  const res = await fetch(
    `/api/ai/proxy-image?url=${encodeURIComponent(dashscopeUrl)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) {
    throw new Error(await readJsonError(res));
  }
  const blob = await res.blob();
  const mime = blob.type?.startsWith("image/") ? blob.type : "image/png";
  const file = new File([blob], `ai-${Date.now()}.png`, { type: mime });
  return uploadLocalImage(file);
}
