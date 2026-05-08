import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

const BASIC_SHAPES = [
  { id: 'rect', name: '矩形', svg: '<rect x="4" y="4" width="24" height="24" rx="2"/>' },
  { id: 'circle', name: '圆形', svg: '<circle cx="16" cy="16" r="12"/>' },
  { id: 'triangle', name: '三角形', svg: '<polygon points="16,2 30,30 2,30"/>' },
  { id: 'star', name: '五角星', svg: '<polygon points="16,2 20,12 30,12 22,18 25,28 16,22 7,28 10,18 2,12 12,12"/>' },
  { id: 'diamond', name: '菱形', svg: '<polygon points="16,2 30,16 16,30 2,16"/>' },
  { id: 'hexagon', name: '六边形', svg: '<polygon points="16,2 28,9 28,23 16,30 4,23 4,9"/>' },
]

const FESTIVAL_SHAPES = [
  { id: 'heart', name: '爱心', svg: '<path d="M16,28 C6,20 2,14 2,10 C2,4 6,2 10,2 C13,2 15,4 16,6 C17,4 19,2 22,2 C26,2 30,4 30,10 C30,14 26,20 16,28Z"/>' },
  { id: 'ribbon', name: '丝带', svg: '<path d="M4,6 L28,6 L24,16 L28,26 L4,26 L8,16Z"/>' },
  { id: 'snowflake', name: '雪花', svg: '<path d="M16,2 V30 M2,16 H30 M5,5 L27,27 M27,5 L5,27" stroke="currentColor" fill="none" stroke-width="2"/>' },
]

const OTHER_SHAPES = [
  { id: 'arrow-right', name: '箭头', svg: '<path d="M4,16 H22 M16,10 L22,16 L16,22"/>' },
  { id: 'chat', name: '对话框', svg: '<rect x="4" y="4" width="24" height="18" rx="3"/><polygon points="10,22 16,28 16,22"/>' },
  { id: 'badge', name: '徽章', svg: '<circle cx="16" cy="16" r="12"/><circle cx="16" cy="16" r="8" fill="white"/><circle cx="16" cy="16" r="4"/>' },
]

type ShapeItem = { id: string; name: string; svg: string }

function ShapeGrid({ shapes }: { shapes: ShapeItem[] }) {
  const handleAdd = (shape: ShapeItem) => {
    const addFn = (window as unknown as Record<string, unknown>).__addShapeToCanvas as
      | ((type: string, svg?: string) => void)
      | undefined
    if (addFn) {
      addFn(shape.id, shape.svg)
    }
  }

  return (
    <div className="grid grid-cols-3 gap-2 p-3">
      {shapes.map((shape) => (
        <button
          key={shape.id}
          className="aspect-square flex flex-col items-center justify-center gap-1 p-2 rounded-md border border-border hover:bg-accent hover:border-accent-foreground/20 transition-colors cursor-pointer"
          title={shape.name}
          onClick={() => handleAdd(shape)}
        >
          <svg
            viewBox="0 0 32 32"
            className="w-8 h-8 text-foreground"
            fill="currentColor"
            stroke="none"
            dangerouslySetInnerHTML={{ __html: shape.svg }}
          />
          <span className="text-[10px] text-muted-foreground truncate w-full text-center">
            {shape.name}
          </span>
        </button>
      ))}
    </div>
  )
}

export default function ShapePanel() {
  const [category, setCategory] = useState('basic')

  return (
    <Tabs value={category} onValueChange={setCategory}>
      <div className="px-3 pt-3">
        <TabsList className="grid grid-cols-3 w-full h-8">
          <TabsTrigger value="basic" className="text-xs">基础</TabsTrigger>
          <TabsTrigger value="festival" className="text-xs">节日</TabsTrigger>
          <TabsTrigger value="other" className="text-xs">其它</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="basic"><ShapeGrid shapes={BASIC_SHAPES} /></TabsContent>
      <TabsContent value="festival"><ShapeGrid shapes={FESTIVAL_SHAPES} /></TabsContent>
      <TabsContent value="other"><ShapeGrid shapes={OTHER_SHAPES} /></TabsContent>
    </Tabs>
  )
}
