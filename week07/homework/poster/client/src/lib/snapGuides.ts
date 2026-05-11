import type { CanvasElement } from "../types/editor";

const TH = 6;

/** 拖拽时吸附画布中线与其它元素边缘，并返回辅助线坐标（画布坐标系） */
export function snapWithGuides(
  moving: {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
  },
  canvasW: number,
  canvasH: number,
  elements: CanvasElement[],
): {
  x: number;
  y: number;
  vertical: number[];
  horizontal: number[];
} {
  const verticalLines: number[] = [canvasW / 2];
  const horizontalLines: number[] = [canvasH / 2];

  for (const e of elements) {
    if (e.id === moving.id) continue;
    verticalLines.push(e.x, e.x + e.width / 2, e.x + e.width);
    horizontalLines.push(e.y, e.y + e.height / 2, e.y + e.height);
  }

  let nx = moving.x;
  let ny = moving.y;
  const vertical: number[] = [];
  const horizontal: number[] = [];

  let bestX = TH + 1;
  for (const vx of verticalLines) {
    for (const anchor of [0, moving.width / 2, moving.width] as const) {
      const px = moving.x + anchor;
      const d = Math.abs(px - vx);
      if (d < bestX && d <= TH) {
        bestX = d;
        nx = vx - anchor;
        vertical.length = 0;
        vertical.push(vx);
      }
    }
  }

  let bestY = TH + 1;
  for (const hy of horizontalLines) {
    for (const anchor of [0, moving.height / 2, moving.height] as const) {
      const py = moving.y + anchor;
      const d = Math.abs(py - hy);
      if (d < bestY && d <= TH) {
        bestY = d;
        ny = hy - anchor;
        horizontal.length = 0;
        horizontal.push(hy);
      }
    }
  }

  if (bestX > TH) nx = moving.x;
  if (bestY > TH) ny = moving.y;

  return {
    x: nx,
    y: ny,
    vertical: bestX <= TH ? vertical : [],
    horizontal: bestY <= TH ? horizontal : [],
  };
}
