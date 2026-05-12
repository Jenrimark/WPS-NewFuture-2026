import { Image as ImageIcon, Shapes, Type } from "lucide-react";
import { useState } from "react";
import { useEditorStore, PRESET_IMAGES } from "../../stores/editorStore";
import type { ShapeCategory, ShapeKind } from "../../types/editor";
import { generateAIImage } from "../../api/ossAi";
import { isDashscopeTemporaryImageUrl, uploadAIResultViaProxy, uploadLocalImage } from "../../lib/ossUpload";

const TAB =
  "flex cursor-pointer flex-1 items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-medium transition-colors duration-200";

const SHAPE_ITEMS: {
  kind: ShapeKind;
  category: ShapeCategory;
  label: string;
}[] = [
  { kind: "rect", category: "basic", label: "矩形" },
  { kind: "circle", category: "basic", label: "圆形" },
  { kind: "triangle", category: "basic", label: "三角" },
  { kind: "star", category: "festival", label: "星星" },
  { kind: "heart", category: "festival", label: "心形" },
  { kind: "hexagon", category: "festival", label: "六边形" },
  { kind: "diamond", category: "other", label: "菱形" },
  { kind: "pentagon", category: "other", label: "五边形" },
];

export function MaterialPanel() {
  const [mainTab, setMainTab] = useState<"text" | "shape" | "image">("text");
  const [shapeCat, setShapeCat] = useState<ShapeCategory>("basic");
  const setPlacement = useEditorStore((s) => s.setPlacement);
  const setPendingAiImageSrc = useEditorStore((s) => s.setPendingAiImageSrc);
  const pendingAiImageSrc = useEditorStore((s) => s.pendingAiImageSrc);
  const replaceImageSrcAll = useEditorStore((s) => s.replaceImageSrcAll);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiSaveBusy, setAiSaveBusy] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");

  const shapesFiltered = SHAPE_ITEMS.filter((s) => s.category === shapeCat);

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="flex border-b border-slate-200 p-2">
        <button
          type="button"
          className={`${TAB} ${mainTab === "text" ? "bg-brand-blue-soft text-brand-blue-deep" : "text-slate-600 hover:bg-slate-50"}`}
          onClick={() => setMainTab("text")}
        >
          <Type className="h-4 w-4" aria-hidden />
          文本
        </button>
        <button
          type="button"
          className={`${TAB} ${mainTab === "shape" ? "bg-brand-blue-soft text-brand-blue-deep" : "text-slate-600 hover:bg-slate-50"}`}
          onClick={() => setMainTab("shape")}
        >
          <Shapes className="h-4 w-4" aria-hidden />
          形状
        </button>
        <button
          type="button"
          className={`${TAB} ${mainTab === "image" ? "bg-brand-blue-soft text-brand-blue-deep" : "text-slate-600 hover:bg-slate-50"}`}
          onClick={() => setMainTab("image")}
        >
          <ImageIcon className="h-4 w-4" aria-hidden />
          图片
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {mainTab === "text" ? (
          <div className="space-y-3">
            <p className="text-sm text-ink-muted">点击按钮后在画布上单击放置文本框。</p>
            <button
              type="button"
              className="w-full cursor-pointer rounded-xl bg-brand-orange px-4 py-3 text-sm font-medium text-white shadow transition-colors hover:bg-brand-orange-deep"
              onClick={() => setPlacement({ kind: "text" })}
            >
              添加文本
            </button>
          </div>
        ) : null}

        {mainTab === "shape" ? (
          <div className="space-y-4">
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
              {(
                [
                  ["basic", "基础"],
                  ["festival", "节日"],
                  ["other", "其它"],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  className={`flex-1 cursor-pointer rounded-lg px-2 py-2 text-xs font-medium transition-colors ${
                    shapeCat === k ? "bg-white text-brand-blue shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                  onClick={() => setShapeCat(k)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {shapesFiltered.map((s) => (
                <button
                  key={`${s.kind}-${s.category}`}
                  type="button"
                  className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-sm transition-colors hover:border-brand-orange hover:bg-brand-orange-soft"
                  onClick={() =>
                    setPlacement({ kind: "shape", shapeKind: s.kind, category: s.category })
                  }
                >
                  <ShapeThumb kind={s.kind} />
                  {s.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-ink-muted">选中后在画布点击放置；再次点击空白可取消。</p>
          </div>
        ) : null}

        {mainTab === "image" ? (
          <div className="space-y-4">
            <p className="text-sm text-ink-muted">点击预设图后在画布上单击插入。</p>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_IMAGES.map((src) => (
                <button
                  key={src}
                  type="button"
                  className="cursor-pointer overflow-hidden rounded-xl border border-slate-200 shadow-sm transition-transform hover:scale-[1.02]"
                  onClick={() => setPlacement({ kind: "image", src })}
                >
                  <img src={src} alt="" className="aspect-square w-full object-cover" />
                </button>
              ))}
            </div>

            <label className="flex cursor-pointer flex-col gap-2 rounded-xl border border-dashed border-brand-blue bg-brand-blue-soft/40 px-3 py-4 text-center text-sm text-brand-blue-deep transition-colors hover:bg-brand-blue-soft">
              <span>上传本地图片（OSS 直传）</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  try {
                    const url = await uploadLocalImage(f);
                    setPlacement({ kind: "image", src: url });
                  } catch (err) {
                    const blob = URL.createObjectURL(f);
                    setPlacement({ kind: "image", src: blob });
                    alert(err instanceof Error ? err.message : "已使用本地预览（OSS 不可用）");
                  }
                }}
              />
            </label>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-xs font-medium text-slate-700">AI 生成图片</p>
              <textarea
                className="mb-2 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
                rows={2}
                placeholder="输入图片描述…"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
              />
              <button
                type="button"
                disabled={aiBusy}
                className="w-full cursor-pointer rounded-lg bg-brand-blue py-2 text-sm font-medium text-white disabled:opacity-50"
                onClick={async () => {
                  if (!aiPrompt.trim()) return;
                  setAiBusy(true);
                  try {
                    const { url } = await generateAIImage(aiPrompt.trim());
                    setPlacement({ kind: "image", src: url });
                    setPendingAiImageSrc(isDashscopeTemporaryImageUrl(url) ? url : null);
                  } catch (err) {
                    alert(err instanceof Error ? err.message : "生成失败");
                  } finally {
                    setAiBusy(false);
                  }
                }}
              >
                {aiBusy ? "生成中…" : "生成并用于画布"}
              </button>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                默认仅加载百炼临时预览；改提示词后再次点击可重新生成。需要长期保存到您的 OSS 时再点下方按钮。
              </p>
              <p className="text-[11px] leading-relaxed text-slate-500">
                保存成功后，对象在 Bucket 的「前缀目录」下（默认多为{" "}
                <span className="font-mono text-slate-700">poster-uploads/</span>
                ，与 <span className="font-mono">OSS_UPLOAD_PREFIX</span> 一致）。OSS
                控制台根目录若显示为空，请点进该前缀文件夹或刷新列表。
              </p>
              {pendingAiImageSrc ? (
                <button
                  type="button"
                  disabled={aiSaveBusy}
                  className="mt-2 w-full cursor-pointer rounded-lg border border-brand-blue bg-white py-2 text-sm font-medium text-brand-blue-deep disabled:opacity-50"
                  onClick={async () => {
                    if (!pendingAiImageSrc) return;
                    setAiSaveBusy(true);
                    try {
                      const ossUrl = await uploadAIResultViaProxy(pendingAiImageSrc);
                      replaceImageSrcAll(pendingAiImageSrc, ossUrl);
                    } catch (e) {
                      alert(e instanceof Error ? e.message : "保存失败");
                    } finally {
                      setAiSaveBusy(false);
                    }
                  }}
                >
                  {aiSaveBusy ? "正在保存到 OSS…" : "保存到我的 OSS"}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function ShapeThumb({ kind }: { kind: ShapeKind }) {
  const cls = "h-10 w-10 text-brand-blue";
  switch (kind) {
    case "rect":
      return (
        <svg className={cls} viewBox="0 0 40 40" aria-hidden>
          <rect x="6" y="8" width="28" height="24" rx="3" fill="currentColor" />
        </svg>
      );
    case "circle":
      return (
        <svg className={cls} viewBox="0 0 40 40" aria-hidden>
          <circle cx="20" cy="20" r="14" fill="currentColor" />
        </svg>
      );
    case "triangle":
      return (
        <svg className={cls} viewBox="0 0 40 40" aria-hidden>
          <polygon points="20,6 36,34 4,34" fill="currentColor" />
        </svg>
      );
    case "star":
      return (
        <svg className={cls} viewBox="0 0 40 40" aria-hidden>
          <path
            d="M20 4l4.5 9.2 10.1 1.5-7.3 7.1 1.7 10-9-4.7-9 4.7 1.7-10-7.3-7.1 10.1-1.5z"
            fill="currentColor"
          />
        </svg>
      );
    case "heart":
      return (
        <svg className={cls} viewBox="0 0 40 40" aria-hidden>
          <path
            d="M20 34S6 24 6 16a7 7 0 0114-2 7 7 0 0114 2c0 8-14 18-14 18z"
            fill="currentColor"
          />
        </svg>
      );
    case "hexagon":
      return (
        <svg className={cls} viewBox="0 0 40 40" aria-hidden>
          <polygon points="20,4 34,12 34,28 20,36 6,28 6,12" fill="currentColor" />
        </svg>
      );
    case "diamond":
      return (
        <svg className={cls} viewBox="0 0 40 40" aria-hidden>
          <polygon points="20,4 36,20 20,36 4,20" fill="currentColor" />
        </svg>
      );
    case "pentagon":
      return (
        <svg className={cls} viewBox="0 0 40 40" aria-hidden>
          <polygon points="20,4 36,14 30,34 10,34 4,14" fill="currentColor" />
        </svg>
      );
    default:
      return null;
  }
}
