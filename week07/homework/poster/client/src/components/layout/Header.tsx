import { Button } from '@/components/ui/button'
import { Undo2, Redo2, Download, LogOut, Pencil } from 'lucide-react'
import { useHistoryStore } from '@/store/history-store'
import { useElementStore } from '@/store/element-store'
import { useCanvasStore } from '@/store/canvas-store'

interface HeaderProps {
  onLogout: () => void
}

export default function Header({ onLogout }: HeaderProps) {
  const { undo, redo } = useHistoryStore()
  const canUndo = useHistoryStore((s) => s.past.length > 0)
  const canRedo = useHistoryStore((s) => s.future.length > 0)
  const { elements, setElements } = useElementStore()
  const canvasStore = useCanvasStore()

  const getSnapshot = () => ({
    elements: [...elements],
    canvasConfig: {
      width: canvasStore.width,
      height: canvasStore.height,
      backgroundColor: canvasStore.backgroundColor,
      backgroundImage: canvasStore.backgroundImage,
    },
  })

  const handleUndo = () => {
    const current = getSnapshot()
    const prev = undo(current)
    if (prev) {
      setElements(prev.elements)
      canvasStore.setBackgroundColor(prev.canvasConfig.backgroundColor)
      canvasStore.setSize(prev.canvasConfig.width, prev.canvasConfig.height)
      // Restore fabric canvas objects
      const getCanvas = (window as unknown as Record<string, unknown>).__getFabricCanvas as (() => unknown) | undefined
      const fc = getCanvas?.() as { clear: () => void; backgroundColor: string; setDimensions: (d: { width: number; height: number }) => void; renderAll: () => void } | undefined
      if (fc) {
        fc.clear()
        fc.backgroundColor = prev.canvasConfig.backgroundColor
        fc.setDimensions({ width: prev.canvasConfig.width, height: prev.canvasConfig.height })
        fc.renderAll()
      }
    }
  }

  const handleRedo = () => {
    const current = getSnapshot()
    const next = redo(current)
    if (next) {
      setElements(next.elements)
      canvasStore.setBackgroundColor(next.canvasConfig.backgroundColor)
      canvasStore.setSize(next.canvasConfig.width, next.canvasConfig.height)
    }
  }

  const handleExport = () => {
    const getCanvas = (window as unknown as Record<string, unknown>).__getFabricCanvas as (() => unknown) | undefined
    const fc = getCanvas?.() as { toDataURL: (opts: { format: string; multiplier: number }) => string } | undefined
    if (!fc) return
    const dataURL = fc.toDataURL({ format: 'png', multiplier: 2 })
    const link = document.createElement('a')
    link.download = 'linxcraft-poster.png'
    link.href = dataURL
    link.click()
  }

  return (
    <header className="h-12 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
      {/* Left: Logo + Title */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
          <Pencil className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="text-sm font-semibold tracking-tight">灵犀工坊</span>
      </div>

      {/* Center: Undo / Redo */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          disabled={!canUndo}
          onClick={handleUndo}
          title="撤销 (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          disabled={!canRedo}
          onClick={handleRedo}
          title="重做 (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Right: Download + Logout */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={handleExport}>
          <Download className="w-4 h-4" />
          <span className="text-xs">下载</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={onLogout} className="gap-1.5">
          <LogOut className="w-4 h-4" />
          <span className="text-xs">退出</span>
        </Button>
      </div>
    </header>
  )
}
