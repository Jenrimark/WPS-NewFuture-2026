import { useEffect, useRef, useCallback } from 'react'
import * as fabric from 'fabric'
import { useCanvasStore } from '@/store/canvas-store'
import { useElementStore } from '@/store/element-store'
import { useHistoryStore } from '@/store/history-store'
import type { PosterElement } from '@/types'
import { v4 as uuidv4 } from 'uuid'

export default function FabricCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<fabric.Canvas | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const { width, height, backgroundColor, zoom } = useCanvasStore()
  const { elements, addElement, updateElement, selectElement } = useElementStore()
  const { pushSnapshot } = useHistoryStore()

  // Initialize Fabric canvas
  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = new fabric.Canvas(canvasRef.current, {
      width,
      height,
      backgroundColor,
      selection: true,
      preserveObjectStacking: true,
    })

    fabricRef.current = canvas

    // Selection events
    canvas.on('selection:created', (e) => {
      const obj = e.selected?.[0] as fabric.FabricObject & { id?: string }
      if (obj?.id) selectElement(obj.id)
    })

    canvas.on('selection:updated', (e) => {
      const obj = e.selected?.[0] as fabric.FabricObject & { id?: string }
      if (obj?.id) selectElement(obj.id)
    })

    canvas.on('selection:cleared', () => {
      selectElement(null)
    })

    // Object modified → sync back to store
    canvas.on('object:modified', (e) => {
      const obj = e.target as fabric.FabricObject & { id?: string }
      if (!obj?.id) return
      syncObjectToStore(obj)
      pushSnapshot({
        elements: useElementStore.getState().elements,
        canvasConfig: {
          width: useCanvasStore.getState().width,
          height: useCanvasStore.getState().height,
          backgroundColor: useCanvasStore.getState().backgroundColor,
          backgroundImage: useCanvasStore.getState().backgroundImage,
        },
      })
    })

    return () => {
      canvas.dispose()
      fabricRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync canvas size & background
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return
    canvas.setDimensions({ width, height })
    canvas.backgroundColor = backgroundColor
    canvas.renderAll()
  }, [width, height, backgroundColor])

  // Sync zoom
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return
    // We don't use fabric zoom — we CSS transform the container
  }, [zoom])

  const syncObjectToStore = useCallback((obj: fabric.FabricObject) => {
    const id = (obj as fabric.FabricObject & { id?: string }).id
    if (!id) return
    updateElement(id, {
      x: obj.left ?? 0,
      y: obj.top ?? 0,
      width: (obj.width ?? 0) * (obj.scaleX ?? 1),
      height: (obj.height ?? 0) * (obj.scaleY ?? 1),
      rotation: obj.angle ?? 0,
      opacity: obj.opacity ?? 1,
    })
  }, [updateElement])

  // Add text element to canvas
  const addTextToCanvas = useCallback((text: string, options?: Record<string, unknown>) => {
    const canvas = fabricRef.current
    if (!canvas) return

    const id = uuidv4()
    const textObj = new fabric.IText(text, {
      left: width / 2 - 75,
      top: height / 2 - 20,
      fontFamily: 'Arial',
      fontSize: 24,
      fill: '#1e1b4b',
      id,
      ...options,
    })

    canvas.add(textObj)
    canvas.setActiveObject(textObj)
    canvas.renderAll()

    const el: PosterElement = {
      id,
      type: 'text',
      x: textObj.left ?? 0,
      y: textObj.top ?? 0,
      width: textObj.width ?? 150,
      height: textObj.height ?? 40,
      rotation: 0,
      opacity: 1,
      text,
      fontFamily: 'Arial',
      fontSize: 24,
      fontWeight: 'normal',
      fontStyle: 'normal',
      underline: false,
      linethrough: false,
      textAlign: 'left',
      letterSpacing: 0,
      lineHeight: 1.2,
      textColor: '#1e1b4b',
    }

    addElement(el)
    pushSnapshot({
      elements: [...elements, el],
      canvasConfig: { width, height, backgroundColor, backgroundImage: useCanvasStore.getState().backgroundImage },
    })
  }, [width, height, backgroundColor, elements, addElement, pushSnapshot])

  // Add shape to canvas
  const addShapeToCanvas = useCallback((shapeType: string, svgContent?: string) => {
    const canvas = fabricRef.current
    if (!canvas) return

    const id = uuidv4()
    let shape: fabric.FabricObject

    const common = {
      left: width / 2 - 50,
      top: height / 2 - 50,
      fill: '#6366f1',
      stroke: '#4f46e5',
      strokeWidth: 2,
      id,
    }

    switch (shapeType) {
      case 'rect':
        shape = new fabric.Rect({ ...common, width: 100, height: 100, rx: 4, ry: 4 })
        break
      case 'circle':
        shape = new fabric.Circle({ ...common, radius: 50 })
        break
      case 'triangle':
        shape = new fabric.Triangle({ ...common, width: 100, height: 100 })
        break
      default:
        // SVG shape
        if (svgContent) {
          const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${svgContent}</svg>`
          fabric.loadSVGFromString(fullSvg).then((result) => {
            const obj = fabric.util.groupSVGElements(result.objects as fabric.FabricObject[], result.options)
            obj.set({ ...common, scaleX: 3, scaleY: 3 })
            ;(obj as fabric.FabricObject & { id: string }).id = id
            canvas.add(obj)
            canvas.setActiveObject(obj)
            canvas.renderAll()

            const el: PosterElement = {
              id,
              type: 'shape',
              x: obj.left ?? 0,
              y: obj.top ?? 0,
              width: (obj.width ?? 100) * 3,
              height: (obj.height ?? 100) * 3,
              rotation: 0,
              opacity: 1,
              fill: '#6366f1',
              stroke: '#4f46e5',
              strokeWidth: 2,
              shapeType,
              shapeCategory: 'basic',
            }
            addElement(el)
          })
          return
        }
        shape = new fabric.Rect({ ...common, width: 100, height: 100 })
    }

    canvas.add(shape)
    canvas.setActiveObject(shape)
    canvas.renderAll()

    const el: PosterElement = {
      id,
      type: 'shape',
      x: shape.left ?? 0,
      y: shape.top ?? 0,
      width: shapeType === 'circle' ? 100 : (shape.width ?? 100),
      height: shapeType === 'circle' ? 100 : (shape.height ?? 100),
      rotation: 0,
      opacity: 1,
      fill: '#6366f1',
      stroke: '#4f46e5',
      strokeWidth: 2,
      shapeType,
      shapeCategory: 'basic',
    }
    addElement(el)
    pushSnapshot({
      elements: [...elements, el],
      canvasConfig: { width, height, backgroundColor, backgroundImage: useCanvasStore.getState().backgroundImage },
    })
  }, [width, height, backgroundColor, elements, addElement, pushSnapshot])

  // Add image to canvas
  const addImageToCanvas = useCallback((src: string) => {
    const canvas = fabricRef.current
    if (!canvas) return

    const id = uuidv4()
    const imgEl = new Image()
    imgEl.crossOrigin = 'anonymous'
    imgEl.onload = () => {
      const img = new fabric.FabricImage(imgEl, {
        left: width / 2 - 100,
        top: height / 2 - 75,
        scaleX: 200 / imgEl.width,
        scaleY: 150 / imgEl.height,
        id,
      })
      canvas.add(img)
      canvas.setActiveObject(img)
      canvas.renderAll()

      const el: PosterElement = {
        id,
        type: 'image',
        x: img.left ?? 0,
        y: img.top ?? 0,
        width: 200,
        height: 150,
        rotation: 0,
        opacity: 1,
        src,
      }
      addElement(el)
    }
    imgEl.src = src
  }, [width, height, addElement])

  // Update fabric object property when store changes
  const updateFabricObject = useCallback((id: string, updates: Partial<PosterElement>) => {
    const canvas = fabricRef.current
    if (!canvas) return

    const obj = canvas.getObjects().find((o) => (o as fabric.FabricObject & { id?: string }).id === id)
    if (!obj) return

    if (updates.textColor !== undefined && obj instanceof fabric.IText) {
      obj.set('fill', updates.textColor)
    }
    if (updates.fontFamily !== undefined && obj instanceof fabric.IText) {
      obj.set('fontFamily', updates.fontFamily)
    }
    if (updates.fontSize !== undefined && obj instanceof fabric.IText) {
      obj.set('fontSize', updates.fontSize)
    }
    if (updates.fontWeight !== undefined && obj instanceof fabric.IText) {
      obj.set('fontWeight', updates.fontWeight)
    }
    if (updates.fontStyle !== undefined && obj instanceof fabric.IText) {
      obj.set('fontStyle', updates.fontStyle)
    }
    if (updates.underline !== undefined && obj instanceof fabric.IText) {
      obj.set('underline', updates.underline)
    }
    if (updates.linethrough !== undefined && obj instanceof fabric.IText) {
      obj.set('linethrough', updates.linethrough)
    }
    if (updates.textAlign !== undefined && obj instanceof fabric.IText) {
      obj.set('textAlign', updates.textAlign)
    }
    if (updates.letterSpacing !== undefined && obj instanceof fabric.IText) {
      obj.set('charSpacing', updates.letterSpacing * 1000)
    }
    if (updates.lineHeight !== undefined && obj instanceof fabric.IText) {
      obj.set('lineHeight', updates.lineHeight)
    }
    if (updates.fill !== undefined) {
      obj.set('fill', updates.fill)
    }
    if (updates.stroke !== undefined) {
      obj.set('stroke', updates.stroke)
    }
    if (updates.strokeWidth !== undefined) {
      obj.set('strokeWidth', updates.strokeWidth)
    }
    if (updates.opacity !== undefined) {
      obj.set('opacity', updates.opacity)
    }
    if (updates.rotation !== undefined) {
      obj.set('angle', updates.rotation)
    }

    canvas.renderAll()
  }, [])

  // Expose methods via window for other components to use
  useEffect(() => {
    const win = window as unknown as Record<string, unknown>
    win.__fabricCanvas = fabricRef
    win.__addTextToCanvas = addTextToCanvas
    win.__addShapeToCanvas = addShapeToCanvas
    win.__addImageToCanvas = addImageToCanvas
    win.__updateFabricObject = updateFabricObject
    win.__getFabricCanvas = () => fabricRef.current

    return () => {
      delete win.__fabricCanvas
      delete win.__addTextToCanvas
      delete win.__addShapeToCanvas
      delete win.__addImageToCanvas
      delete win.__updateFabricObject
      delete win.__getFabricCanvas
    }
  }, [addTextToCanvas, addShapeToCanvas, addImageToCanvas, updateFabricObject])

  return (
    <div
      ref={containerRef}
      className="inline-block shadow-lg"
      style={{
        transform: `scale(${zoom})`,
        transformOrigin: 'center center',
      }}
    >
      <canvas ref={canvasRef} />
    </div>
  )
}
