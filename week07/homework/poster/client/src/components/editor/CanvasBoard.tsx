import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Ellipse,
  Group,
  Image as KonvaImage,
  Layer,
  Line,
  Path,
  Rect,
  RegularPolygon,
  Stage,
  Star,
  Text,
  Transformer,
} from "react-konva";
import type Konva from "konva";
import { useCanvasImage } from "../../lib/useCanvasImage";
import { useEditorStore } from "../../stores/editorStore";
import type {
  CanvasElement,
  ImageElement,
  ShapeElement,
  TextElement,
} from "../../types/editor";
import { snapWithGuides } from "../../lib/snapGuides";

const PAD = 72;

function HeartShape({
  width,
  height,
  fill,
  stroke,
  strokeWidth,
}: {
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
}) {
  return (
    <Path
      x={0}
      y={0}
      data="M12,21.35l-1.45-1.32C5.4,15.36,2,12.28,2,8.5 C2,5.42,4.42,3,7.5,3c1.74,0,3.41,0.81,4.5,2.09C13.09,3.81,14.76,3,16.5,3 C19.58,3,22,5.42,22,8.5c0,3.78-3.4,6.86-8.55,11.54L12,21.35z"
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      scaleX={width / 24}
      scaleY={height / 24}
    />
  );
}

function ShapeDrawing({ el }: { el: ShapeElement }) {
  const w = el.width;
  const h = el.height;
  const sw = el.strokeWidth;
  const common = {
    fill: el.fill,
    stroke: el.stroke,
    strokeWidth: sw,
    shadowBlur: el.shadowEnabled ? el.shadowBlur : 0,
    shadowColor: el.shadowEnabled ? el.shadowColor : undefined,
    shadowEnabled: el.shadowEnabled,
  };

  switch (el.shapeKind) {
    case "rect":
      return <Rect x={0} y={0} width={w} height={h} cornerRadius={6} {...common} />;
    case "circle":
      return (
        <Ellipse x={w / 2} y={h / 2} radiusX={w / 2} radiusY={h / 2} {...common} />
      );
    case "triangle":
      return (
        <RegularPolygon
          x={w / 2}
          y={h / 2}
          sides={3}
          radius={Math.min(w, h) / 2}
          {...common}
        />
      );
    case "diamond":
      return (
        <RegularPolygon
          x={w / 2}
          y={h / 2}
          sides={4}
          radius={Math.min(w, h) / 2 * 0.9}
          rotation={45}
          {...common}
        />
      );
    case "pentagon":
      return (
        <RegularPolygon
          x={w / 2}
          y={h / 2}
          sides={5}
          radius={Math.min(w, h) / 2}
          {...common}
        />
      );
    case "hexagon":
      return (
        <RegularPolygon
          x={w / 2}
          y={h / 2}
          sides={6}
          radius={Math.min(w, h) / 2}
          {...common}
        />
      );
    case "star":
      return (
        <Star
          x={w / 2}
          y={h / 2}
          numPoints={5}
          innerRadius={Math.min(w, h) / 5}
          outerRadius={Math.min(w, h) / 2}
          {...common}
        />
      );
    case "heart":
      return <HeartShape width={w} height={h} fill={el.fill} stroke={el.stroke} strokeWidth={sw} />;
    default:
      return <Rect x={0} y={0} width={w} height={h} {...common} />;
  }
}

function KonvaImageNode({ el }: { el: ImageElement }) {
  const [img] = useCanvasImage(el.src);
  if (!img) {
    return (
      <Rect
        x={0}
        y={0}
        width={el.width}
        height={el.height}
        fill="#e2e8f0"
        cornerRadius={4}
      />
    );
  }
  return (
    <KonvaImage
      image={img}
      x={0}
      y={0}
      width={el.width}
      height={el.height}
      cornerRadius={4}
    />
  );
}

function TextDrawing({ el }: { el: TextElement }) {
  const deco: string[] = [];
  if (el.underline) deco.push("underline");
  if (el.strikethrough) deco.push("line-through");

  return (
    <Text
      x={0}
      y={0}
      width={el.width}
      height={el.height}
      text={el.text}
      fontFamily={el.fontFamily}
      fontSize={el.fontSize}
      fill={el.fill}
      fontStyle={`${el.fontWeight === "bold" ? "bold" : ""} ${el.fontStyle === "italic" ? "italic" : ""}`.trim() || "normal"}
      align={el.align}
      letterSpacing={el.letterSpacing}
      lineHeight={el.lineHeight}
      textDecoration={deco.join(" ")}
      opacity={el.opacity}
      shadowBlur={el.shadowEnabled ? el.shadowBlur : 0}
      shadowColor={el.shadowEnabled ? el.shadowColor : undefined}
      shadowEnabled={el.shadowEnabled}
      wrap="word"
    />
  );
}

export function CanvasBoard({
  onExportReady,
}: {
  onExportReady?: (fn: () => string | undefined) => void;
}) {
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const selectedRef = useRef<Konva.Group>(null);

  const historyGesture = useRef(false);

  const {
    elements,
    canvasWidth,
    canvasHeight,
    scale,
    bgMode,
    bgColor,
    bgImageSrc,
    selectedIds,
    placement,
    guideLines,
    setSelected,
    clearSelection,
    updateElement,
    setGuideLines,
    pushHistory,
    addTextAt,
    addShapeAt,
    addImageAt,
    setPlacement,
  } = useEditorStore();

  const [menu, setMenu] = useState<{ x: number; y: number; targetId: string } | null>(
    null,
  );
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  const [bgImg] = useCanvasImage(bgMode === "image" && bgImageSrc ? bgImageSrc : "");

  const sorted = useMemo(
    () => [...elements].sort((a, b) => a.zIndex - b.zIndex),
    [elements],
  );

  const selectedId = selectedIds[0] ?? null;

  useEffect(() => {
    if (!selectedRef.current || !trRef.current) return;
    trRef.current.nodes([selectedRef.current]);
    trRef.current.getLayer()?.batchDraw();
  }, [selectedId, sorted]);

  const beginHistory = useCallback(() => {
    if (!historyGesture.current) {
      pushHistory();
      historyGesture.current = true;
    }
  }, [pushHistory]);

  const endHistoryGesture = useCallback(() => {
    historyGesture.current = false;
  }, []);

  const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    setMenu(null);
    const target = e.target;
    const stage = target.getStage();
    if (!stage) return;

    if (target.name() === "editor-element") {
      return;
    }

    clearSelection();
    setEditingTextId(null);

    const pos = stage.getPointerPosition();
    if (!pos) return;

    const tx = (pos.x - PAD) / scale;
    const ty = (pos.y - PAD) / scale;

    if (placement.kind === "text") {
      beginHistory();
      addTextAt(tx, ty);
      endHistoryGesture();
      return;
    }
    if (placement.kind === "shape") {
      beginHistory();
      addShapeAt(placement.shapeKind, placement.category, tx, ty);
      endHistoryGesture();
      return;
    }
    if (placement.kind === "image") {
      beginHistory();
      addImageAt(placement.src, tx, ty);
      endHistoryGesture();
      return;
    }
  };

  const handleStageContextMenu = (e: Konva.KonvaEventObject<PointerEvent>) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos) return;

    const hit = [...sorted].reverse().find((el: CanvasElement) => {
      const nx = (pos.x - PAD) / scale;
      const ny = (pos.y - PAD) / scale;
      return (
        nx >= el.x &&
        nx <= el.x + el.width &&
        ny >= el.y &&
        ny <= el.y + el.height
      );
    });
    if (hit) {
      setSelected([hit.id]);
      setMenu({ x: e.evt.clientX, y: e.evt.clientY, targetId: hit.id });
    } else {
      setMenu(null);
    }
  };

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        setMenu(null);
        setEditingTextId(null);
        setPlacement({ kind: "idle" });
      }
      if ((ev.key === "Delete" || ev.key === "Backspace") && selectedId) {
        if (editingTextId) return;
        ev.preventDefault();
        useEditorStore.getState().deleteSelected();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, editingTextId, setPlacement]);

  const stageW = canvasWidth * scale + PAD * 2;
  const stageH = canvasHeight * scale + PAD * 2;

  useEffect(() => {
    onExportReady?.(() =>
      stageRef.current?.toDataURL({
        pixelRatio: 2,
        mimeType: "image/png",
        quality: 1,
      }),
    );
  }, [onExportReady, canvasWidth, canvasHeight, scale]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-slate-200">
      <div className="flex min-h-0 flex-1 items-start justify-center overflow-auto p-4">
        <Stage
          ref={stageRef}
          width={stageW}
          height={stageH}
          onMouseDown={handleStageMouseDown}
          onContextMenu={handleStageContextMenu}
        >
          <Layer>
            <Rect
              name="editor-mat"
              x={0}
              y={0}
              width={stageW}
              height={stageH}
              fill="#cbd5e1"
              cornerRadius={12}
            />
            <Group x={PAD} y={PAD} scaleX={scale} scaleY={scale}>
              <Rect
                name="editor-sheet"
                width={canvasWidth}
                height={canvasHeight}
                fill="#ffffff"
                shadowBlur={16}
                shadowColor="rgba(15,23,42,0.12)"
              />
              {bgMode === "image" && bgImg ? (
                <KonvaImage
                  image={bgImg}
                  x={0}
                  y={0}
                  width={canvasWidth}
                  height={canvasHeight}
                />
              ) : (
                <Rect width={canvasWidth} height={canvasHeight} fill={bgColor} />
              )}

              {sorted.map((el) => (
                <ElementNode
                  key={el.id}
                  el={el}
                  forwardedRef={el.id === selectedId ? selectedRef : undefined}
                  beginHistory={beginHistory}
                  onSelect={() => {
                    setSelected([el.id]);
                    setEditingTextId(null);
                  }}
                  onDoubleText={() => setEditingTextId(el.id)}
                  onDragMove={(node) => {
                    const cur = {
                      id: el.id,
                      x: node.x(),
                      y: node.y(),
                      width: el.width,
                      height: el.height,
                    };
                    const sn = snapWithGuides(
                      cur,
                      canvasWidth,
                      canvasHeight,
                      elements,
                    );
                    node.x(sn.x);
                    node.y(sn.y);
                    setGuideLines({
                      vertical: sn.vertical.map((v) => PAD + v * scale),
                      horizontal: sn.horizontal.map((h) => PAD + h * scale),
                    });
                  }}
                  onDragEnd={(node) => {
                    updateElement(el.id, { x: node.x(), y: node.y() });
                    setGuideLines({ vertical: [], horizontal: [] });
                    endHistoryGesture();
                  }}
                  onTransformEnd={(node) => {
                    const sx = node.scaleX();
                    const sy = node.scaleY();
                    node.scaleX(1);
                    node.scaleY(1);
                    const newW = Math.max(16, el.width * sx);
                    const newH = Math.max(16, el.height * sy);
                    updateElement(el.id, {
                      x: node.x(),
                      y: node.y(),
                      width: newW,
                      height: newH,
                      rotation: node.rotation(),
                    });
                    endHistoryGesture();
                  }}
                  onTransformStart={() => {
                    beginHistory();
                  }}
                />
              ))}

              <Transformer
                ref={trRef}
                rotateEnabled
                borderDash={[6, 3]}
                anchorStroke="#2563eb"
                anchorFill="#fff"
                anchorSize={10}
                boundBoxFunc={(oldBox, newBox) => {
                  if (newBox.width < 12 || newBox.height < 12) return oldBox;
                  return newBox;
                }}
              />
            </Group>

            {guideLines.vertical.map((gx, i) => (
              <Line
                key={`v-${i}`}
                points={[gx, 0, gx, stageH]}
                stroke="#f97316"
                strokeWidth={1}
                dash={[6, 6]}
                listening={false}
              />
            ))}
            {guideLines.horizontal.map((gy, i) => (
              <Line
                key={`h-${i}`}
                points={[0, gy, stageW, gy]}
                stroke="#f97316"
                strokeWidth={1}
                dash={[6, 6]}
                listening={false}
              />
            ))}
          </Layer>
        </Stage>
      </div>

      {editingTextId ? (
        <TextEditorOverlay
          textId={editingTextId}
          onClose={() => setEditingTextId(null)}
          stageRef={stageRef}
          pad={PAD}
          scale={scale}
        />
      ) : null}

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
              setSelected([menu.targetId]);
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
              setSelected([menu.targetId]);
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
              setSelected([menu.targetId]);
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
              setSelected([menu.targetId]);
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

function ElementNode({
  el,
  forwardedRef,
  beginHistory,
  onSelect,
  onDoubleText,
  onDragMove,
  onDragEnd,
  onTransformEnd,
  onTransformStart,
}: {
  el: CanvasElement;
  forwardedRef?: React.RefObject<Konva.Group | null>;
  beginHistory: () => void;
  onSelect: () => void;
  onDoubleText?: () => void;
  onDragMove: (node: Konva.Group) => void;
  onDragEnd: (node: Konva.Group) => void;
  onTransformEnd: (node: Konva.Group) => void;
  onTransformStart: () => void;
}) {
  return (
    <Group
      name="editor-element"
      ref={forwardedRef}
      x={el.x}
      y={el.y}
      rotation={el.rotation}
      opacity={el.opacity}
      draggable
      onMouseDown={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onDragStart={() => {
        beginHistory();
      }}
      onDragMove={(e) => {
        onDragMove(e.target as Konva.Group);
      }}
      onDragEnd={(e) => {
        onDragEnd(e.target as Konva.Group);
      }}
      onTransformStart={() => {
        onTransformStart();
      }}
      onTransformEnd={(e) => {
        onTransformEnd(e.target as Konva.Group);
      }}
      onDblClick={(e) => {
        e.cancelBubble = true;
        if (el.type === "text") onDoubleText?.();
      }}
    >
      {el.type === "text" ? (
        <TextDrawing el={el} />
      ) : el.type === "shape" ? (
        <ShapeDrawing el={el} />
      ) : (
        <KonvaImageNode el={el} />
      )}
    </Group>
  );
}

function TextEditorOverlay({
  textId,
  onClose,
  stageRef,
  pad,
  scale,
}: {
  textId: string;
  onClose: () => void;
  stageRef: React.RefObject<Konva.Stage | null>;
  pad: number;
  scale: number;
}) {
  const el = useEditorStore((s) => s.elements.find((e) => e.id === textId && e.type === "text")) as
    | TextElement
    | undefined;
  const updateElement = useEditorStore((s) => s.updateElement);

  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    taRef.current?.focus();
    taRef.current?.select();
  }, [textId]);

  if (!el) return null;

  const stage = stageRef.current;
  const container = stage?.container();
  const box = container?.getBoundingClientRect();
  if (!box || !stage) return null;

  const screenX = box.left + pad + el.x * scale;
  const screenY = box.top + pad + el.y * scale;

  return (
    <textarea
      ref={taRef}
      className="fixed z-40 resize-none rounded-md border-2 border-brand-blue bg-white/95 p-2 text-slate-900 shadow-lg outline-none"
      style={{
        left: screenX,
        top: screenY,
        width: Math.max(160, el.width * scale),
        minHeight: Math.max(48, el.fontSize * el.lineHeight * 2),
        fontFamily: el.fontFamily,
        fontSize: el.fontSize * scale,
        fontWeight: el.fontWeight,
        fontStyle: el.fontStyle,
        color: el.fill,
        textAlign: el.align,
        letterSpacing: el.letterSpacing * scale,
        lineHeight: el.lineHeight,
      }}
      value={el.text}
      onChange={(e) => updateElement(el.id, { text: e.target.value })}
      onBlur={onClose}
    />
  );
}
