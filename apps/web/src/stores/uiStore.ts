import { create } from 'zustand'

interface Toast {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
}

interface UIState {
  sidebarCollapsed: boolean
  toasts: Toast[]
  toggleSidebar: () => void
  addToast: (type: Toast['type'], message: string) => void
  removeToast: (id: string) => void
}

export const useUIStore = create<UIState>((set, get) => ({
  sidebarCollapsed: false,
  toasts: [],
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  addToast: (type, message) => {
    if (get().toasts.some(t => t.type === type && t.message === message)) return
    const id = crypto.randomUUID()
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, type, message }] }))
    setTimeout(() => get().removeToast(id), 4000)
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
