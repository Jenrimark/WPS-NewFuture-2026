import { useEffect, useRef, useState } from "react";
import { getToken } from "../api/client";

function needsOssProxy(src: string): boolean {
  if (!src.startsWith("http")) return false;
  try {
    const u = new URL(src);
    return u.protocol === "https:" && u.hostname.toLowerCase().endsWith(".aliyuncs.com");
  } catch {
    return false;
  }
}

/**
 * 画布用图片：阿里云 OSS 等无 CORS 时走 /api/ai/proxy-image（需登录），否则与原先一致对 http(s) 使用 anonymous 以便导出。
 */
export function useCanvasImage(src: string): [
  HTMLImageElement | undefined,
  "loading" | "loaded" | "failed",
] {
  const [img, setImg] = useState<HTMLImageElement | undefined>();
  const [st, setSt] = useState<"loading" | "loaded" | "failed">("loading");
  const revokeRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const cleanupBlob = () => {
      if (revokeRef.current) {
        URL.revokeObjectURL(revokeRef.current);
        revokeRef.current = null;
      }
    };

    if (!src) {
      cleanupBlob();
      setImg(undefined);
      setSt("loading");
      return cleanupBlob;
    }

    setSt("loading");
    setImg(undefined);

    void (async () => {
      let loadUrl = src;
      let useCors = false;
      if (needsOssProxy(src)) {
        try {
          const token = getToken();
          const res = await fetch(
            `/api/ai/proxy-image?url=${encodeURIComponent(src)}`,
            {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            },
          );
          if (!res.ok) {
            if (!cancelled) setSt("failed");
            return;
          }
          const blob = await res.blob();
          if (cancelled) return;
          cleanupBlob();
          revokeRef.current = URL.createObjectURL(blob);
          loadUrl = revokeRef.current;
        } catch {
          if (!cancelled) setSt("failed");
          return;
        }
      } else if (src.startsWith("http")) {
        useCors = true;
      }

      const image = new Image();
      if (useCors) image.crossOrigin = "anonymous";

      image.onload = () => {
        if (cancelled) return;
        setImg(image);
        setSt("loaded");
      };
      image.onerror = () => {
        if (cancelled) return;
        setSt("failed");
      };
      image.src = loadUrl;
    })();

    return () => {
      cancelled = true;
      cleanupBlob();
    };
  }, [src]);

  return [img, st];
}
