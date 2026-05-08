import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCanvasStore } from '@/store/canvas-store'
import FabricCanvas from '@/components/canvas/FabricCanvas'

export default function CanvasArea() {
  const { zoom, setZoom } = useCanvasStore()

  const zoomIn = () => setZoom(Math.min(5, zoom + 0.1))
  const zoomOut = () => setZoom(Math.max(0.1, zoom - 0.1))
  const zoomPercent = Math.round(zoom * 100)

  return (
    <main className="flex-1 flex flex-col overflow-hidden bg-muted/30">
      {/* Canvas viewport */}
      <div className="flex-1 flex items-center justify-center overflow-auto p-8">
        <FabricCanvas />
      </div>

      {/* Zoom controls */}
      <div className="h-10 border-t border-border bg-card flex items-center justify-center gap-2 shrink-0">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomOut}>
          <Minus className="w-3.5 h-3.5" />
        </Button>
        <Input
          className="w-14 h-7 text-center text-xs"
          value={zoomPercent}
          onChange={(e) => {
            const v = parseInt(e.target.value)
            if (!isNaN(v)) setZoom(v / 100)
          }}
        />
        <span className="text-xs text-muted-foreground">%</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomIn}>
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>
    </main>
  )
}
