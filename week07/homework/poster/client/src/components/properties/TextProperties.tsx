import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Toggle } from '@/components/ui/toggle'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight } from 'lucide-react'
import type { PosterElement } from '@/types'

interface Props {
  element: PosterElement
  onChange: (updates: Partial<PosterElement>) => void
}

const FONTS = [
  'Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Courier New',
  'Verdana', 'Trebuchet MS', 'Impact', 'Comic Sans MS',
]

export default function TextProperties({ element, onChange }: Props) {
  const updateFabric = (updates: Partial<PosterElement>) => {
    onChange(updates)
    const fn = (window as unknown as Record<string, unknown>).__updateFabricObject as
      | ((id: string, updates: Partial<PosterElement>) => void)
      | undefined
    if (fn) fn(element.id, updates)
  }

  return (
    <div className="space-y-4">
      {/* Font */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">字体</Label>
        <Select value={element.fontFamily ?? 'Arial'} onValueChange={(v) => updateFabric({ fontFamily: v ?? undefined })}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONTS.map((f) => (
              <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Font size */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">字号</Label>
        <Input
          type="number"
          value={element.fontSize}
          onChange={(e) => updateFabric({ fontSize: Number(e.target.value) })}
          className="h-8 text-xs"
        />
      </div>

      {/* Color */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">文字颜色</Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={element.textColor}
            onChange={(e) => updateFabric({ textColor: e.target.value })}
            className="w-8 h-8 rounded border border-border cursor-pointer"
          />
          <Input
            value={element.textColor}
            onChange={(e) => updateFabric({ textColor: e.target.value })}
            className="h-8 text-xs font-mono"
          />
        </div>
      </div>

      <Separator />

      {/* Style toggles */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">样式</Label>
        <div className="flex gap-1">
          <Toggle
            size="sm"
            pressed={element.fontWeight === 'bold'}
            onPressedChange={(p) => updateFabric({ fontWeight: p ? 'bold' : 'normal' })}
          >
            <Bold className="w-3.5 h-3.5" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={element.fontStyle === 'italic'}
            onPressedChange={(p) => updateFabric({ fontStyle: p ? 'italic' : 'normal' })}
          >
            <Italic className="w-3.5 h-3.5" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={element.underline}
            onPressedChange={(p) => updateFabric({ underline: p })}
          >
            <Underline className="w-3.5 h-3.5" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={element.linethrough}
            onPressedChange={(p) => updateFabric({ linethrough: p })}
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </Toggle>
        </div>
      </div>

      {/* Alignment */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">对齐</Label>
        <div className="flex gap-1">
          {[
            { value: 'left', icon: AlignLeft },
            { value: 'center', icon: AlignCenter },
            { value: 'right', icon: AlignRight },
          ].map(({ value, icon: Icon }) => (
            <Toggle
              key={value}
              size="sm"
              pressed={element.textAlign === value}
              onPressedChange={() => updateFabric({ textAlign: value as 'left' | 'center' | 'right' })}
            >
              <Icon className="w-3.5 h-3.5" />
            </Toggle>
          ))}
        </div>
      </div>

      <Separator />

      {/* Letter spacing */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">字间距: {element.letterSpacing}px</Label>
        <Slider
          value={[element.letterSpacing ?? 0]}
          min={-5}
          max={20}
          step={0.5}
          onValueChange={(v) => { const val = Array.isArray(v) ? v[0] : v; updateFabric({ letterSpacing: val }) }}
        />
      </div>

      {/* Line height */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">行间距: {element.lineHeight}</Label>
        <Slider
          value={[element.lineHeight ?? 1.2]}
          min={0.5}
          max={3}
          step={0.1}
          onValueChange={(v) => { const val = Array.isArray(v) ? v[0] : v; updateFabric({ lineHeight: val }) }}
        />
      </div>

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
