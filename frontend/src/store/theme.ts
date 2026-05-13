import { create } from 'zustand'

interface ThemeStore {
  isDark: boolean
  toggle: () => void
}

const getInitial = (): boolean => {
  try {
    return localStorage.getItem('mqp-dark') === 'true'
  } catch {
    return false
  }
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  isDark: getInitial(),
  toggle: () => {
    const next = !get().isDark
    set({ isDark: next })
    localStorage.setItem('mqp-dark', String(next))
    document.documentElement.classList.toggle('dark', next)
  },
}))
