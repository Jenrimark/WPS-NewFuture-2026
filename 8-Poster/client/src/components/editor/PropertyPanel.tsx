import {
  AlignCenter,
  AlignHorizontalJustifyCenter,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyCenter,
  ArrowDown,
  ArrowUp,
  ChevronsDown,
  ChevronsUp,
  SunMedium,
} from "lucide-react";
import { useState } from "react";
import { useEditorStore } from "../../stores/editorStore";
import type { ImageElement, ShapeElement, TextElement } from "../../types/editor";
import { isDashscopeTemporaryImageUrl, uploadAIResultViaProxy } from "../../lib/ossUpload";
import { FontLibraryPicker } from "./FontLibraryPicker";

const RECOMMENDED = [
  "#ffffff",
  "#f97316",
  "#2563eb",
  "#0f172a",
  "#22c55e",
  "#eab308",
  "#e11d48",
  "#64748b",
];

const FONTS = [
  "Plus Jakarta Sans",
  "Inter",
  "system-ui",
  "Georgia",
  "PingFang SC",
  "Microsoft YaHei",
];

export function PropertyPanel() {
  const pushHistory = useEditorStore((s) => s.pushHistory);

  const selectedIds = useEditorStore((s) => s.selectedIds);
  const elements = useEditorStore((s) => s.elements);
  const selected = selectedIds[0] ? elements.find((e) => e.id === selectedIds[0]) : undefined;

  const canvasWidth = useEditorStore((s) => s.canvasWidth);
  const canvasHeight = useEditorStore((s) => s.canvasHeight);
  const lockAspect = useEditorStore((s) => s.lockAspect);
  const bgMode = useEditorStore((s) => s.bgMode);
  const bgColor = useEditorStore((s) => s.bgColor);
  const bgImageSrc = useEditorStore((s) => s.bgImageSrc);

  const setCanvasSize = useEditorStore((s) => s.setCanvasSize);
  const setLockAspect = useEditorStore((s) => s.setLockAspect);
  const setBgMode = useEditorStore((s) => s.setBgMode);
  const setBgColor = useEditorStore((s) => s.setBgColor);
  const setBgImageSrc = useEditorStore((s) => s.setBgImageSrc);
  const resetBackground = useEditorStore((s) => s.resetBackground);
  const updateElement = useEditorStore((s) => s.updateElement);

  const bringForward = useEditorStore((s) => s.bringForward);
  const sendBackward = useEditorStore((s) => s.sendBackward);
  const bringToFront = useEditorStore((s) => s.bringToFront);
  const sendToBack = useEditorStore((s) => s.sendToBack);
  const alignSelectedX = useEditorStore((s) => s.alignSelectedX);
  const alignSelectedY = useEditorStore((s) => s.alignSelectedY);

  return (
    <aside className="flex w-80 shrink-0 flex-col overflow-y-auto border-l border-slate-200/80 bg-white/95 p-4 backdrop-blur">
      <h2 className="mb-3 text-sm font-semibold text-slate-800">属性</h2>

      {!selected ? (
        <div className="space-y-5">
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              <SunMedium className="h-4 w-4" aria-hidden />
              画布
            </h3>
            <div className="space-y-3 rounded-xl border border-slate-200 p-3">
              <label className="block text-xs text-slate-600">
                宽度 (px)
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  value={canvasWidth}
                  onChange={(e) => {
                    pushHistory();
                    setCanvasSize(Number(e.target.value), canvasHeight);
                  }}
                />
              </label>
              <label className="block text-xs text-slate-600">
                高度 (px)
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  value={canvasHeight}
                  onChange={(e) => {
                    pushHistory();
                    setCanvasSize(canvasWidth, Number(e.target.value));
                  }}
                />
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={lockAspect}
                  onChange={(e) => setLockAspect(e.target.checked)}
                  className="cursor-pointer rounded border-slate-300"
                />
                锁定宽高比
              </label>
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">背景</h3>
            <div className="space-y-3 rounded-xl border border-slate-200 p-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`flex-1 cursor-pointer rounded-lg px-3 py-2 text-sm ${
                    bgMode === "solid" ? "bg-brand-blue text-white" : "bg-slate-100 text-slate-700"
                  }`}
                  onClick={() => {
                    pushHistory();
                    setBgMode("solid");
                  }}
                >
                  纯色
                </button>
                <button
                  type="button"
                  className={`flex-1 cursor-pointer rounded-lg px-3 py-2 text-sm ${
                    bgMode === "image" ? "bg-brand-blue text-white" : "bg-slate-100 text-slate-700"
                  }`}
                  onClick={() => setBgMode("image")}
                >
                  贴图
                </button>
              </div>

              {bgMode === "solid" ? (
                <>
                  <label className="block text-xs text-slate-600">
                    颜色
                    <input
                      type="color"
                      className="mt-1 h-10 w-full cursor-pointer rounded-lg border border-slate-200"
                      value={bgColor}
                      onChange={(e) => {
                        pushHistory();
                        setBgColor(e.target.value);
                      }}
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {RECOMMENDED.map((c) => (
                      <button
                        key={c}
                        type="button"
                        title={c}
                        className="h-8 w-8 cursor-pointer rounded-full border border-slate-200 shadow-inner transition-transform hover:scale-110"
                        style={{ backgroundColor: c }}
                        onClick={() => {
                          pushHistory();
                          setBgColor(c);
                        }}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <label className="block text-xs text-slate-600">
                    上传背景图
                    <input
                      type="file"
                      accept="image/*"
                      className="mt-1 w-full cursor-pointer text-sm"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        pushHistory();
                        setBgImageSrc(URL.createObjectURL(f));
                      }}
                    />
                  </label>
                  {bgImageSrc ? (
                    <p className="truncate text-xs text-slate-500">已设置贴图</p>
                  ) : null}
                </>
              )}

              <button
                type="button"
                className="w-full cursor-pointer rounded-lg border border-slate-200 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  pushHistory();
                  resetBackground();
                }}
              >
                重置背景
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {selected?.type === "text" ? (
        <TextProps el={selected} pushHistory={pushHistory} updateElement={updateElement} />
      ) : null}
      {selected?.type === "shape" ? (
        <ShapeProps el={selected} pushHistory={pushHistory} updateElement={updateElement} />
      ) : null}
      {selected?.type === "image" ? (
        <ImageProps el={selected} pushHistory={pushHistory} updateElement={updateElement} />
      ) : null}

      {selected ? (
        <section className="mt-6 space-y-3 border-t border-slate-200 pt-4">
          <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">图层 / 排版</h3>
          <div className="grid grid-cols-2 gap-2">
            <IconBtn label="置顶" onClick={() => bringToFront()}>
              <ChevronsUp className="h-4 w-4" />
            </IconBtn>
            <IconBtn label="置底" onClick={() => sendToBack()}>
              <ChevronsDown className="h-4 w-4" />
            </IconBtn>
            <IconBtn label="上移" onClick={() => bringForward()}>
              <ArrowUp className="h-4 w-4" />
            </IconBtn>
            <IconBtn label="下移" onClick={() => sendBackward()}>
              <ArrowDown className="h-4 w-4" />
            </IconBtn>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <IconBtn label="左对齐" onClick={() => alignSelectedX("left")}>
              <AlignLeft className="h-4 w-4" />
            </IconBtn>
            <IconBtn label="水平居中" onClick={() => alignSelectedX("center")}>
              <AlignHorizontalJustifyCenter className="h-4 w-4" />
            </IconBtn>
            <IconBtn label="右对齐" onClick={() => alignSelectedX("right")}>
              <AlignRight className="h-4 w-4" />
            </IconBtn>
            <IconBtn label="垂直居中" onClick={() => alignSelectedY("middle")}>
              <AlignVerticalJustifyCenter className="h-4 w-4" />
            </IconBtn>
            <IconBtn label="顶部" onClick={() => alignSelectedY("top")}>
              <AlignCenter className="h-4 w-4 -rotate-90" />
            </IconBtn>
            <IconBtn label="底部" onClick={() => alignSelectedY("bottom")}>
              <AlignCenter className="h-4 w-4 rotate-90" />
            </IconBtn>
          </div>
        </section>
      ) : null}
    </aside>
  );
}

function IconBtn({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="flex cursor-pointer items-center justify-center gap-1 rounded-lg border border-slate-200 py-2 text-slate-700 transition-colors hover:border-brand-blue hover:bg-brand-blue-soft"
    >
      {children}
    </button>
  );
}

function TextProps({
  el,
  pushHistory,
  updateElement,
}: {
  el: TextElement;
  pushHistory: () => void;
  updateElement: (id: string, patch: Partial<TextElement>) => void;
}) {
  const isSystemFont = FONTS.includes(el.fontFamily);
  const selectValue = isSystemFont ? el.fontFamily : "__poster_oss_font__";

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 p-3">
        <h3 className="mb-2 text-xs font-medium text-slate-500">文本</h3>
        <label className="block text-xs text-slate-600">
          系统字体
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            value={selectValue}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "__poster_oss_font__") return;
              pushHistory();
              updateElement(el.id, { fontFamily: v });
            }}
          >
            {!isSystemFont ? (
              <option value="__poster_oss_font__" disabled>
                当前为字体库字体（下方可切换）
              </option>
            ) : null}
            {FONTS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <div className="mt-3">
          <FontLibraryPicker
            currentFamily={el.fontFamily}
            pushHistory={pushHistory}
            onPick={(cssFamily) => updateElement(el.id, { fontFamily: cssFamily })}
          />
        </div>
        <label className="mt-2 block text-xs text-slate-600">
          字号
          <input
            type="number"
            min={8}
            max={200}
            className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            value={Math.round(el.fontSize)}
            onChange={(e) =>
              updateElement(el.id, { fontSize: Number(e.target.value) || 12 })
            }
          />
        </label>
        <label className="mt-2 block text-xs text-slate-600">
          颜色
          <input
            type="color"
            className="mt-1 h-10 w-full cursor-pointer rounded-lg border border-slate-200"
            value={el.fill.startsWith("#") ? el.fill : "#0f172a"}
            onChange={(e) => {
              pushHistory();
              updateElement(el.id, { fill: e.target.value });
            }}
          />
        </label>

        <div className="mt-3 flex flex-wrap gap-2">
          <Toggle
            active={el.fontWeight === "bold"}
            onClick={() => {
              pushHistory();
              updateElement(el.id, {
                fontWeight: el.fontWeight === "bold" ? "normal" : "bold",
              });
            }}
          >
            加粗
          </Toggle>
          <Toggle
            active={el.fontStyle === "italic"}
            onClick={() => {
              pushHistory();
              updateElement(el.id, {
                fontStyle: el.fontStyle === "italic" ? "normal" : "italic",
              });
            }}
          >
            斜体
          </Toggle>
          <Toggle
            active={el.underline}
            onClick={() => {
              pushHistory();
              updateElement(el.id, { underline: !el.underline });
            }}
          >
            下划线
          </Toggle>
          <Toggle
            active={el.strikethrough}
            onClick={() => {
              pushHistory();
              updateElement(el.id, { strikethrough: !el.strikethrough });
            }}
          >
            删除线
          </Toggle>
        </div>

        <div className="mt-3 flex gap-2">
          {(
            [
              ["left", "左"],
              ["center", "中"],
              ["right", "右"],
            ] as const
          ).map(([v, lab]) => (
            <button
              key={v}
              type="button"
              className={`flex-1 cursor-pointer rounded-lg py-2 text-sm ${
                el.align === v ? "bg-brand-blue text-white" : "bg-slate-100 text-slate-700"
              }`}
              onClick={() => {
                pushHistory();
                updateElement(el.id, { align: v });
              }}
            >
              {lab}
            </button>
          ))}
        </div>

        <label className="mt-3 block text-xs text-slate-600">
          字间距 {el.letterSpacing}px
          <div className="mt-1 flex items-center gap-2">
            <input
              type="range"
              min={-5}
              max={40}
              step={0.5}
              value={el.letterSpacing}
              onPointerDown={() => pushHistory()}
              onChange={(e) => updateElement(el.id, { letterSpacing: Number(e.target.value) })}
              className="min-w-0 flex-1 cursor-pointer"
            />
            <input
              type="number"
              step={0.5}
              className="w-20 shrink-0 rounded-lg border border-slate-200 px-2 py-1 text-sm tabular-nums"
              value={el.letterSpacing}
              onPointerDown={() => pushHistory()}
              onChange={(e) =>
                updateElement(el.id, {
                  letterSpacing: Math.min(40, Math.max(-5, Number(e.target.value) || 0)),
                })
              }
            />
          </div>
        </label>
        <label className="mt-2 block text-xs text-slate-600">
          行高 {el.lineHeight.toFixed(2)}
          <div className="mt-1 flex items-center gap-2">
            <input
              type="range"
              min={0.8}
              max={3}
              step={0.05}
              value={el.lineHeight}
              onPointerDown={() => pushHistory()}
              onChange={(e) => updateElement(el.id, { lineHeight: Number(e.target.value) })}
              className="min-w-0 flex-1 cursor-pointer"
            />
            <input
              type="number"
              min={0.8}
              max={3}
              step={0.05}
              className="w-20 shrink-0 rounded-lg border border-slate-200 px-2 py-1 text-sm tabular-nums"
              value={el.lineHeight}
              onPointerDown={() => pushHistory()}
              onChange={(e) =>
                updateElement(el.id, {
                  lineHeight: Math.min(3, Math.max(0.8, Number(e.target.value) || 1.2)),
                })
              }
            />
          </div>
        </label>
        <label className="mt-2 block text-xs text-slate-600">
          透明度 {Math.round(el.opacity * 100)}%
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={el.opacity}
            onPointerDown={() => pushHistory()}
            onChange={(e) => updateElement(el.id, { opacity: Number(e.target.value) })}
            className="mt-1 w-full cursor-pointer"
          />
        </label>

        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={el.shadowEnabled}
            onChange={(e) => {
              pushHistory();
              updateElement(el.id, { shadowEnabled: e.target.checked });
            }}
            className="cursor-pointer"
          />
          阴影
        </label>
        {el.shadowEnabled ? (
          <>
            <label className="mt-2 block text-xs text-slate-600">
              模糊 {el.shadowBlur}px
              <input
                type="range"
                min={0}
                max={40}
                value={el.shadowBlur}
                onPointerDown={() => pushHistory()}
                onChange={(e) => updateElement(el.id, { shadowBlur: Number(e.target.value) })}
                className="mt-1 w-full cursor-pointer"
              />
            </label>
            <label className="mt-2 block text-xs text-slate-600">
              阴影颜色
              <input
                type="color"
                className="mt-1 h-9 w-full cursor-pointer rounded-lg border border-slate-200"
                value={
                  el.shadowColor.startsWith("#")
                    ? el.shadowColor.slice(0, 7)
                    : "#000000"
                }
                onChange={(e) => {
                  pushHistory();
                  updateElement(el.id, { shadowColor: e.target.value });
                }}
              />
            </label>
          </>
        ) : null}
      </section>
    </div>
  );
}

function ShapeProps({
  el,
  pushHistory,
  updateElement,
}: {
  el: ShapeElement;
  pushHistory: () => void;
  updateElement: (id: string, patch: Partial<ShapeElement>) => void;
}) {
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 p-3">
        <h3 className="mb-2 text-xs font-medium text-slate-500">形状</h3>
        <label className="block text-xs text-slate-600">
          填充
          <input
            type="color"
            className="mt-1 h-10 w-full cursor-pointer rounded-lg border border-slate-200"
            value={el.fill.startsWith("#") ? el.fill : "#3b82f6"}
            onChange={(e) => {
              pushHistory();
              updateElement(el.id, { fill: e.target.value });
            }}
          />
        </label>
        <label className="mt-2 block text-xs text-slate-600">
          描边颜色
          <input
            type="color"
            className="mt-1 h-10 w-full cursor-pointer rounded-lg border border-slate-200"
            value={el.stroke.startsWith("#") ? el.stroke : "#1e40af"}
            onChange={(e) => {
              pushHistory();
              updateElement(el.id, { stroke: e.target.value });
            }}
          />
        </label>
        <label className="mt-2 block text-xs text-slate-600">
          描边宽度 {el.strokeWidth}px
          <input
            type="range"
            min={0}
            max={20}
            step={0.5}
            value={el.strokeWidth}
            onPointerDown={() => pushHistory()}
            onChange={(e) => updateElement(el.id, { strokeWidth: Number(e.target.value) })}
            className="mt-1 w-full cursor-pointer"
          />
        </label>
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={el.shadowEnabled}
            onChange={(e) => {
              pushHistory();
              updateElement(el.id, { shadowEnabled: e.target.checked });
            }}
            className="cursor-pointer"
          />
          阴影
        </label>
        {el.shadowEnabled ? (
          <>
            <label className="mt-2 block text-xs text-slate-600">
              模糊 {el.shadowBlur}px
              <input
                type="range"
                min={0}
                max={40}
                value={el.shadowBlur}
                onPointerDown={() => pushHistory()}
                onChange={(e) => updateElement(el.id, { shadowBlur: Number(e.target.value) })}
                className="mt-1 w-full cursor-pointer"
              />
            </label>
            <label className="mt-2 block text-xs text-slate-600">
              阴影颜色
              <input
                type="color"
                className="mt-1 h-9 w-full cursor-pointer rounded-lg border border-slate-200"
                value={
                  el.shadowColor.startsWith("#")
                    ? el.shadowColor.slice(0, 7)
                    : "#000000"
                }
                onChange={(e) => {
                  pushHistory();
                  updateElement(el.id, { shadowColor: e.target.value });
                }}
              />
            </label>
          </>
        ) : null}
        <label className="mt-3 block text-xs text-slate-600">
          透明度 {Math.round(el.opacity * 100)}%
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={el.opacity}
            onPointerDown={() => pushHistory()}
            onChange={(e) => updateElement(el.id, { opacity: Number(e.target.value) })}
            className="mt-1 w-full cursor-pointer"
          />
        </label>
      </section>
    </div>
  );
}

function ImageProps({
  el,
  pushHistory,
  updateElement,
}: {
  el: ImageElement;
  pushHistory: () => void;
  updateElement: (id: string, patch: Partial<ImageElement>) => void;
}) {
  const replaceImageSrcAll = useEditorStore((s) => s.replaceImageSrcAll);
  const [ossBusy, setOssBusy] = useState(false);
  const showSaveOss = isDashscopeTemporaryImageUrl(el.src);

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 p-3">
        <h3 className="mb-2 text-xs font-medium text-slate-500">图片</h3>
        <label className="block text-xs text-slate-600">
          透明度 {Math.round(el.opacity * 100)}%
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={el.opacity}
            onPointerDown={() => pushHistory()}
            onChange={(e) => updateElement(el.id, { opacity: Number(e.target.value) })}
            className="mt-1 w-full cursor-pointer"
          />
        </label>
        <p className="mt-2 truncate text-xs text-slate-500" title={el.src}>
          {el.src.slice(0, 48)}…
        </p>
        {showSaveOss ? (
          <button
            type="button"
            disabled={ossBusy}
            className="mt-3 w-full cursor-pointer rounded-lg border border-brand-blue bg-white py-2 text-xs font-medium text-brand-blue-deep disabled:opacity-50"
            onClick={async () => {
              setOssBusy(true);
              try {
                const ossUrl = await uploadAIResultViaProxy(el.src);
                replaceImageSrcAll(el.src, ossUrl);
              } catch (e) {
                alert(e instanceof Error ? e.message : "保存失败");
              } finally {
                setOssBusy(false);
              }
            }}
          >
            {ossBusy ? "正在保存到 OSS…" : "保存到我的 OSS"}
          </button>
        ) : null}
      </section>
    </div>
  );
}

function Toggle({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
        active ? "bg-brand-orange text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      }`}
    >
      {children}
    </button>
  );
}
