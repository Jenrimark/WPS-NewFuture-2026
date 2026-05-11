import { useEditorStore } from "../../stores/editorStore";
import { Minus, Plus } from "lucide-react";

export function ZoomControls() {
  const scale = useEditorStore((s) => s.scale);
  const setScale = useEditorStore((s) => s.setScale);
  const pct = Math.round(scale * 100);

  return (
    <div className="flex items-center justify-center gap-2 border-t border-slate-200/80 bg-white/90 py-2 backdrop-blur">
      <button
        type="button"
        className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition-colors hover:border-brand-blue hover:bg-brand-blue-soft"
        onClick={() => setScale(scale - 0.1)}
        aria-label="缩小"
      >
        <Minus className="h-4 w-4" />
      </button>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <span className="text-xs text-slate-500">缩放</span>
        <input
          type="number"
          min={25}
          max={300}
          value={pct}
          onChange={(e) => setScale(Number(e.target.value) / 100)}
          className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-center text-sm"
        />
        <span className="text-xs">%</span>
      </label>
      <button
        type="button"
        className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition-colors hover:border-brand-blue hover:bg-brand-blue-soft"
        onClick={() => setScale(scale + 0.1)}
        aria-label="放大"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
