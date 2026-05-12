import { create } from "zustand";
import type {
  CanvasElement,
  EditorSnapshot,
  ImageElement,
  PlacementMode,
  ShapeCategory,
  ShapeElement,
  ShapeKind,
  TextElement,
} from "../types/editor";

export const DEFAULT_CANVAS_W = 600;
export const DEFAULT_CANVAS_H = 800;

const HISTORY_LIMIT = 60;

const PRESET_IMAGES = [
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80",
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&q=80",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&q=80",
  "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=400&q=80",
];

function uid(): string {
  return crypto.randomUUID();
}

function cloneSnap(s: EditorSnapshot): EditorSnapshot {
  return JSON.parse(JSON.stringify(s)) as EditorSnapshot;
}

function buildSnapshot(s: EditorStateShape): EditorSnapshot {
  return {
    elements: JSON.parse(JSON.stringify(s.elements)) as CanvasElement[],
    canvasWidth: s.canvasWidth,
    canvasHeight: s.canvasHeight,
    lockAspect: s.lockAspect,
    aspectRatio: s.aspectRatio,
    bgMode: s.bgMode,
    bgColor: s.bgColor,
    bgImageSrc: s.bgImageSrc,
  };
}

export interface EditorStateShape extends EditorSnapshot {
  posterId: number | null;
  posterTitle: string;
  scale: number;
  selectedIds: string[];
  placement: PlacementMode;
  /** 最近一次 AI 生成的百炼临时图 URL，用于素材区「保存到我的 OSS」提示；转存成功后清空 */
  pendingAiImageSrc: string | null;
  past: EditorSnapshot[];
  future: EditorSnapshot[];
  guideLines: { vertical: number[]; horizontal: number[] };
}

export interface EditorStore extends EditorStateShape {
  setPosterMeta: (id: number | null, title: string) => void;
  hydrateFromSnapshot: (snap: Partial<EditorSnapshot> & { elements?: CanvasElement[] }) => void;
  setScale: (v: number) => void;
  setSelected: (ids: string[]) => void;
  clearSelection: () => void;
  setPlacement: (p: PlacementMode) => void;
  setPendingAiImageSrc: (src: string | null) => void;
  /** 将画布与放置预览中所有匹配 from 的图片 src 替换为 to，并入撤销栈 */
  replaceImageSrcAll: (from: string, to: string) => void;

  setCanvasSize: (w: number, h: number) => void;
  setLockAspect: (lock: boolean) => void;
  setBgMode: (m: "solid" | "image") => void;
  setBgColor: (c: string) => void;
  setBgImageSrc: (src: string | null) => void;
  resetBackground: () => void;

  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  addTextAt: (x: number, y: number) => void;
  addShapeAt: (kind: ShapeKind, category: ShapeCategory, x: number, y: number) => void;
  addImageAt: (src: string, x: number, y: number) => void;
  updateElement: (id: string, patch: Partial<CanvasElement>) => void;
  removeElement: (id: string) => void;
  deleteSelected: () => void;

  bringForward: () => void;
  sendBackward: () => void;
  bringToFront: () => void;
  sendToBack: () => void;

  alignSelectedX: (mode: "center" | "left" | "right") => void;
  alignSelectedY: (mode: "middle" | "top" | "bottom") => void;

  setGuideLines: (g: { vertical: number[]; horizontal: number[] }) => void;
}

const defaultText = (): Omit<TextElement, "id" | "zIndex"> => ({
  type: "text",
  x: 80,
  y: 80,
  width: 280,
  height: 48,
  rotation: 0,
  opacity: 1,
  text: "双击编辑文本",
  fontFamily: "Plus Jakarta Sans",
  fontSize: 28,
  fill: "#0f172a",
  fontWeight: "normal",
  fontStyle: "normal",
  underline: false,
  strikethrough: false,
  align: "left",
  letterSpacing: 0,
  lineHeight: 1.2,
  shadowEnabled: false,
  shadowBlur: 8,
  shadowColor: "rgba(0,0,0,0.35)",
});

const shapeSize = (kind: ShapeKind): { w: number; h: number } => {
  switch (kind) {
    case "circle":
      return { w: 120, h: 120 };
    case "star":
      return { w: 140, h: 140 };
    case "heart":
      return { w: 120, h: 110 };
    default:
      return { w: 120, h: 120 };
  }
};

const defaultShape = (
  kind: ShapeKind,
): Omit<ShapeElement, "id" | "zIndex" | "x" | "y"> => {
  const { w, h } = shapeSize(kind);
  return {
    type: "shape",
    shapeKind: kind,
    width: w,
    height: h,
    rotation: 0,
    opacity: 1,
    fill: "#3b82f6",
    stroke: "#1e40af",
    strokeWidth: 2,
    shadowEnabled: false,
    shadowBlur: 10,
    shadowColor: "rgba(0,0,0,0.25)",
  };
};

function nextZ(elements: CanvasElement[]): number {
  return elements.reduce((m, e) => Math.max(m, e.zIndex), 0) + 1;
}

const initialSnapshot = (): EditorSnapshot => ({
  elements: [],
  canvasWidth: DEFAULT_CANVAS_W,
  canvasHeight: DEFAULT_CANVAS_H,
  lockAspect: false,
  aspectRatio: DEFAULT_CANVAS_W / DEFAULT_CANVAS_H,
  bgMode: "solid",
  bgColor: "#ffffff",
  bgImageSrc: null,
});

export const useEditorStore = create<EditorStore>((set, get) => ({
  posterId: null,
  posterTitle: "未命名海报",
  ...initialSnapshot(),
  scale: 1,
  selectedIds: [],
  placement: { kind: "idle" },
  pendingAiImageSrc: null,
  past: [],
  future: [],
  guideLines: { vertical: [], horizontal: [] },

  setPosterMeta: (id, title) => set({ posterId: id, posterTitle: title }),

  hydrateFromSnapshot: (snap) => {
    const base = initialSnapshot();
    set({
      elements: snap.elements ?? base.elements,
      canvasWidth: snap.canvasWidth ?? base.canvasWidth,
      canvasHeight: snap.canvasHeight ?? base.canvasHeight,
      lockAspect: snap.lockAspect ?? base.lockAspect,
      aspectRatio:
        snap.aspectRatio ??
        (snap.canvasWidth && snap.canvasHeight
          ? snap.canvasWidth / snap.canvasHeight
          : base.aspectRatio),
      bgMode: snap.bgMode ?? base.bgMode,
      bgColor: snap.bgColor ?? base.bgColor,
      bgImageSrc: snap.bgImageSrc ?? base.bgImageSrc,
      past: [],
      future: [],
      selectedIds: [],
      pendingAiImageSrc: null,
    });
  },

  setScale: (v) => set({ scale: Math.min(3, Math.max(0.25, Math.round(v * 1000) / 1000)) }),
  setSelected: (ids) => set({ selectedIds: ids }),
  clearSelection: () => set({ selectedIds: [] }),
  setPlacement: (p) => set({ placement: p }),
  setPendingAiImageSrc: (src) => set({ pendingAiImageSrc: src }),

  replaceImageSrcAll: (from, to) => {
    if (from === to) return;
    get().pushHistory();
    const g = get();
    let placement = g.placement;
    if (placement.kind === "image" && placement.src === from) {
      placement = { kind: "image", src: to };
    }
    const pendingAiImageSrc = g.pendingAiImageSrc === from ? null : g.pendingAiImageSrc;
    set({
      elements: g.elements.map((e) => {
        if (e.type !== "image") return e;
        const im = e as ImageElement;
        return im.src === from ? { ...im, src: to } : e;
      }),
      placement,
      pendingAiImageSrc,
    });
  },

  setCanvasSize: (w, h) => {
    const g = get();
    let nw = Math.max(100, Math.round(w));
    let nh = Math.max(100, Math.round(h));
    if (g.lockAspect && g.aspectRatio > 0) {
      nh = Math.round(nw / g.aspectRatio);
    }
    set({ canvasWidth: nw, canvasHeight: nh });
  },

  setLockAspect: (lock) => {
    const g = get();
    const ar = g.canvasWidth / g.canvasHeight;
    set({ lockAspect: lock, aspectRatio: ar });
  },

  setBgMode: (m) => set({ bgMode: m }),
  setBgColor: (c) => set({ bgColor: c }),
  setBgImageSrc: (src) => set({ bgImageSrc: src, bgMode: src ? "image" : "solid" }),
  resetBackground: () =>
    set({
      bgMode: "solid",
      bgColor: "#ffffff",
      bgImageSrc: null,
    }),

  pushHistory: () => {
    const g = get();
    const snap = buildSnapshot(g);
    const past = [...g.past, cloneSnap(snap)].slice(-HISTORY_LIMIT);
    set({ past, future: [] });
  },

  undo: () => {
    const g = get();
    if (g.past.length === 0) return;
    const prev = g.past[g.past.length - 1];
    const newPast = g.past.slice(0, -1);
    const current = buildSnapshot(g);
    set({
      elements: prev.elements,
      canvasWidth: prev.canvasWidth,
      canvasHeight: prev.canvasHeight,
      lockAspect: prev.lockAspect,
      aspectRatio: prev.aspectRatio,
      bgMode: prev.bgMode,
      bgColor: prev.bgColor,
      bgImageSrc: prev.bgImageSrc,
      past: newPast,
      future: [cloneSnap(current), ...g.future].slice(0, HISTORY_LIMIT),
      selectedIds: [],
    });
  },

  redo: () => {
    const g = get();
    if (g.future.length === 0) return;
    const next = g.future[0];
    const newFuture = g.future.slice(1);
    const current = buildSnapshot(g);
    set({
      elements: next.elements,
      canvasWidth: next.canvasWidth,
      canvasHeight: next.canvasHeight,
      lockAspect: next.lockAspect,
      aspectRatio: next.aspectRatio,
      bgMode: next.bgMode,
      bgColor: next.bgColor,
      bgImageSrc: next.bgImageSrc,
      future: newFuture,
      past: [...g.past, cloneSnap(current)].slice(-HISTORY_LIMIT),
      selectedIds: [],
    });
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  addTextAt: (x, y) => {
    const g = get();
    const t: TextElement = {
      id: uid(),
      zIndex: nextZ(g.elements),
      ...defaultText(),
      x: x - 40,
      y: y - 20,
    };
    set({ elements: [...g.elements, t], selectedIds: [t.id], placement: { kind: "idle" } });
  },

  addShapeAt: (kind, _category, x, y) => {
    const g = get();
    const sh = defaultShape(kind);
    const el: ShapeElement = {
      id: uid(),
      zIndex: nextZ(g.elements),
      ...sh,
      x: x - sh.width / 2,
      y: y - sh.height / 2,
    };
    set({ elements: [...g.elements, el], selectedIds: [el.id], placement: { kind: "idle" } });
  },

  addImageAt: (src, x, y) => {
    const g = get();
    const im: ImageElement = {
      id: uid(),
      type: "image",
      x: x - 80,
      y: y - 80,
      width: 160,
      height: 160,
      rotation: 0,
      opacity: 1,
      zIndex: nextZ(g.elements),
      src,
    };
    set({ elements: [...g.elements, im], selectedIds: [im.id], placement: { kind: "idle" } });
  },

  updateElement: (id, patch) => {
    const g = get();
    set({
      elements: g.elements.map((e) =>
        e.id === id ? ({ ...e, ...patch } as CanvasElement) : e,
      ),
    });
  },

  removeElement: (id) => {
    get().pushHistory();
    const g = get();
    set({
      elements: g.elements.filter((e) => e.id !== id),
      selectedIds: g.selectedIds.filter((x) => x !== id),
    });
  },

  deleteSelected: () => {
    const g = get();
    if (g.selectedIds.length === 0) return;
    get().pushHistory();
    const setIds = new Set(g.selectedIds);
    set({
      elements: g.elements.filter((e) => !setIds.has(e.id)),
      selectedIds: [],
    });
  },

  bringForward: () => {
    const g = get();
    const id = g.selectedIds[0];
    if (!id) return;
    get().pushHistory();
    const sorted = [...g.elements].sort((a, b) => a.zIndex - b.zIndex);
    const idx = sorted.findIndex((e) => e.id === id);
    if (idx < 0 || idx === sorted.length - 1) return;
    const nextZ = sorted[idx + 1].zIndex;
    const curZ = sorted[idx].zIndex;
    set({
      elements: g.elements.map((e) => {
        if (e.id === id) return { ...e, zIndex: nextZ };
        if (e.zIndex === nextZ) return { ...e, zIndex: curZ };
        return e;
      }),
    });
  },

  sendBackward: () => {
    const g = get();
    const id = g.selectedIds[0];
    if (!id) return;
    get().pushHistory();
    const sorted = [...g.elements].sort((a, b) => a.zIndex - b.zIndex);
    const idx = sorted.findIndex((e) => e.id === id);
    if (idx <= 0) return;
    const prevZ = sorted[idx - 1].zIndex;
    const curZ = sorted[idx].zIndex;
    set({
      elements: g.elements.map((e) => {
        if (e.id === id) return { ...e, zIndex: prevZ };
        if (e.zIndex === prevZ) return { ...e, zIndex: curZ };
        return e;
      }),
    });
  },

  bringToFront: () => {
    const g = get();
    const id = g.selectedIds[0];
    if (!id) return;
    get().pushHistory();
    const maxZ = g.elements.reduce((m, e) => Math.max(m, e.zIndex), 0);
    set({
      elements: g.elements.map((e) => (e.id === id ? { ...e, zIndex: maxZ + 1 } : e)),
    });
  },

  sendToBack: () => {
    const g = get();
    const id = g.selectedIds[0];
    if (!id) return;
    get().pushHistory();
    const minZ = g.elements.reduce((m, e) => Math.min(m, e.zIndex), 0);
    set({
      elements: g.elements.map((e) => (e.id === id ? { ...e, zIndex: minZ - 1 } : e)),
    });
  },

  alignSelectedX: (mode) => {
    const g = get();
    const id = g.selectedIds[0];
    if (!id) return;
    const el = g.elements.find((e) => e.id === id);
    if (!el) return;
    get().pushHistory();
    let nx = el.x;
    if (mode === "center") nx = (g.canvasWidth - el.width) / 2;
    if (mode === "left") nx = 0;
    if (mode === "right") nx = g.canvasWidth - el.width;
    set({
      elements: g.elements.map((e) => (e.id === id ? { ...e, x: nx } : e)),
    });
  },

  alignSelectedY: (mode) => {
    const g = get();
    const id = g.selectedIds[0];
    if (!id) return;
    const el = g.elements.find((e) => e.id === id);
    if (!el) return;
    get().pushHistory();
    let ny = el.y;
    if (mode === "middle") ny = (g.canvasHeight - el.height) / 2;
    if (mode === "top") ny = 0;
    if (mode === "bottom") ny = g.canvasHeight - el.height;
    set({
      elements: g.elements.map((e) => (e.id === id ? { ...e, y: ny } : e)),
    });
  },

  setGuideLines: (guideLines) => set({ guideLines }),
}));

export { PRESET_IMAGES };
