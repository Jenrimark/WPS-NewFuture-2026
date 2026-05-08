import { create } from 'zustand'
import type { PosterElement, CanvasConfig } from '@/types'

interface HistorySnapshot {
  elements: PosterElement[]
  canvasConfig: CanvasConfig
}

interface HistoryState {
  past: HistorySnapshot[]
  future: HistorySnapshot[]

  pushSnapshot: (snapshot: HistorySnapshot) => void
  undo: (current: HistorySnapshot) => HistorySnapshot | null
  redo: (current: HistorySnapshot) => HistorySnapshot | null
  canUndo: () => boolean
  canRedo: () => boolean
  clear: () => void
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],

  pushSnapshot: (snapshot) =>
    set((s) => ({
      past: [...s.past, snapshot],
      future: [],
    })),

  undo: (current) => {
    const { past } = get()
    if (past.length === 0) return null
    const previous = past[past.length - 1]
    set((s) => ({
      past: s.past.slice(0, -1),
      future: [current, ...s.future],
    }))
    return previous
  },

  redo: (current) => {
    const { future } = get()
    if (future.length === 0) return null
    const next = future[0]
    set((s) => ({
      past: [...s.past, current],
      future: s.future.slice(1),
    }))
    return next
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
  clear: () => set({ past: [], future: [] }),
}))
