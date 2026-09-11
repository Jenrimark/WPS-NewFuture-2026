import type { CanvasElement } from "../types/editor";

/** 与 OSS 上 font-library/manifest.json 对齐 */
export type FontLibraryEntry = {
  /** 稳定键，用于生成默认 cssFamily */
  id: string;
  /** 界面展示名 */
  label: string;
  /** 分类：黑体 / 宋体 / 英文 … 任意字符串，用于筛选 */
  category: string;
  /** 相对 font-library 根的文件路径，如 "hei/SourceHanSansSC.ttf" */
  file: string;
  /**
   * 写入画布与 poster JSON 的 font-family，须全局唯一。
   * 省略时自动生成 `__PF_<id>__`（仅字母数字下划线连字符）
   */
  cssFamily?: string;
  fontWeight?: string;
  fontStyle?: "normal" | "italic";
};

export type FontLibraryManifest = {
  version: number;
  fonts: FontLibraryEntry[];
};

const INJECTED = new Set<string>();

let manifestPromise: Promise<FontLibraryManifest | null> | null = null;

function normalizeBase(u: string): string {
  const t = u.trim();
  return t.endsWith("/") ? t : `${t}/`;
}

/**
 * OSS 公网访问基址，须以 / 结尾的「目录」。
 * 例：https://jenrimark-oss.oss-cn-hangzhou.aliyuncs.com/font-library/
 *
 * 未配置时：开发环境下回退到同源 /font-library/（便于 public 下自测）
 */
export function getFontLibraryBaseUrl(): string {
  const env = import.meta.env.VITE_FONT_LIBRARY_BASE_URL as string | undefined;
  if (env && env.trim()) return normalizeBase(env);
  if (import.meta.env.DEV && typeof window !== "undefined") {
    return `${window.location.origin}/font-library/`;
  }
  return "";
}

function formatFromFilename(file: string): string {
  const lower = file.toLowerCase();
  if (lower.endsWith(".woff2")) return "woff2";
  if (lower.endsWith(".woff")) return "woff";
  if (lower.endsWith(".otf")) return "opentype";
  return "truetype";
}

function fileUrl(base: string, file: string): string {
  const rel = file.replace(/^\//, "");
  return new URL(rel, base).href;
}

export function resolveCssFamily(entry: FontLibraryEntry): string {
  if (entry.cssFamily?.trim()) {
    return entry.cssFamily.trim().replace(/['"<>]/g, "");
  }
  const slug = entry.id.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
  return `__PF_${slug || "font"}__`;
}

export function invalidateFontLibraryManifestCache(): void {
  manifestPromise = null;
}

export async function loadFontLibraryManifest(): Promise<FontLibraryManifest | null> {
  const base = getFontLibraryBaseUrl();
  if (!base) return null;

  if (!manifestPromise) {
    manifestPromise = (async () => {
      const res = await fetch(`${base}manifest.json`, { cache: "no-store" });
      if (!res.ok) return null;
      const data = (await res.json()) as FontLibraryManifest;
      if (!data || !Array.isArray(data.fonts)) return null;
      return data;
    })().catch(() => null);
  }
  return manifestPromise;
}

export function collectFontCategories(fonts: FontLibraryEntry[]): string[] {
  const set = new Set<string>();
  for (const f of fonts) {
    const c = f.category?.trim() || "未分类";
    set.add(c);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "zh-CN"));
}

export async function ensureFontFaceLoaded(entry: FontLibraryEntry): Promise<string> {
  const base = getFontLibraryBaseUrl();
  if (!base) throw new Error("未配置字体库基址");

  const family = resolveCssFamily(entry);
  const url = fileUrl(base, entry.file);
  const injKey = `${family}\0${url}`;
  const weight = entry.fontWeight ?? "400";
  const fontStyle = entry.fontStyle ?? "normal";
  const fmt = formatFromFilename(entry.file);

  if (!INJECTED.has(injKey)) {
    const escFamily = family.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    const escUrl = url.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    const style = document.createElement("style");
    style.setAttribute("data-poster-font-inject", family);
    style.textContent = `@font-face{font-family:'${escFamily}';src:url('${escUrl}') format('${fmt}');font-weight:${weight};font-style:${fontStyle};font-display:swap;}`;
    document.head.appendChild(style);
    INJECTED.add(injKey);
  }

  await document.fonts.load(`${weight} 16px ${JSON.stringify(family)}`);
  return family;
}

export async function ensureFontFaceForCanvasFamily(family: string): Promise<void> {
  const m = await loadFontLibraryManifest();
  if (!m?.fonts.length) return;
  const entry = m.fonts.find((f) => resolveCssFamily(f) === family);
  if (entry) await ensureFontFaceLoaded(entry).catch(() => undefined);
}

export async function ensureFontsForElements(elements: CanvasElement[]): Promise<void> {
  const families = new Set<string>();
  for (const el of elements) {
    if (el.type === "text") families.add(el.fontFamily);
  }
  await Promise.all([...families].map((f) => ensureFontFaceForCanvasFamily(f)));
}

export function findEntryByCssFamily(
  manifest: FontLibraryManifest,
  cssFamily: string,
): FontLibraryEntry | undefined {
  return manifest.fonts.find((f) => resolveCssFamily(f) === cssFamily);
}
