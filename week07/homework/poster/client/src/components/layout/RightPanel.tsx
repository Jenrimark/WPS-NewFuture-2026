import { useElementStore } from '@/store/element-store'
import CanvasProperties from '@/components/properties/CanvasProperties'
import TextProperties from '@/components/properties/TextProperties'
import ShapeProperties from '@/components/properties/ShapeProperties'
import ImageProperties from '@/components/properties/ImageProperties'
import { Type, Square, Image } from 'lucide-react'

export default function RightPanel() {
  const { elements, selectedId, updateElement } = useElementStore()
  const selected = selectedId ? elements.find((e) => e.id === selectedId) : null

  const handleChange = (updates: Record<string, unknown>) => {
    if (selectedId) updateElement(selectedId, updates)
  }

  const getTypeLabel = () => {
    if (!selected) return '画布'
    switch (selected.type) {
      case 'text': return '文本'
      case 'shape': return '形状'
      case 'image': return '图片'
    }
  }

  const getTypeIcon = () => {
    if (!selected) return null
    switch (selected.type) {
      case 'text': return <Type className="w-3.5 h-3.5" />
      case 'shape': return <Square className="w-3.5 h-3.5" />
      case 'image': return <Image className="w-3.5 h-3.5" />
    }
  }

  return (
    <aside className="w-64 border-l border-border bg-card flex flex-col shrink-0 overflow-hidden">
      <div className="h-10 border-b border-border flex items-center gap-1.5 px-3 shrink-0">
        {getTypeIcon()}
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {getTypeLabel()}属性
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {!selected && <CanvasProperties />}
        {selected?.type === 'text' && (
          <TextProperties element={selected} onChange={handleChange} />
        )}
        {selected?.type === 'shape' && (
          <ShapeProperties element={selected} onChange={handleChange} />
        )}
        {selected?.type === 'image' && (
          <ImageProperties element={selected} onChange={handleChange} />
        )}
      </div>
    </aside>
  )
}
