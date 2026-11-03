import { createContext, useContext } from 'react'

import type { WindowId, WindowState } from './window-state'
export type { WindowId, WindowState } from './window-state'

export interface DesktopContextValue {
  readonly executeCommand: (cmd: string) => void
  readonly openWindow: (id: WindowId) => void
  readonly focusWindow: (id: WindowId) => void
  readonly minimizeWindow: (id: WindowId) => void
  readonly maximizeWindow: (id: WindowId) => void
  readonly closeWindow: (id: WindowId) => void
  readonly selectTask: (id: WindowId) => void
  readonly windows: Record<WindowId, WindowState>
  readonly activeWindow: WindowId | null
  readonly currentTheme: string
  readonly commandCount: number
}

const DesktopContext = createContext<DesktopContextValue | null>(null)
export const DesktopProvider = DesktopContext.Provider
export function useDesktop(): DesktopContextValue {
  const ctx = useContext(DesktopContext)
  if (!ctx) throw new Error('useDesktop must be used within a DesktopProvider')
  return ctx
}
