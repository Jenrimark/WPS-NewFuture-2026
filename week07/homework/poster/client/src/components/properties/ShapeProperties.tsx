import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import type { PosterElement } from '@/types'

interface Props {
  element: PosterElement
  onChange: (updates: Partial<PosterElement>) => void
}

export default function ShapeProperties({ element, onChange }: Props) {
  const updateFabric = (updates: Partial<PosterElement>) => {
    onChange(updates)
    const fn = (window as unknown as Record<string, unknown>).__updateFabricObject as
      | ((id: string, updates: Partial<PosterElement>) => void)
      | undefined
    if (fn) fn(element.id, updates)
  }

  return (
    <div className="space-y-4">
      {/* Fill color */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">背景色</Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={element.fill || '#6366f1'}
            onChange={(e) => updateFabric({ fill: e.target.value })}
            className="w-8 h-8 rounded border border-border cursor-pointer"
          />
          <Input
            value={element.fill || '#6366f1'}
            onChange={(e) => updateFabric({ fill: e.target.value })}
            className="h-8 text-xs font-mono"
          />
        </div>
      </div>

      {/* Stroke */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">描边颜色</Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={element.stroke || '#4f46e5'}
            onChange={(e) => updateFabric({ stroke: e.target.value })}
            className="w-8 h-8 rounded border border-border cursor-pointer"
          />
          <Input
            value={element.stroke || '#4f46e5'}
            onChange={(e) => updateFabric({ stroke: e.target.value })}
            className="h-8 text-xs font-mono"
          />
        </div>
      </div>

      {/* Stroke width */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">描边宽度: {element.strokeWidth ?? 2}px</Label>
        <Slider
          value={[element.strokeWidth ?? 2]}
          min={0}
          max={20}
          step={1}
          onValueChange={(v) => { const val = Array.isArray(v) ? v[0] : v; updateFabric({ strokeWidth: val }) }}
        />
      </div>

      <Separator />

      {/* Opacity */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">透明度: {Math.round((element.opacity ?? 1) * 100)}%</Label>
        <Slider
          value={[element.opacity ?? 1]}
          min={0}
          max={1}
          step={0.01}
          onValueChange={(v) => { const val = Array.isArray(v) ? v[0] : v; updateFabric({ opacity: val }) }}
        />
      </div>
    </div>
  )
}
