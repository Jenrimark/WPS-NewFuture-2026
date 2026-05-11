import type { CanvasElement, EditorSnapshot } from "../types/editor";

export function serializePosterData(s: EditorSnapshot): string {
  return JSON.stringify({
    elements: s.elements,
    canvasWidth: s.canvasWidth,
    canvasHeight: s.canvasHeight,
    lockAspect: s.lockAspect,
    aspectRatio: s.aspectRatio,
    bgMode: s.bgMode,
    bgColor: s.bgColor,
    bgImageSrc: s.bgImageSrc,
  });
}

export function parsePosterData(raw: string): Partial<EditorSnapshot> & {
  elements?: CanvasElement[];
} {
  try {
    return JSON.parse(raw) as Partial<EditorSnapshot> & { elements?: CanvasElement[] };
  } catch {
    return {};
  }
}
