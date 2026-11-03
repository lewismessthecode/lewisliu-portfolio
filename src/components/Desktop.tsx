import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import type { ReactNode, MouseEvent } from 'react'
import type { TerminalEngine } from '../lib/terminal-engine'
import type { SiteData } from '../lib/commands'
import { DesktopProvider, type WindowId } from '../lib/desktop-context'
import { initialDesktopState, isVisible, reduceDesktop } from '../lib/window-state'
import TerminalCore from './TerminalCore'
import DesktopIcons from './DesktopIcons'
import Taskbar from './Taskbar'
import Window from './Window'

export default function Desktop({ data, children }: { readonly data: SiteData; readonly children: ReactNode }) {
  const [state, dispatch] = useReducer(reduceDesktop, initialDesktopState)
  const [currentTheme, setCurrentTheme] = useState('one-dark')
  const [currentBackground, setCurrentBackground] = useState('teal')
  const [commandCount, setCommandCount] = useState(0)
  const engineRef = useRef<TerminalEngine | null>(null)
  const pendingCommands = useRef<string[]>([])
  const openWindow = useCallback((id: WindowId) => dispatch({ type: 'open', id }), [])
  const focusWindow = useCallback((id: WindowId) => dispatch({ type: 'focus', id }), [])
  const minimizeWindow = useCallback((id: WindowId) => dispatch({ type: 'minimize', id }), [])
  const maximizeWindow = useCallback((id: WindowId) => dispatch({ type: 'maximize', id }), [])
  const closeWindow = useCallback((id: WindowId) => dispatch({ type: 'close', id }), [])
  const selectTask = useCallback((id: WindowId) => dispatch({ type: 'task', id }), [])
  const executeCommand = useCallback((cmd: string) => {
    openWindow('terminal')
    if (engineRef.current) {
      engineRef.current.executeCommand(cmd)
      setCommandCount((count) => count + 1)
    } else pendingCommands.current.push(cmd)
  }, [openWindow])
  const handleEngineReady = useCallback((engine: TerminalEngine) => {
    engineRef.current = engine
    for (const command of pendingCommands.current) engine.executeCommand(command)
    setCommandCount((count) => count + pendingCommands.current.length)
    pendingCommands.current = []
  }, [])
  const handleCommandExecuted = useCallback(() => setCommandCount((count) => count + 1), [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.has('cmd') || window.location.pathname.replace(/\/$/, '') === '/terminal') openWindow('terminal')
  }, [openWindow])

  const onPortfolioClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target
    if (!(target instanceof Element)) return
    const link = target.closest<HTMLAnchorElement>('a[data-terminal]')
    if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    const command = link.dataset.terminal
    if (command) executeCommand(command)
    else openWindow('terminal')
  }
  const context = { executeCommand, openWindow, focusWindow, minimizeWindow, maximizeWindow, closeWindow, selectTask, windows: state.windows, activeWindow: state.active, currentTheme, commandCount }
  const shortcuts = ['help', 'about', 'now', 'projects', 'wins', 'skills', 'garden', 'contact', 'resume', 'theme']

  return <DesktopProvider value={context}>
    <div className="win98-desktop">
      <div className="win98-desktop-area desktop-background" data-bg={currentBackground !== 'teal' ? currentBackground : undefined}>
        <DesktopIcons />
        <Window id="portfolio" title="Portfolio" icon="folder">
          <div className="portfolio-scroll" onClick={onPortfolioClick}>{children}</div>
        </Window>
        <Window id="terminal" title={'C:\\Lewis\\Terminal.exe'} icon="terminal">
          <TerminalCore data={data} active={state.active === 'terminal' && isVisible(state.windows.terminal)} onEngineReady={handleEngineReady} onThemeChange={setCurrentTheme} onBackgroundChange={setCurrentBackground} onCommandExecuted={handleCommandExecuted} />
          <div className="terminal-mobile-shortcuts">{shortcuts.map((command) => <button key={command} className="terminal-shortcut-btn" onClick={() => executeCommand(command)}>{command}</button>)}</div>
        </Window>
      </div>
      <Taskbar />
    </div>
  </DesktopProvider>
}
