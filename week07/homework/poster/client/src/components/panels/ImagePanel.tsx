import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, Sparkles, Image } from 'lucide-react'

const PRESET_IMAGES = [
  { id: '1', name: '风景', color: '#6366F1' },
  { id: '2', name: '城市', color: '#8B5CF6' },
  { id: '3', name: '自然', color: '#10B981' },
  { id: '4', name: '建筑', color: '#F59E0B' },
  { id: '5', name: '人物', color: '#EF4444' },
  { id: '6', name: '抽象', color: '#EC4899' },
]

export default function ImagePanel() {
  const fileRef = useRef<HTMLInputElement>(null)

  const handleAddPreset = (img: typeof PRESET_IMAGES[number]) => {
    // Create a colored rectangle as placeholder image via data URL
    const canvas = document.createElement('canvas')
    canvas.width = 200
    canvas.height = 150
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = img.color + '30'
    ctx.fillRect(0, 0, 200, 150)
    ctx.fillStyle = img.color
    ctx.font = '16px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(img.name, 100, 80)

    const addFn = (window as unknown as Record<string, unknown>).__addImageToCanvas as
      | ((src: string) => void)
      | undefined
    if (addFn) {
      addFn(canvas.toDataURL())
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const addFn = (window as unknown as Record<string, unknown>).__addImageToCanvas as
        | ((src: string) => void)
        | undefined
      if (addFn && reader.result) {
        addFn(reader.result as string)
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="p-3 space-y-4">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />

      {/* Upload & AI buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={() => fileRef.current?.click()}>
          <Upload className="w-3.5 h-3.5" />
          <span className="text-xs">本地上传</span>
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 h-9" disabled>
          <Sparkles className="w-3.5 h-3.5" />
          <span className="text-xs">AI 生成</span>
        </Button>
      </div>

      {/* Preset images */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">预设图片</p>
        <div className="grid grid-cols-2 gap-2">
          {PRESET_IMAGES.map((img) => (
            <button
              key={img.id}
              className="aspect-[4/3] rounded-md border border-border hover:border-accent-foreground/20 transition-colors cursor-pointer flex flex-col items-center justify-center gap-1"
              style={{ backgroundColor: img.color + '15' }}
              onClick={() => handleAddPreset(img)}
            >
              <Image className="w-6 h-6" style={{ color: img.color }} />
              <span className="text-[10px] text-muted-foreground">{img.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
