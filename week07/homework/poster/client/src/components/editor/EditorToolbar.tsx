import { Download, LogOut, Redo2, Save, Undo2, PenTool } from "lucide-react";
import { Link } from "react-router-dom";
import { logout } from "../../api/auth";
import { useEditorStore } from "../../stores/editorStore";
import { serializePosterData } from "../../lib/posterData";
import { createPoster, updatePoster } from "../../api/posters";

type Props = {
  getExportDataUrl: () => string | undefined;
};

export function EditorToolbar({ getExportDataUrl }: Props) {
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const canUndo = useEditorStore((s) => s.past.length > 0);
  const canRedo = useEditorStore((s) => s.future.length > 0);
  const posterTitle = useEditorStore((s) => s.posterTitle);

  const handleDownload = () => {
    const uri = getExportDataUrl();
    if (!uri) return;
    const a = document.createElement("a");
    a.href = uri;
    a.download = `${posterTitle || "poster"}.png`;
    a.click();
  };

  const handleSave = async () => {
    const s = useEditorStore.getState();
    const snap = {
      elements: s.elements,
      canvasWidth: s.canvasWidth,
      canvasHeight: s.canvasHeight,
      lockAspect: s.lockAspect,
      aspectRatio: s.aspectRatio,
      bgMode: s.bgMode,
      bgColor: s.bgColor,
      bgImageSrc: s.bgImageSrc,
    };
    const data = serializePosterData(snap);
    try {
      if (s.posterId) {
        await updatePoster(s.posterId, {
          title: s.posterTitle,
          width: snap.canvasWidth,
          height: snap.canvasHeight,
          data,
        });
      } else {
        const p = await createPoster({
          title: s.posterTitle,
          width: snap.canvasWidth,
          height: snap.canvasHeight,
          data,
        });
        s.setPosterMeta(p.id, p.title);
      }
      alert("已保存到云端");
    } catch (e) {
      alert(e instanceof Error ? e.message : "保存失败");
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  return (
    <header className="mx-4 mt-4 mb-2 flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/60 bg-white/90 px-4 py-3 shadow-lg backdrop-blur-md transition-shadow duration-200">
      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="flex cursor-pointer items-center gap-2 font-semibold text-ink transition-colors hover:text-brand-blue"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient-strong shadow-inner">
            <PenTool className="h-5 w-5 text-brand-blue-deep" aria-hidden />
          </span>
          <span>灵犀工坊</span>
        </Link>
        <span className="hidden text-sm text-ink-muted sm:inline">在线海报设计</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!canUndo}
          onClick={() => undo()}
          className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 transition-colors hover:border-brand-blue hover:bg-brand-blue-soft disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Undo2 className="h-4 w-4" aria-hidden />
          撤销
        </button>
        <button
          type="button"
          disabled={!canRedo}
          onClick={() => redo()}
          className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 transition-colors hover:border-brand-blue hover:bg-brand-blue-soft disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Redo2 className="h-4 w-4" aria-hidden />
          重做
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 transition-colors hover:border-brand-orange hover:bg-brand-orange-soft"
        >
          <Save className="h-4 w-4" aria-hidden />
          保存
        </button>
        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex cursor-pointer items-center gap-1 rounded-xl bg-brand-blue px-3 py-2 text-sm font-medium text-white shadow-md transition-colors duration-200 hover:bg-brand-blue-deep"
        >
          <Download className="h-4 w-4" aria-hidden />
          下载 PNG
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          退出
        </button>
      </div>
    </header>
  );
}
