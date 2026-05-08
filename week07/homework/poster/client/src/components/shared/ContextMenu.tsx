import { useEffect, useRef, useState } from 'react'
import {
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  AlignCenter,
  AlignVerticalJustifyCenter,
  Copy,
  Trash2,
} from 'lucide-react'

interface ContextMenuProps {
  onAction: (action: string) => void
}

export default function ContextMenu({ onAction }: ContextMenuProps) {
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      // Only show on canvas right-click
      const target = e.target as HTMLElement
      if (target.tagName === 'CANVAS' || target.closest('.canvas-container')) {
        e.preventDefault()
        setPos({ x: e.clientX, y: e.clientY })
        setVisible(true)
      }
    }

    const hideHandler = () => setVisible(false)

    document.addEventListener('contextmenu', handler)
    document.addEventListener('click', hideHandler)
    return () => {
      document.removeEventListener('contextmenu', handler)
      document.removeEventListener('click', hideHandler)
    }
  }, [])

  if (!visible) return null

  const items = [
    { action: 'moveUp', label: '图层上移', icon: ArrowUp },
    { action: 'moveDown', label: '图层下移', icon: ArrowDown },
    { action: 'moveToTop', label: '置顶', icon: ChevronsUp },
    { action: 'moveToBottom', label: '置底', icon: ChevronsDown },
    { action: 'separator', label: '', icon: null },
    { action: 'alignH', label: '水平居中', icon: AlignCenter },
    { action: 'alignV', label: '垂直居中', icon: AlignVerticalJustifyCenter },
    { action: 'separator', label: '', icon: null },
    { action: 'copy', label: '复制', icon: Copy },
    { action: 'delete', label: '删除', icon: Trash2 },
  ]

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-40 bg-card border border-border rounded-md shadow-md py-1"
      style={{ left: pos.x, top: pos.y }}
    >
      {items.map((item) =>
        item.action === 'separator' ? (
          <div key="sep" className="h-px bg-border my-1 mx-2" />
        ) : (
          <button
            key={item.action}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent cursor-pointer"
            onClick={() => {
              onAction(item.action)
              setVisible(false)
            }}
          >
            {item.icon && <item.icon className="w-3.5 h-3.5" />}
            {item.label}
          </button>
        )
      )}
    </div>
  )
}
