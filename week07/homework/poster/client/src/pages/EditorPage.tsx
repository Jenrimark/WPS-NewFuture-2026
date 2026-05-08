import Header from '@/components/layout/Header'
import LeftPanel from '@/components/layout/LeftPanel'
import CanvasArea from '@/components/layout/CanvasArea'
import RightPanel from '@/components/layout/RightPanel'
import ContextMenu from '@/components/shared/ContextMenu'
import { useElementStore } from '@/store/element-store'

interface EditorPageProps {
  onLogout: () => void
}

export default function EditorPage({ onLogout }: EditorPageProps) {
  const { selectedId, moveLayerUp, moveLayerDown, moveToTop, moveToBottom, removeElement } = useElementStore()

  const handleContextAction = (action: string) => {
    if (!selectedId) return
    switch (action) {
      case 'moveUp': moveLayerUp(selectedId); break
      case 'moveDown': moveLayerDown(selectedId); break
      case 'moveToTop': moveToTop(selectedId); break
      case 'moveToBottom': moveToBottom(selectedId); break
      case 'delete': removeElement(selectedId); break
      case 'alignH': {
        const getCanvas = (window as unknown as Record<string, unknown>).__getFabricCanvas as (() => unknown) | undefined
        const canvas = getCanvas?.() as { width: number; getObjects: () => Array<{ id?: string; set: (p: Record<string, unknown>) => void; width: number; scaleX: number; setCoords: () => void }>; renderAll: () => void } | undefined
        if (canvas) {
          const obj = canvas.getObjects().find((o) => o.id === selectedId)
          if (obj) {
            obj.set({ left: canvas.width / 2 - (obj.width * (obj.scaleX || 1)) / 2 })
            obj.setCoords()
            canvas.renderAll()
          }
        }
        break
      }
      case 'alignV': {
        const getCanvas = (window as unknown as Record<string, unknown>).__getFabricCanvas as (() => unknown) | undefined
        const canvas = getCanvas?.() as { height: number; getObjects: () => Array<{ id?: string; set: (p: Record<string, unknown>) => void; height: number; scaleY: number; setCoords: () => void }>; renderAll: () => void } | undefined
        if (canvas) {
          const obj = canvas.getObjects().find((o) => o.id === selectedId)
          if (obj) {
            obj.set({ top: canvas.height / 2 - (obj.height * (obj.scaleY || 1)) / 2 })
            obj.setCoords()
            canvas.renderAll()
          }
        }
        break
      }
      case 'copy': {
        const getCanvas = (window as unknown as Record<string, unknown>).__getFabricCanvas as (() => unknown) | undefined
        const canvas = getCanvas?.() as { getObjects: () => Array<{ id?: string; clone: (cb: (cloned: { set: (p: Record<string, unknown>) => void }) => void) => void; left: number; top: number }>; add: (obj: unknown) => void; renderAll: () => void } | undefined
        if (canvas) {
          const obj = canvas.getObjects().find((o) => o.id === selectedId)
          if (obj) {
            obj.clone((cloned) => {
              cloned.set({ left: (obj.left || 0) + 20, top: (obj.top || 0) + 20 })
              canvas.add(cloned)
              canvas.renderAll()
            })
          }
        }
        break
      }
    }
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Header onLogout={onLogout} />
      <div className="flex flex-1 overflow-hidden">
        <LeftPanel />
        <CanvasArea />
        <RightPanel />
      </div>
      <ContextMenu onAction={handleContextAction} />
    </div>
  )
}
