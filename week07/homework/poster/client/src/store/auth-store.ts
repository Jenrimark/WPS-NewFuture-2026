import { create } from 'zustand'

interface AuthState {
  token: string | null
  user: { id: number; username: string } | null
  isAuthenticated: boolean

  setAuth: (token: string, user: { id: number; username: string }) => void
  logout: () => void
  loadFromStorage: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,

  setAuth: (token, user) => {
    localStorage.setItem('token', token)
    set({ token, user, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ token: null, user: null, isAuthenticated: false })
  },

  loadFromStorage: () => {
    const token = localStorage.getItem('token')
    if (token) {
      set({ token, isAuthenticated: true })
    }
  },
}))
