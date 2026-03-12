import { useState, useRef, useCallback } from 'react'
import { useDesktop } from '../lib/desktop-context'

let sharedAudioCtx: AudioContext | null = null
function getAudioContext(): AudioContext {
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioContext()
  }
  return sharedAudioCtx
}

const playClick = () => {
  try {
    const ctx = getAudioContext()
    if (ctx.state === 'suspended') {
      ctx.resume()
    }
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 1000
    gain.gain.value = 0.1
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05)
    osc.start()
    osc.stop(ctx.currentTime + 0.05)
  } catch {
    // Audio not available
  }
}

interface TerminalWindowProps {
  readonly children: React.ReactNode
}

export default function TerminalWindow({ children }: TerminalWindowProps) {
  const { windowState, setWindowState, engineRef } = useDesktop()
  const [shaking, setShaking] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const wrapperRef = useRef<HTMLDivElement>(null)

  const minimized = windowState === 'minimized'
  const maximized = windowState === 'maximized'

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    playClick()
    if (engineRef.current) {
      engineRef.current.addLines([
        { type: 'system', text: 'Nice try. This terminal cannot be closed.' },
      ])
    }
    setShaking(true)
    setTimeout(() => setShaking(false), 500)
  }

  const handleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation()
    playClick()
    setWindowState(minimized ? 'normal' : 'minimized')
  }

  const handleMaximize = (e: React.MouseEvent) => {
    e.stopPropagation()
    playClick()
    if (maximized) {
      setWindowState('normal')
    } else {
      setPosition({ x: 0, y: 0 })
      setWindowState('maximized')
    }
  }

  const handleTitlebarMouseDown = useCallback((e: React.MouseEvent) => {
    if (maximized) return
    if ((e.target as HTMLElement).closest('button')) return
    setIsDragging(true)
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y }

    const handleMouseMove = (ev: MouseEvent) => {
      setPosition({
        x: ev.clientX - dragStart.current.x,
        y: ev.clientY - dragStart.current.y,
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [maximized, position])

  const handleDoubleClick = () => {
    playClick()
    if (maximized) {
      setWindowState('normal')
    } else {
      setPosition({ x: 0, y: 0 })
      setWindowState('maximized')
    }
  }

  const wrapperClasses = [
    'terminal-wrapper',
    'win98-window',
    maximized ? 'terminal-wrapper--maximized' : '',
    minimized ? 'terminal-wrapper--minimized' : '',
    shaking ? 'terminal-wrapper--shaking' : '',
  ].filter(Boolean).join(' ')

  const style: React.CSSProperties = maximized
    ? {}
    : {
        transform: `translate(${position.x}px, ${position.y}px)`,
        cursor: isDragging ? 'grabbing' : undefined,
      }

  return (
    <div className={wrapperClasses} ref={wrapperRef} style={style}>
      <div
        className="win98-titlebar"
        onMouseDown={handleTitlebarMouseDown}
        onDoubleClick={handleDoubleClick}
      >
        <div className="win98-titlebar-icon">
          <span className="win98-terminal-icon" aria-hidden="true" />
        </div>
        <span className="win98-titlebar-title">C:\Lewis\Terminal.exe</span>
        <div className="win98-titlebar-buttons">
          <button
            type="button"
            className="win98-btn win98-btn-minimize"
            onClick={handleMinimize}
            aria-label={minimized ? 'Restore' : 'Minimize'}
          >
            <span aria-hidden="true">_</span>
          </button>
          <button
            type="button"
            className="win98-btn win98-btn-maximize"
            onClick={handleMaximize}
            aria-label={maximized ? 'Restore' : 'Maximize'}
          >
            <span aria-hidden="true">{maximized ? '\u29C9' : '\u25A1'}</span>
          </button>
          <button
            type="button"
            className="win98-btn win98-btn-close"
            onClick={handleClose}
            aria-label="Close"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      </div>
      {!minimized && children}
    </div>
  )
}
