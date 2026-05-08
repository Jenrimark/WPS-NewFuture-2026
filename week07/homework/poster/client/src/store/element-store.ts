import { create } from 'zustand'
import type { PosterElement } from '@/types'

interface ElementState {
  elements: PosterElement[]
  selectedId: string | null

  addElement: (el: PosterElement) => void
  removeElement: (id: string) => void
  updateElement: (id: string, updates: Partial<PosterElement>) => void
  setElements: (elements: PosterElement[]) => void
  selectElement: (id: string | null) => void
  clearSelection: () => void

  moveLayerUp: (id: string) => void
  moveLayerDown: (id: string) => void
  moveToTop: (id: string) => void
  moveToBottom: (id: string) => void
}

export const useElementStore = create<ElementState>((set, get) => ({
  elements: [],
  selectedId: null,

  addElement: (el) => set((s) => ({ elements: [...s.elements, el] })),

  removeElement: (id) =>
    set((s) => ({
      elements: s.elements.filter((e) => e.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),

  updateElement: (id, updates) =>
    set((s) => ({
      elements: s.elements.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    })),

  setElements: (elements) => set({ elements }),

  selectElement: (id) => set({ selectedId: id }),

  clearSelection: () => set({ selectedId: null }),

  moveLayerUp: (id) => {
    const { elements } = get()
    const idx = elements.findIndex((e) => e.id === id)
    if (idx < elements.length - 1) {
      const next = [...elements]
      ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
      set({ elements: next })
    }
  },

  moveLayerDown: (id) => {
    const { elements } = get()
    const idx = elements.findIndex((e) => e.id === id)
    if (idx > 0) {
      const next = [...elements]
      ;[next[idx], next[idx - 1]] = [next[idx - 1], next[idx]]
      set({ elements: next })
    }
  },

  moveToTop: (id) => {
    const { elements } = get()
    const idx = elements.findIndex((e) => e.id === id)
    if (idx >= 0 && idx < elements.length - 1) {
      const el = elements[idx]
      set({ elements: [...elements.filter((e) => e.id !== id), el] })
    }
  },

  moveToBottom: (id) => {
    const { elements } = get()
    const idx = elements.findIndex((e) => e.id === id)
    if (idx > 0) {
      const el = elements[idx]
      set({ elements: [el, ...elements.filter((e) => e.id !== id)] })
    }
  },
}))
