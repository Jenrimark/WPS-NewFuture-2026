// 海报元素类型
export type ElementType = 'text' | 'shape' | 'image'

// 文本对齐
export type TextAlign = 'left' | 'center' | 'right'

// 形状分类
export type ShapeCategory = 'basic' | 'festival' | 'other'

// 海报元素
export interface PosterElement {
  id: string
  type: ElementType
  // 位置与变换
  x: number
  y: number
  width: number
  height: number
  rotation: number
  opacity: number
  // 通用样式
  fill?: string
  stroke?: string
  strokeWidth?: number
  shadow?: string
  // 文本专属
  text?: string
  fontFamily?: string
  fontSize?: number
  fontWeight?: 'normal' | 'bold'
  fontStyle?: 'normal' | 'italic'
  underline?: boolean
  linethrough?: boolean
  textAlign?: TextAlign
  letterSpacing?: number
  lineHeight?: number
  textColor?: string
  // 图片专属
  src?: string
  // 形状专属
  shapeType?: string
  shapeCategory?: ShapeCategory
}

// 画布配置
export interface CanvasConfig {
  width: number
  height: number
  backgroundColor: string
  backgroundImage: string | null
}

// 快照（用于撤销/重做）
export interface HistorySnapshot {
  elements: PosterElement[]
  canvasConfig: CanvasConfig
}

// 用户信息
export interface User {
  id: number
  username: string
}

// 海报数据
export interface Poster {
  id: number
  user_id: number
  title: string
  width: number
  height: number
  data: string
  thumb_url?: string
  created_at: string
  updated_at: string
}

// 形状素材
export interface ShapeItem {
  id: string
  name: string
  category: ShapeCategory
  svgPath: string
}
