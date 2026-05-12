import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, FabricObject, Group, Rect, Shadow, FabricImage } from "fabric";
import { useEditorStore } from "../../stores/editorStore";
import type { CanvasElement, ShapeCategory, ShapeKind } from "../../types/editor";
import { snapWithGuides } from "../../lib/snapGuides";
import { uploadLocalImage } from "../../lib/ossUpload";
import { ensureFontsForElements } from "../../lib/fontLibrary";
import {
  createFabricObjectFromElement,
  getPosterElementId,
  patchElementFromFabricObject,
} from "../../lib/fabricSync";

const PAD = 72;
const PLACE_CLICK_PX = 6;

type PlaceRubber =
  | { kind: "text"; sx: number; sy: number; cx: number; cy: number }
  | {
      kind: "shape";
      shapeKind: ShapeKind;
      category: ShapeCategory;
      sx: number;
      sy: number;
      cx: number;
      cy: number;
    }
  | { kind: "image"; src: string; sx: number; sy: number; cx: number; cy: number };

export function CanvasBoard({
  onExportReady,
}: {
  onExportReady?: (fn: () => string | undefined) => void;
}) {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const gestureHistoryPushedRef = useRef(false);

  const {
    elements,
    canvasWidth,
    canvasHeight,
    scale,
    bgMode,
    bgColor,
    bgImageSrc,
    selectedIds,
    guideLines,
  } = useEditorStore();

  const [menu, setMenu] = useState<{ x: number; y: number; targetId: string } | null>(null);
  const [placeRubber, setPlaceRubber] = useState<PlaceRubber | null>(null);
  const [bgImageEl, setBgImageEl] = useState<HTMLImageElement | null>(null);

  const placementListenersRef = useRef<{
    move: (ev: MouseEvent) => void;
    up: (ev: MouseEvent) => void;
  } | null>(null);

  const sorted = useMemo(
    () => [...elements].sort((a, b) => a.zIndex - b.zIndex),
    [elements],
  );

  useEffect(() => {
    void ensureFontsForElements(elements);
  }, [elements]);

  useEffect(() => {
    if (bgMode !== "image" || !bgImageSrc) {
      setBgImageEl(null);
      return;
    }
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => setBgImageEl(im);
    im.onerror = () => setBgImageEl(null);
    im.src = bgImageSrc;
  }, [bgMode, bgImageSrc]);

  const finalizePlacement = useCallback((r: PlaceRubber) => {
    const s = useEditorStore.getState();
    const { sx, sy, cx, cy } = r;
    const dist = Math.hypot(cx - sx, cy - sy);
    s.pushHistory();
    if (dist < PLACE_CLICK_PX) {
      if (r.kind === "text") s.addTextAt(sx, sy);
      else if (r.kind === "shape") s.addShapeAt(r.shapeKind, r.category, sx, sy);
      else s.addImageAt(r.src, sx, sy);
    } else {
      const left = Math.min(sx, cx);
      const top = Math.min(sy, cy);
      const rw = Math.abs(cx - sx);
      const rh = Math.abs(cy - sy);
      if (r.kind === "text") s.addTextAt(left, top, rw, rh);
      else if (r.kind === "shape") s.addShapeAt(r.shapeKind, r.category, left, top, rw, rh);
      else s.addImageAt(r.src, left, top, rw, rh);
    }
  }, []);

  const clearPlacementDragListeners = useCallback(() => {
    const cur = placementListenersRef.current;
    if (!cur) return;
    window.removeEventListener("mousemove", cur.move);
    window.removeEventListener("mouseup", cur.up, { capture: true });
    placementListenersRef.current = null;
  }, []);

  const logicalFromClient = useCallback(
    (clientX: number, clientY: number) => {
      const fc = fabricRef.current;
      if (!fc) return null;
      const rect = fc.upperCanvasEl.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      const st = useEditorStore.getState();
      const sc = st.scale;
      const cw = st.canvasWidth;
      const ch = st.canvasHeight;
      let tx = (px - PAD) / sc;
      let ty = (py - PAD) / sc;
      tx = Math.max(0, Math.min(cw, tx));
      ty = Math.max(0, Math.min(ch, ty));
      return { tx, ty };
    },
    [],
  );

  const attachPlacementDragListeners = useCallback(() => {
    clearPlacementDragListeners();
    const onMove = (ev: MouseEvent) => {
      const p = logicalFromClient(ev.clientX, ev.clientY);
      if (!p) return;
      setPlaceRubber((prev) => (prev ? { ...prev, cx: p.tx, cy: p.ty } : null));
    };
    const onUp = () => {
      clearPlacementDragListeners();
      setPlaceRubber((prev) => {
        if (prev) finalizePlacement(prev);
        return null;
      });
    };
    placementListenersRef.current = { move: onMove, up: onUp };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp, { capture: true });
  }, [clearPlacementDragListeners, finalizePlacement, logicalFromClient]);

  useEffect(
    () => () => {
      const cur = placementListenersRef.current;
      if (cur) {
        window.removeEventListener("mousemove", cur.move);
        window.removeEventListener("mouseup", cur.up, { capture: true });
        placementListenersRef.current = null;
      }
    },
    [],
  );

  const handleCanvasDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const p = logicalFromClient(e.clientX, e.clientY);
      if (!p) return;
      const { tx, ty } = p;
      const raw =
        e.dataTransfer.getData("application/poster-image-src") ||
        e.dataTransfer.getData("text/plain");
      const src = raw.trim();
      if (src.startsWith("http")) {
        useEditorStore.getState().pushHistory();
        useEditorStore.getState().addImageAt(src, tx, ty);
        return;
      }
      const f = e.dataTransfer.files?.[0];
      if (f?.type.startsWith("image/")) {
        try {
          useEditorStore.getState().pushHistory();
          const url = await uploadLocalImage(f);
          useEditorStore.getState().addImageAt(url, tx, ty);
        } catch {
          alert("拖入上传失败，请检查 OSS/CORS 或改用较小图片");
        }
      }
    },
    [logicalFromClient],
  );

  const selectedId = selectedIds[0] ?? null;

  useEffect(() => {
    const el = canvasElRef.current;
    if (!el) return;
    const fc = new Canvas(el, {
      preserveObjectStacking: true,
      selection: true,
      stopContextMenu: true,
      fireRightClick: true,
    });
    fabricRef.current = fc;

    const ensureGestureHistory = () => {
      if (!gestureHistoryPushedRef.current) {
        useEditorStore.getState().pushHistory();
        gestureHistoryPushedRef.current = true;
      }
    };

    const onModified = (opt: { target?: FabricObject }) => {
      gestureHistoryPushedRef.current = false;
      useEditorStore.getState().setGuideLines({ vertical: [], horizontal: [] });
      const obj = opt.target;
      if (!obj || obj.type === "activeSelection") return;
      const id = getPosterElementId(obj);
      if (!id) return;
      const elModel = useEditorStore.getState().elements.find((e) => e.id === id);
      if (!elModel) return;
      const patch = patchElementFromFabricObject(obj, elModel);
      if (Object.keys(patch).length) useEditorStore.getState().updateElement(id, patch);
    };

    const onMoving = (opt: { target?: FabricObject }) => {
      const obj = opt.target;
      if (!obj || obj.type === "activeSelection") return;
      const id = getPosterElementId(obj);
      if (!id) return;
      ensureGestureHistory();
      const st = useEditorStore.getState();
      const elModel = st.elements.find((e) => e.id === id);
      if (!elModel) return;
      const cur = {
        id,
        x: obj.left ?? 0,
        y: obj.top ?? 0,
        width: elModel.width,
        height: elModel.height,
      };
      const sn = snapWithGuides(cur, st.canvasWidth, st.canvasHeight, st.elements);
      obj.set({ left: sn.x, top: sn.y });
      st.setGuideLines({
        vertical: sn.vertical.map((v) => PAD + v * st.scale),
        horizontal: sn.horizontal.map((h) => PAD + h * st.scale),
      });
    };

    const onScaleRotate = () => {
      ensureGestureHistory();
    };

    fc.on("object:modified", onModified);
    fc.on("object:moving", onMoving);
    fc.on("object:scaling", onScaleRotate);
    fc.on("object:rotating", onScaleRotate);

    fc.on("selection:created", (e) => {
      const t = e.selected?.[0];
      const id = getPosterElementId(t);
      if (id) useEditorStore.getState().setSelected([id]);
    });
    fc.on("selection:updated", (e) => {
      const t = e.selected?.[0];
      const id = getPosterElementId(t);
      if (id) useEditorStore.getState().setSelected([id]);
    });
    fc.on("selection:cleared", () => {
      useEditorStore.getState().clearSelection();
    });

    fc.on("mouse:down", (opt) => {
      const t = opt.target;
      if (getPosterElementId(t)) return;

      useEditorStore.getState().clearSelection();
      fc.discardActiveObject();
      fc.requestRenderAll();

      const ev = opt.e as MouseEvent;
      if (ev.button !== 0) return;
      const p = logicalFromClient(ev.clientX, ev.clientY);
      if (!p) return;
      const { tx, ty } = p;
      const pl = useEditorStore.getState().placement;
      if (pl.kind === "text") {
        setPlaceRubber({ kind: "text", sx: tx, sy: ty, cx: tx, cy: ty });
        attachPlacementDragListeners();
        return;
      }
      if (pl.kind === "shape") {
        setPlaceRubber({
          kind: "shape",
          shapeKind: pl.shapeKind,
          category: pl.category,
          sx: tx,
          sy: ty,
          cx: tx,
          cy: ty,
        });
        attachPlacementDragListeners();
        return;
      }
      if (pl.kind === "image") {
        setPlaceRubber({ kind: "image", src: pl.src, sx: tx, sy: ty, cx: tx, cy: ty });
        attachPlacementDragListeners();
      }
    });

    fc.on("mouse:dblclick", (opt) => {
      const t = opt.target;
      if (!t || !("enterEditing" in t) || typeof (t as { enterEditing?: () => void }).enterEditing !== "function")
        return;
      const id = getPosterElementId(t);
      if (!id) return;
      const m = useEditorStore.getState().elements.find((e) => e.id === id && e.type === "text");
      if (m) (t as { enterEditing: () => void }).enterEditing();
    });

    const onCtx = (ev: MouseEvent) => {
      ev.preventDefault();
      const p = logicalFromClient(ev.clientX, ev.clientY);
      if (!p) return;
      const st = useEditorStore.getState();
      const sortedEls = [...st.elements].sort((a, b) => a.zIndex - b.zIndex);
      const hit = [...sortedEls].reverse().find((el: CanvasElement) => {
        return p.tx >= el.x && p.tx <= el.x + el.width && p.ty >= el.y && p.ty <= el.y + el.height;
      });
      if (hit) {
        st.setSelected([hit.id]);
        setMenu({ x: ev.clientX, y: ev.clientY, targetId: hit.id });
      } else setMenu(null);
    };
    fc.upperCanvasEl.addEventListener("contextmenu", onCtx);

    return () => {
      fc.upperCanvasEl.removeEventListener("contextmenu", onCtx);
      fc.dispose();
      fabricRef.current = null;
    };
  }, [attachPlacementDragListeners, logicalFromClient]);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        clearPlacementDragListeners();
        setMenu(null);
        setPlaceRubber(null);
        useEditorStore.getState().setPlacement({ kind: "idle" });
      }
      if ((ev.key === "Delete" || ev.key === "Backspace") && useEditorStore.getState().selectedIds[0]) {
        const fc = fabricRef.current;
        const ao = fc?.getActiveObject();
        if (ao && "isEditing" in ao && (ao as { isEditing?: boolean }).isEditing) return;
        ev.preventDefault();
        useEditorStore.getState().deleteSelected();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clearPlacementDragListeners]);

  const stageW = canvasWidth * scale + PAD * 2;
  const stageH = canvasHeight * scale + PAD * 2;

  useEffect(() => {
    const fc = fabricRef.current;
    if (!fc) return;

    let cancelled = false;

    void (async () => {
      fc.clear();
      fc.setDimensions({ width: stageW, height: stageH });

      const mat = new Rect({
        left: 0,
        top: 0,
        width: stageW,
        height: stageH,
        fill: "#cbd5e1",
        rx: 12,
        ry: 12,
        selectable: false,
        evented: true,
      });

      const st = useEditorStore.getState();
      const innerBg =
        st.bgMode === "image" && bgImageEl
          ? new FabricImage(bgImageEl, {
              left: 0,
              top: 0,
              scaleX: st.canvasWidth / (bgImageEl.naturalWidth || st.canvasWidth),
              scaleY: st.canvasHeight / (bgImageEl.naturalHeight || st.canvasHeight),
              selectable: false,
              evented: true,
            })
          : new Rect({
              left: 0,
              top: 0,
              width: st.canvasWidth,
              height: st.canvasHeight,
              fill: st.bgColor,
              selectable: false,
              evented: true,
            });

      const paper = new Rect({
        left: 0,
        top: 0,
        width: st.canvasWidth,
        height: st.canvasHeight,
        fill: "transparent",
        shadow: new Shadow({ blur: 16, color: "rgba(15,23,42,0.12)", offsetX: 0, offsetY: 4 }),
        selectable: false,
        evented: false,
      });

      const sheet = new Group([paper, innerBg], {
        left: PAD,
        top: PAD,
        scaleX: st.scale,
        scaleY: st.scale,
        subTargetCheck: true,
        interactive: true,
      });

      const sortedEls = [...st.elements].sort((a, b) => a.zIndex - b.zIndex);
      const objs: FabricObject[] = [];
      for (const el of sortedEls) {
        objs.push(await createFabricObjectFromElement(el));
      }
      if (cancelled) return;
      for (const o of objs) sheet.add(o);

      fc.add(mat);
      fc.add(sheet);

      const sel = useEditorStore.getState().selectedIds[0];
      if (sel) {
        const target = objs.find((o) => getPosterElementId(o) === sel);
        if (target) fc.setActiveObject(target);
      }

      fc.requestRenderAll();
    })();

    return () => {
      cancelled = true;
    };
  }, [
    sorted,
    canvasWidth,
    canvasHeight,
    scale,
    bgMode,
    bgColor,
    bgImageEl,
    stageW,
    stageH,
    selectedId,
  ]);

  useEffect(() => {
    onExportReady?.(() => fabricRef.current?.toDataURL({ format: "png", multiplier: 2 }) ?? undefined);
  }, [onExportReady, stageW, stageH, elements, scale, bgMode, bgColor, bgImageSrc]);

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col bg-slate-200"
      onDragOver={(ev) => {
        ev.preventDefault();
        ev.dataTransfer.dropEffect = "copy";
      }}
      onDrop={(ev) => void handleCanvasDrop(ev)}
    >
      <div className="flex min-h-0 flex-1 items-start justify-center overflow-auto p-4">
        <div className="relative rounded-xl shadow-inner" style={{ width: stageW, height: stageH }}>
          <canvas ref={canvasElRef} className="block rounded-xl" />
          <div className="pointer-events-none absolute inset-0">
            {guideLines.vertical.map((gx, i) => (
              <div
                key={`gv-${i}`}
                className="absolute top-0 bottom-0 w-px bg-[#f97316]"
                style={{ left: gx }}
              />
            ))}
            {guideLines.horizontal.map((gy, i) => (
              <div
                key={`gh-${i}`}
                className="absolute left-0 right-0 h-px bg-[#f97316]"
                style={{ top: gy }}
              />
            ))}
          </div>
          {placeRubber ? (
            <div
              className="pointer-events-none absolute border-2 border-dashed border-brand-blue bg-brand-blue/10"
              style={{
                left: PAD + Math.min(placeRubber.sx, placeRubber.cx) * scale,
                top: PAD + Math.min(placeRubber.sy, placeRubber.cy) * scale,
                width: Math.max(1, Math.abs(placeRubber.cx - placeRubber.sx) * scale),
                height: Math.max(1, Math.abs(placeRubber.cy - placeRubber.sy) * scale),
              }}
            />
          ) : null}
        </div>
      </div>

      {menu ? (
        <div
          className="fixed z-50 min-w-[180px] rounded-xl border border-slate-200 bg-white/95 py-1 shadow-xl backdrop-blur"
          style={{ left: menu.x, top: menu.y }}
          role="menu"
        >
          <button
            type="button"
            className="block w-full cursor-pointer px-4 py-2 text-left text-sm text-slate-800 transition-colors hover:bg-brand-blue-soft"
            onClick={() => {
              useEditorStore.getState().setSelected([menu.targetId]);
              useEditorStore.getState().bringToFront();
              setMenu(null);
            }}
          >
            置于顶层
          </button>
          <button
            type="button"
            className="block w-full cursor-pointer px-4 py-2 text-left text-sm text-slate-800 transition-colors hover:bg-brand-blue-soft"
            onClick={() => {
              useEditorStore.getState().setSelected([menu.targetId]);
              useEditorStore.getState().bringForward();
              setMenu(null);
            }}
          >
            上移一层
          </button>
          <button
            type="button"
            className="block w-full cursor-pointer px-4 py-2 text-left text-sm text-slate-800 transition-colors hover:bg-brand-blue-soft"
            onClick={() => {
              useEditorStore.getState().setSelected([menu.targetId]);
              useEditorStore.getState().sendBackward();
              setMenu(null);
            }}
          >
            下移一层
          </button>
          <button
            type="button"
            className="block w-full cursor-pointer px-4 py-2 text-left text-sm text-slate-800 transition-colors hover:bg-brand-blue-soft"
            onClick={() => {
              useEditorStore.getState().setSelected([menu.targetId]);
              useEditorStore.getState().sendToBack();
              setMenu(null);
            }}
          >
            置于底层
          </button>
        </div>
      ) : null}
    </div>
  );
}
