import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import type { ReactNode, MouseEvent } from 'react'
import type { TerminalEngine } from '../lib/terminal-engine'
import type { SiteData } from '../lib/commands'
import { DesktopProvider, type WindowId } from '../lib/desktop-context'
import { cascadeCountStyle } from '../lib/cascade-frame'
import { initialDesktopState, isVisible, reduceDesktop } from '../lib/window-state'
import { loadSoundEnabled, playDesktopClick, saveSoundEnabled } from '../lib/desktop-sound'
import TerminalCore from './TerminalCore'
import DesktopIcons from './DesktopIcons'
import Taskbar from './Taskbar'
import Window from './Window'
import Resume from './Resume'

const frames = [
  { id: 'portfolio', title: 'Portfolio', icon: 'folder' },
  { id: 'resume', title: 'Resume', icon: 'document' },
  { id: 'terminal', title: 'C:\\Lewis\\Terminal.exe', icon: 'terminal' },
] as const

type Listed = (typeof frames)[number]['id']
type RestingCoversWindows = Exclude<WindowId, Listed> extends never ? true : never
const restingCoversWindows: RestingCoversWindows = true

export default function Desktop({ data, resumePages, children }: { readonly data: SiteData; readonly resumePages: { readonly en: string; readonly zh: string }; readonly children: ReactNode }) {
  const [state, dispatch] = useReducer(reduceDesktop, initialDesktopState)
  const [currentBackground, setCurrentBackground] = useState('teal')
  const [soundEnabled, setSoundEnabled] = useState(false)
  const engineRef = useRef<TerminalEngine | null>(null)
  const desktopRef = useRef<HTMLDivElement>(null)
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
    } else pendingCommands.current.push(cmd)
  }, [openWindow])
  const handleEngineReady = useCallback((engine: TerminalEngine) => {
    engineRef.current = engine
    for (const command of pendingCommands.current) engine.executeCommand(command)
    pendingCommands.current = []
  }, [])
  useEffect(() => setSoundEnabled(loadSoundEnabled()), [])

  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return
    const updateHeight = () => {
      const desktop = desktopRef.current
      if (!desktop) return
      if (window.innerWidth <= 768 && viewport.height > 0) {
        desktop.style.setProperty('--visible-height', `${viewport.height}px`)
      } else {
        desktop.style.removeProperty('--visible-height')
      }
    }
    updateHeight()
    viewport.addEventListener('resize', updateHeight)
    window.addEventListener('resize', updateHeight)
    return () => {
      viewport.removeEventListener('resize', updateHeight)
      window.removeEventListener('resize', updateHeight)
    }
  }, [])
  const toggleSound = useCallback(() => {
    const enabled = !soundEnabled
    setSoundEnabled(enabled)
    saveSoundEnabled(enabled)
    if (enabled) playDesktopClick()
  }, [soundEnabled])

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
  const windowChildren = (id: Listed): ReactNode => {
    switch (id) {
      case 'portfolio':
        return <div className="portfolio-scroll" onClick={onPortfolioClick}>{children}</div>
      case 'resume':
        return <Resume pages={resumePages} />
      case 'terminal':
        return <TerminalCore data={data} active={state.active === 'terminal' && isVisible(state.windows.terminal)} onEngineReady={handleEngineReady} onBackgroundChange={setCurrentBackground} />
    }
  }
  const context = { executeCommand, openWindow, focusWindow, minimizeWindow, maximizeWindow, closeWindow, selectTask, windows: state.windows, activeWindow: state.active, soundEnabled, toggleSound }

  return <DesktopProvider value={context}>
    <div ref={desktopRef} className="win98-desktop" onClickCapture={(event) => {
      if (soundEnabled && event.target instanceof Element && event.target.closest('.win98-icons button, .win98-titlebar-buttons button, .win98-taskbar button, .win98-start-menu button')) playDesktopClick()
    }}>
      <div className="win98-desktop-area desktop-background" data-bg={currentBackground !== 'teal' ? currentBackground : undefined} style={cascadeCountStyle(frames.length)}>
        <DesktopIcons />
        {frames.map((frame, cascadeSlot) => (
          <Window key={frame.id} id={frame.id} title={frame.title} icon={frame.icon} cascadeSlot={cascadeSlot} cascadeCount={frames.length}>
            {windowChildren(frame.id)}
          </Window>
        ))}
      </div>
      <Taskbar />
    </div>
  </DesktopProvider>
}
