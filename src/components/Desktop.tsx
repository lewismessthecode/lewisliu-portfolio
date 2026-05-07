import { useState, useRef, useCallback, useEffect } from 'react'
import type { TerminalEngine } from '../lib/terminal-engine'
import type { SiteData } from '../lib/commands'
import { DesktopProvider, type WindowState } from '../lib/desktop-context'
import { loadSavedTheme } from '../lib/themes'
import { loadSavedBackground } from '../lib/backgrounds'
import TerminalCore from './TerminalCore'
import TerminalWindow from './TerminalWindow'
import DesktopIcons from './DesktopIcons'
import Taskbar from './Taskbar'

interface DesktopProps {
  readonly data: SiteData
}

function isMobile(): boolean {
  return typeof window !== 'undefined' && window.innerWidth <= 768
}

export default function Desktop({ data }: DesktopProps) {
  const engineRef = useRef<TerminalEngine | null>(null)
  const [currentTheme, setCurrentTheme] = useState('hacker')
  const [currentBackground, setCurrentBackground] = useState('teal')
  const [commandCount, setCommandCount] = useState(0)
  const [windowState, setWindowState] = useState<WindowState>('normal')
  const [mobile, setMobile] = useState(false)

  useEffect(() => {
    setMobile(isMobile())
    const handleResize = () => setMobile(isMobile())
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleEngineReady = useCallback((engine: TerminalEngine) => {
    engineRef.current = engine
  }, [])

  const handleThemeChange = useCallback((theme: string) => {
    setCurrentTheme(theme)
  }, [])

  const handleBackgroundChange = useCallback((bg: string) => {
    setCurrentBackground(bg)
  }, [])

  const handleCommandExecuted = useCallback(() => {
    setCommandCount((c) => c + 1)
  }, [])

  const executeCommand = useCallback((cmd: string) => {
    if (engineRef.current) {
      engineRef.current.executeCommand(cmd)
      setCommandCount((c) => c + 1)
      if (windowState === 'minimized') {
        setWindowState('normal')
      }
    }
  }, [windowState])

  const contextValue = {
    executeCommand,
    currentTheme,
    currentBackground,
    commandCount,
    windowState,
    setWindowState,
    engineRef,
  }

  const shortcutCommands = ['help', 'about', 'now', 'projects', 'wins', 'skills', 'garden', 'contact', 'resume', 'theme']

  // Mobile: fullscreen terminal with shortcuts (same as original)
  if (mobile) {
    return (
      <DesktopProvider value={contextValue}>
        <div className="desktop-background" data-bg={currentBackground !== 'teal' ? currentBackground : undefined}>
          <div className="terminal-wrapper">
            <TerminalCore
              data={data}
              onEngineReady={handleEngineReady}
              onThemeChange={handleThemeChange}
              onBackgroundChange={handleBackgroundChange}
              onCommandExecuted={handleCommandExecuted}
            />
            <div className="terminal-mobile-shortcuts">
              {shortcutCommands.map((cmd) => (
                <button
                  key={cmd}
                  className="terminal-shortcut-btn"
                  onClick={() => executeCommand(cmd)}
                >
                  {cmd}
                </button>
              ))}
            </div>
          </div>
        </div>
      </DesktopProvider>
    )
  }

  // Desktop: Win98 shell
  return (
    <DesktopProvider value={contextValue}>
      <div className="win98-desktop">
        <div
          className="win98-desktop-area desktop-background"
          data-bg={currentBackground !== 'teal' ? currentBackground : undefined}
        >
          <DesktopIcons />
          <TerminalWindow>
            <TerminalCore
              data={data}
              onEngineReady={handleEngineReady}
              onThemeChange={handleThemeChange}
              onBackgroundChange={handleBackgroundChange}
              onCommandExecuted={handleCommandExecuted}
            />
          </TerminalWindow>
        </div>
        <Taskbar />
      </div>
    </DesktopProvider>
  )
}
