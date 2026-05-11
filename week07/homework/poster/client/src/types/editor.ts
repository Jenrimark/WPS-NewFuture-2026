export type AlignType = "left" | "center" | "right";

export type ShapeCategory = "basic" | "festival" | "other";

export type ShapeKind =
  | "rect"
  | "circle"
  | "triangle"
  | "star"
  | "pentagon"
  | "hexagon"
  | "diamond"
  | "heart";

export interface BaseElement {
  id: string;
  type: "text" | "shape" | "image";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  zIndex: number;
}

export interface TextElement extends BaseElement {
  type: "text";
  text: string;
  fontFamily: string;
  fontSize: number;
  fill: string;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  underline: boolean;
  strikethrough: boolean;
  align: AlignType;
  letterSpacing: number;
  lineHeight: number;
  shadowEnabled: boolean;
  shadowBlur: number;
  shadowColor: string;
}

export interface ShapeElement extends BaseElement {
  type: "shape";
  shapeKind: ShapeKind;
  fill: string;
  stroke: string;
  strokeWidth: number;
  shadowEnabled: boolean;
  shadowBlur: number;
  shadowColor: string;
}

export interface ImageElement extends BaseElement {
  type: "image";
  src: string;
  naturalWidth?: number;
  naturalHeight?: number;
}

export type CanvasElement = TextElement | ShapeElement | ImageElement;

export type BgMode = "solid" | "image";

export interface EditorSnapshot {
  elements: CanvasElement[];
  canvasWidth: number;
  canvasHeight: number;
  lockAspect: boolean;
  aspectRatio: number;
  bgMode: BgMode;
  bgColor: string;
  bgImageSrc: string | null;
}

export type PlacementMode =
  | { kind: "idle" }
  | { kind: "text" }
  | { kind: "shape"; shapeKind: ShapeKind; category: ShapeCategory }
  | { kind: "image"; src: string };
