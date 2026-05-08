import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Lock, Unlock, RotateCcw } from 'lucide-react'
import { useState } from 'react'

export default function CanvasProperties() {
  const [width, setWidth] = useState(600)
  const [height, setHeight] = useState(800)
  const [locked, setLocked] = useState(true)
  const [bgColor, setBgColor] = useState('#ffffff')

  const handleWidthChange = (v: number) => {
    setWidth(v)
    if (locked) setHeight(Math.round(v * (800 / 600)))
  }

  const handleHeightChange = (v: number) => {
    setHeight(v)
    if (locked) setWidth(Math.round(v * (600 / 800)))
  }

  return (
    <div className="space-y-4">
      {/* Canvas size */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">画布尺寸</Label>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Label className="text-[10px] text-muted-foreground">宽</Label>
            <Input
              type="number"
              value={width}
              onChange={(e) => handleWidthChange(Number(e.target.value))}
              className="h-8 text-xs"
            />
          </div>
          <button
            className="mt-4 p-1 cursor-pointer"
            onClick={() => setLocked(!locked)}
          >
            {locked ? (
              <Lock className="w-3.5 h-3.5 text-primary" />
            ) : (
              <Unlock className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </button>
          <div className="flex-1">
            <Label className="text-[10px] text-muted-foreground">高</Label>
            <Input
              type="number"
              value={height}
              onChange={(e) => handleHeightChange(Number(e.target.value))}
              className="h-8 text-xs"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Background color */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">背景颜色</Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={bgColor}
            onChange={(e) => setBgColor(e.target.value)}
            className="w-8 h-8 rounded border border-border cursor-pointer"
          />
          <Input
            value={bgColor}
            onChange={(e) => setBgColor(e.target.value)}
            className="h-8 text-xs font-mono"
          />
        </div>
        {/* Recommended colors */}
        <div className="flex gap-1.5 mt-1">
          {['#ffffff', '#f5f3ff', '#fef3c7', '#dcfce7', '#dbeafe', '#fce7f3'].map((c) => (
            <button
              key={c}
              className="w-6 h-6 rounded border border-border cursor-pointer hover:scale-110 transition-transform"
              style={{ backgroundColor: c }}
              onClick={() => setBgColor(c)}
            />
          ))}
        </div>
      </div>

      <Separator />

      {/* Background image */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">背景图片</Label>
        <Button variant="outline" size="sm" className="w-full h-8 text-xs">
          上传背景图
        </Button>
      </div>

      <Separator />

      {/* Reset */}
      <Button variant="ghost" size="sm" className="w-full gap-1.5 text-xs text-muted-foreground">
        <RotateCcw className="w-3.5 h-3.5" />
        重置背景
      </Button>
    </div>
  )
}
