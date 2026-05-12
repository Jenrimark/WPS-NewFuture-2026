/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** OSS 字体库目录 HTTPS 基址，须以 / 结尾，如 https://jenrimark-oss.oss-cn-hangzhou.aliyuncs.com/font-library/ */
  readonly VITE_FONT_LIBRARY_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
