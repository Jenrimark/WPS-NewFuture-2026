import {
  Circle,
  FabricImage,
  FabricObject,
  Path,
  Polygon,
  Rect,
  Textbox,
  Triangle,
  Shadow,
} from "fabric";
import type { CanvasElement, ImageElement, ShapeElement, TextElement } from "../types/editor";
import type { ShapeKind } from "../types/editor";

export function setPosterElementId(obj: FabricObject, id: string): void {
  (obj as unknown as { posterElId?: string }).posterElId = id;
}

export function getPosterElementId(obj: FabricObject | undefined | null): string | undefined {
  return (obj as unknown as { posterElId?: string })?.posterElId;
}

const HEART_PATH =
  "M12,21.35l-1.45-1.32C5.4,15.36,2,12.28,2,8.5 C2,5.42,4.42,3,7.5,3c1.74,0,3.41,0.81,4.5,2.09C13.09,3.81,14.76,3,16.5,3 C19.58,3,22,5.42,22,8.5c0,3.78-3.4,6.86-8.55,11.54L12,21.35z";

function starPoints(w: number, h: number): { x: number; y: number }[] {
  const cx = w / 2;
  const cy = h / 2;
  const or = Math.min(w, h) / 2;
  const ir = or * 0.4;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (-Math.PI / 2 + (i * Math.PI) / 5) as number;
    const r = i % 2 === 0 ? or : ir;
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return pts;
}

function applyPosterControls(obj: FabricObject, el: CanvasElement): void {
  setPosterElementId(obj, el.id);
  obj.set({
    angle: el.rotation,
    opacity: el.opacity,
    selectable: true,
    evented: true,
    hasControls: true,
    lockScalingFlip: true,
    cornerStyle: "circle",
    borderColor: "#2563eb",
    cornerColor: "#ffffff",
    cornerStrokeColor: "#2563eb",
    transparentCorners: false,
  });
}

export async function createFabricObjectFromElement(el: CanvasElement): Promise<FabricObject> {
  if (el.type === "text") {
    const t = el as TextElement;
    const tb = new Textbox(t.text, {
      left: t.x,
      top: t.y,
      width: Math.max(40, t.width),
      fontSize: t.fontSize,
      fontFamily: t.fontFamily,
      fill: t.fill,
      fontWeight: t.fontWeight === "bold" ? "bold" : "normal",
      fontStyle: t.fontStyle === "italic" ? "italic" : "normal",
      textAlign: t.align,
      charSpacing: t.letterSpacing,
      lineHeight: t.lineHeight,
      linethrough: t.strikethrough,
      underline: t.underline,
      editable: false,
      splitByGrapheme: false,
    });
    tb.set({ strokeUniform: true });
    if (t.shadowEnabled) {
      tb.set(
        "shadow",
        new Shadow({
          blur: t.shadowBlur,
          color: t.shadowColor,
          offsetX: 0,
          offsetY: 2,
        }),
      );
    }
    applyPosterControls(tb, el);
    return tb;
  }

  if (el.type === "image") {
    const im = el as ImageElement;
    const img = await FabricImage.fromURL(im.src, { crossOrigin: "anonymous" });
    const iw = img.width || 1;
    const ih = img.height || 1;
    img.set({
      left: im.x,
      top: im.y,
      scaleX: im.width / iw,
      scaleY: im.height / ih,
    });
    applyPosterControls(img, el);
    return img;
  }

  const sh = el as ShapeElement;
  const w = sh.width;
  const h = sh.height;
  const sw = sh.strokeWidth;
  const fill = sh.fill;
  const stroke = sh.stroke;
  const shOpts = sh.shadowEnabled
    ? new Shadow({ blur: sh.shadowBlur, color: sh.shadowColor, offsetX: 0, offsetY: 2 })
    : undefined;

  let shape: FabricObject;
  switch (sh.shapeKind as ShapeKind) {
    case "rect":
      shape = new Rect({
        left: sh.x,
        top: sh.y,
        width: w,
        height: h,
        fill,
        stroke,
        strokeWidth: sw,
        rx: 6,
        ry: 6,
        shadow: shOpts,
      });
      break;
    case "circle": {
      const r = Math.min(w, h) / 2;
      shape = new Circle({
        left: sh.x + w / 2,
        top: sh.y + h / 2,
        radius: r,
        originX: "center",
        originY: "center",
        fill,
        stroke,
        strokeWidth: sw,
        shadow: shOpts,
      });
      break;
    }
    case "triangle":
      shape = new Triangle({
        left: sh.x,
        top: sh.y,
        width: w,
        height: h,
        fill,
        stroke,
        strokeWidth: sw,
        shadow: shOpts,
      });
      break;
    case "diamond": {
      const pts = [
        { x: w / 2, y: 0 },
        { x: w, y: h / 2 },
        { x: w / 2, y: h },
        { x: 0, y: h / 2 },
      ];
      shape = new Polygon(pts, {
        left: sh.x,
        top: sh.y,
        fill,
        stroke,
        strokeWidth: sw,
        shadow: shOpts,
      });
      break;
    }
    case "pentagon": {
      const pts: { x: number; y: number }[] = [];
      const r = (Math.min(w, h) / 2) * 0.9;
      for (let i = 0; i < 5; i++) {
        const a = (-Math.PI / 2 + (i * 2 * Math.PI) / 5) as number;
        pts.push({ x: w / 2 + r * Math.cos(a), y: h / 2 + r * Math.sin(a) });
      }
      shape = new Polygon(pts, {
        left: sh.x,
        top: sh.y,
        fill,
        stroke,
        strokeWidth: sw,
        shadow: shOpts,
      });
      break;
    }
    case "hexagon": {
      const pts: { x: number; y: number }[] = [];
      const r = (Math.min(w, h) / 2) * 0.92;
      for (let i = 0; i < 6; i++) {
        const a = (-Math.PI / 2 + (i * Math.PI) / 3) as number;
        pts.push({ x: w / 2 + r * Math.cos(a), y: h / 2 + r * Math.sin(a) });
      }
      shape = new Polygon(pts, {
        left: sh.x,
        top: sh.y,
        fill,
        stroke,
        strokeWidth: sw,
        shadow: shOpts,
      });
      break;
    }
    case "star":
      shape = new Polygon(starPoints(w, h), {
        left: sh.x,
        top: sh.y,
        fill,
        stroke,
        strokeWidth: sw,
        shadow: shOpts,
      });
      break;
    case "heart":
      shape = new Path(HEART_PATH, {
        left: sh.x,
        top: sh.y,
        fill,
        stroke,
        strokeWidth: sw,
        scaleX: w / 24,
        scaleY: h / 24,
        shadow: shOpts,
      });
      break;
    default:
      shape = new Rect({
        left: sh.x,
        top: sh.y,
        width: w,
        height: h,
        fill,
        stroke,
        strokeWidth: sw,
        shadow: shOpts,
      });
  }

  applyPosterControls(shape, sh);
  return shape;
}

/** 将 Fabric 对象写回我们的元素模型（object:modified） */
export function patchElementFromFabricObject(
  obj: FabricObject,
  el: CanvasElement,
  /** 场景坐标相对画板逻辑坐标的外边距（与 CanvasBoard 中工作区左上角偏移一致） */
  scenePad = 0,
): Partial<CanvasElement> {
  const id = getPosterElementId(obj);
  if (!id || id !== el.id) return {};

  if (el.type === "text" && obj instanceof Textbox) {
    const t = obj;
    const sx = t.scaleX || 1;
    const sy = t.scaleY || 1;
    const nw = Math.max(40, (t.width || el.width) * sx);
    const nh = Math.max(24, (t.height || el.height) * sy);
    return {
      x: (t.left ?? el.x) - scenePad,
      y: (t.top ?? el.y) - scenePad,
      width: nw,
      height: nh,
      rotation: t.angle ?? 0,
      opacity: t.opacity ?? 1,
      text: t.text,
      fontSize: t.fontSize ?? (el as TextElement).fontSize,
      fontFamily: (t.fontFamily as string) || (el as TextElement).fontFamily,
      fill: (t.fill as string) || (el as TextElement).fill,
      fontWeight: t.fontWeight === "bold" ? "bold" : "normal",
      fontStyle: t.fontStyle === "italic" ? "italic" : "normal",
      align: (t.textAlign as TextElement["align"]) || (el as TextElement).align,
      letterSpacing: t.charSpacing ?? (el as TextElement).letterSpacing,
      lineHeight: (t.lineHeight as number) ?? (el as TextElement).lineHeight,
      underline: !!t.underline,
      strikethrough: !!t.linethrough,
    } as Partial<TextElement>;
  }

  if (el.type === "image" && obj instanceof FabricImage) {
    const im = obj;
    const sx = im.scaleX || 1;
    const sy = im.scaleY || 1;
    const iw = im.width || 1;
    const ih = im.height || 1;
    const nw = Math.max(16, iw * sx);
    const nh = Math.max(16, ih * sy);
    return {
      x: (im.left ?? el.x) - scenePad,
      y: (im.top ?? el.y) - scenePad,
      width: nw,
      height: nh,
      rotation: im.angle ?? 0,
      opacity: im.opacity ?? 1,
    } as Partial<ImageElement>;
  }

  if (el.type === "shape") {
    const o = obj;
    if (o instanceof Circle) {
      const c = o;
      const sc = c.scaleX || 1;
      const nr = Math.max(8, (c.radius || 0) * sc);
      const sh = el as ShapeElement;
      const side = nr * 2;
      return {
        x: (c.left ?? 0) - nr - scenePad,
        y: (c.top ?? 0) - nr - scenePad,
        width: side,
        height: side,
        rotation: c.angle ?? 0,
        opacity: c.opacity ?? 1,
        fill: (c.fill as string) || sh.fill,
        stroke: (c.stroke as string) || sh.stroke,
        strokeWidth: c.strokeWidth ?? sh.strokeWidth,
      } as Partial<ShapeElement>;
    }
    const sx = Math.abs(o.scaleX || 1);
    const sy = Math.abs(o.scaleY || 1);
    const baseW = (o.width || (el as ShapeElement).width) * sx;
    const baseH = (o.height || (el as ShapeElement).height) * sy;
    const nw = Math.max(16, baseW);
    const nh = Math.max(16, baseH);
    const sh = el as ShapeElement;
    return {
      x: (o.left ?? el.x) - scenePad,
      y: (o.top ?? el.y) - scenePad,
      width: nw,
      height: nh,
      rotation: o.angle ?? 0,
      opacity: o.opacity ?? 1,
      fill: (o.fill as string) || sh.fill,
      stroke: (o.stroke as string) || sh.stroke,
      strokeWidth: o.strokeWidth ?? sh.strokeWidth,
    } as Partial<ShapeElement>;
  }

  return {};
}
