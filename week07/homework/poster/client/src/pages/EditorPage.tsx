import { useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { CanvasBoard } from "../components/editor/CanvasBoard";
import { EditorToolbar } from "../components/editor/EditorToolbar";
import { MaterialPanel } from "../components/editor/MaterialPanel";
import { PropertyPanel } from "../components/editor/PropertyPanel";
import { ZoomControls } from "../components/editor/ZoomControls";
import { getPoster } from "../api/posters";
import { parsePosterData } from "../lib/posterData";
import { useEditorStore } from "../stores/editorStore";

export function EditorPage() {
  const exportFn = useRef<() => string | undefined>(() => undefined);
  const [params] = useSearchParams();
  const posterParam = params.get("poster");
  const hydrateFromSnapshot = useEditorStore((s) => s.hydrateFromSnapshot);
  const setPosterMeta = useEditorStore((s) => s.setPosterMeta);

  useEffect(() => {
    if (!posterParam) return;
    const id = Number(posterParam);
    if (!Number.isFinite(id)) return;

    let cancelled = false;
    void (async () => {
      try {
        const p = await getPoster(id);
        if (cancelled) return;
        const parsed = parsePosterData(p.data || "{}");
        hydrateFromSnapshot(parsed);
        setPosterMeta(p.id, p.title);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [posterParam, hydrateFromSnapshot, setPosterMeta]);

  const onExportReady = useCallback((fn: () => string | undefined) => {
    exportFn.current = fn;
  }, []);

  const getExportDataUrl = useCallback(() => exportFn.current(), []);

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-surface">
      <EditorToolbar getExportDataUrl={getExportDataUrl} />
      <div className="flex min-h-0 flex-1">
        <MaterialPanel />
        <div className="flex min-w-0 flex-1 flex-col">
          <CanvasBoard onExportReady={onExportReady} />
          <ZoomControls />
        </div>
        <PropertyPanel />
      </div>
    </div>
  );
}
