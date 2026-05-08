import { create } from 'zustand'

interface CanvasState {
  width: number
  height: number
  backgroundColor: string
  backgroundImage: string | null
  zoom: number

  setWidth: (w: number) => void
  setHeight: (h: number) => void
  setSize: (w: number, h: number) => void
  setBackgroundColor: (color: string) => void
  setBackgroundImage: (url: string | null) => void
  setZoom: (z: number) => void
  resetBackground: () => void
}

export const useCanvasStore = create<CanvasState>((set) => ({
  width: 600,
  height: 800,
  backgroundColor: '#ffffff',
  backgroundImage: null,
  zoom: 1,

  setWidth: (w) => set({ width: w }),
  setHeight: (h) => set({ height: h }),
  setSize: (w, h) => set({ width: w, height: h }),
  setBackgroundColor: (color) => set({ backgroundColor: color }),
  setBackgroundImage: (url) => set({ backgroundImage: url }),
  setZoom: (z) => set({ zoom: Math.max(0.1, Math.min(5, z)) }),
  resetBackground: () => set({ backgroundColor: '#ffffff', backgroundImage: null }),
}))
