import OSS from "ali-oss";
import { getOSSSts } from "../api/ossAi";

/** 使用 STS 直传阿里云 OSS，返回可访问 URL（需 bucket 规则允许读取） */
export async function uploadLocalImage(file: File): Promise<string> {
  const sts = await getOSSSts();
  const client = new OSS({
    region: sts.region,
    accessKeyId: sts.access_key_id,
    accessKeySecret: sts.access_key_secret,
    stsToken: sts.security_token,
    bucket: sts.bucket,
    secure: true,
  });

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "png";
  const safeExt = ext && ext.length <= 8 ? ext : "png";
  const prefix = sts.prefix?.replace(/\/?$/, "") ?? "uploads";
  const key = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${safeExt}`;

  const result = await client.put(key, file);
  if (result.url) return result.url;
  return `https://${sts.bucket}.${sts.region}.aliyuncs.com/${key}`;
}
