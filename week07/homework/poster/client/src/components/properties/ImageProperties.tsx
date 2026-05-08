import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import type { PosterElement } from '@/types'

interface Props {
  element: PosterElement
  onChange: (updates: Partial<PosterElement>) => void
}

export default function ImageProperties({ element, onChange }: Props) {
  const updateFabric = (updates: Partial<PosterElement>) => {
    onChange(updates)
    const fn = (window as unknown as Record<string, unknown>).__updateFabricObject as
      | ((id: string, updates: Partial<PosterElement>) => void)
      | undefined
    if (fn) fn(element.id, updates)
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        图片尺寸: {Math.round(element.width)} × {Math.round(element.height)}px
      </p>

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

      <Separator />

      {/* Rotation */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">旋转: {Math.round(element.rotation ?? 0)}°</Label>
        <Slider
          value={[element.rotation ?? 0]}
          min={-180}
          max={180}
          step={1}
          onValueChange={(v) => { const val = Array.isArray(v) ? v[0] : v; updateFabric({ rotation: val }) }}
        />
      </div>
    </div>
  )
}
