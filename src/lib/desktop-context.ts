import { createContext, useContext } from 'react'
import type { TerminalEngine } from './terminal-engine'

export type WindowState = 'normal' | 'minimized' | 'maximized'

export interface DesktopContextValue {
  readonly executeCommand: (cmd: string) => void
  readonly currentTheme: string
  readonly currentBackground: string
  readonly commandCount: number
  readonly windowState: WindowState
  readonly setWindowState: (state: WindowState) => void
  readonly engineRef: React.RefObject<TerminalEngine | null>
}

const DesktopContext = createContext<DesktopContextValue | null>(null)

export const DesktopProvider = DesktopContext.Provider

export function useDesktop(): DesktopContextValue {
  const ctx = useContext(DesktopContext)
  if (!ctx) {
    throw new Error('useDesktop must be used within a DesktopProvider')
  }
  return ctx
}
