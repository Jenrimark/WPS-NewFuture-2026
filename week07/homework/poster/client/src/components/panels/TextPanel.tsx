import { Type, Plus } from 'lucide-react'

const presets = [
  { label: '主标题', fontSize: 36, fontWeight: 'bold' as const },
  { label: '副标题', fontSize: 24, fontWeight: '600' as const },
  { label: '正文', fontSize: 16, fontWeight: 'normal' as const },
  { label: '注释', fontSize: 12, fontWeight: 'normal' as const },
]

export default function TextPanel() {
  const handleAdd = (preset: typeof presets[number]) => {
    const addFn = (window as unknown as Record<string, unknown>).__addTextToCanvas as
      | ((text: string, options?: Record<string, unknown>) => void)
      | undefined
    if (addFn) {
      addFn(preset.label, {
        fontSize: preset.fontSize,
        fontWeight: preset.fontWeight,
      })
    }
  }

  return (
    <div className="p-3 space-y-3">
      <p className="text-xs text-muted-foreground">
        点击预设添加到画布
      </p>

      <div className="space-y-2">
        {presets.map((preset) => (
          <button
            key={preset.label}
            className="w-full flex items-center gap-3 p-2.5 rounded-md border border-border hover:bg-accent hover:border-accent-foreground/20 transition-colors cursor-pointer text-left"
            onClick={() => handleAdd(preset)}
          >
            <Type className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <span
                className="block truncate"
                style={{ fontSize: Math.min(preset.fontSize, 20), fontWeight: preset.fontWeight }}
              >
                {preset.label}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {preset.fontSize}px · {preset.fontWeight === 'bold' ? '粗体' : '常规'}
              </span>
            </div>
            <Plus className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  )
}
