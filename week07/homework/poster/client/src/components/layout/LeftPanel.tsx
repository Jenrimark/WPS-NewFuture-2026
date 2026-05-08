import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Type, Square, Image } from 'lucide-react'
import TextPanel from '@/components/panels/TextPanel'
import ShapePanel from '@/components/panels/ShapePanel'
import ImagePanel from '@/components/panels/ImagePanel'

export default function LeftPanel() {
  const [tab, setTab] = useState('text')

  return (
    <aside className="w-60 border-r border-border bg-card flex flex-col shrink-0 overflow-hidden">
      <Tabs value={tab} onValueChange={setTab} className="flex flex-col h-full">
        <TabsList className="grid grid-cols-3 rounded-none border-b border-border bg-muted/50 h-10 shrink-0">
          <TabsTrigger value="text" className="text-xs gap-1 rounded-none data-[state=active]:bg-background">
            <Type className="w-3.5 h-3.5" />
            文本
          </TabsTrigger>
          <TabsTrigger value="shape" className="text-xs gap-1 rounded-none data-[state=active]:bg-background">
            <Square className="w-3.5 h-3.5" />
            形状
          </TabsTrigger>
          <TabsTrigger value="image" className="text-xs gap-1 rounded-none data-[state=active]:bg-background">
            <Image className="w-3.5 h-3.5" />
            图片
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          <TabsContent value="text" className="m-0">
            <TextPanel />
          </TabsContent>
          <TabsContent value="shape" className="m-0">
            <ShapePanel />
          </TabsContent>
          <TabsContent value="image" className="m-0">
            <ImagePanel />
          </TabsContent>
        </div>
      </Tabs>
    </aside>
  )
}
