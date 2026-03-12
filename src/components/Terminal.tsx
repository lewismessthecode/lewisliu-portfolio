import { useState, useEffect, useRef, useCallback } from 'react'
import type { TerminalLine, TerminalEngine } from '../lib/terminal-engine'
import { createTerminalEngine } from '../lib/terminal-engine'
import { createCommands, type SiteData } from '../lib/commands'
import { applyTheme, loadSavedTheme } from '../lib/themes'
import { applyBackground, loadSavedBackground, BACKGROUNDS } from '../lib/backgrounds'

const BANNER = `Initializing LewisShell v1.0...
Copyright (c) 2024 Lewis Liu <lewis@lewisliu.dev>

 ██╗     ███████╗██╗    ██╗██╗███████╗
 ██║     ██╔════╝██║    ██║██║██╔════╝
 ██║     █████╗  ██║ █╗ ██║██║███████╗
 ██║     ██╔══╝  ██║███╗██║██║╚════██║
 ███████╗███████╗╚███╔███╔╝██║███████║
 ╚══════╝╚══════╝ ╚══╝╚══╝ ╚═╝╚══════╝

..................................................
  Type 'help' for a list of available commands.
`

interface TerminalProps {
  readonly data: SiteData
}

function getInitialCmd(): string | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('cmd')
}

const playClick = () => {
  const ctx = new AudioContext()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.frequency.value = 1000
  gain.gain.value = 0.1
  osc.start()
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05)
  osc.stop(ctx.currentTime + 0.05)
}

export default function Terminal({ data }: TerminalProps) {
  const initialCmd = useRef(getInitialCmd()).current
  const [lines, setLines] = useState<readonly TerminalLine[]>([])
  const [input, setInput] = useState('')
  const [booted, setBooted] = useState(false)
  const [bootText, setBootText] = useState('')
  const [currentTheme, setCurrentTheme] = useState('hacker')
  const [currentBackground, setCurrentBackground] = useState('teal')
  const outputRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const engineRef = useRef<TerminalEngine | null>(null)

  // Single effect: create engine, run boot animation, execute initial command
  useEffect(() => {
    const clearFn = () => {
      engineRef.current?.setLines([])
    }
    const commands = createCommands(data, clearFn)
    const engine = createTerminalEngine(commands)
    engineRef.current = engine

    const unsubscribe = engine.subscribe((state) => {
      setLines([...state.lines])
      // Sync dropdown state when commands change theme/background
      const t = loadSavedTheme()
      const b = loadSavedBackground()
      setCurrentTheme(t)
      setCurrentBackground(b)
    })

    // Theme
    const savedTheme = loadSavedTheme()
    applyTheme(savedTheme)
    setCurrentTheme(savedTheme)

    // Background
    const savedBg = loadSavedBackground()
    setCurrentBackground(savedBg)
    // Defer applyBackground to next tick so the DOM element exists
    requestAnimationFrame(() => applyBackground(savedBg))

    // Boot animation
    let cancelled = false
    let i = 0
    const bannerChars = BANNER.split('')
    let accumulated = ''

    const finishBoot = () => {
      if (cancelled) return
      cancelled = true
      setBooted(true)
      if (initialCmd) {
        engine.executeCommand(initialCmd)
      }
    }

    const interval = setInterval(() => {
      if (cancelled) {
        clearInterval(interval)
        return
      }
      if (i < bannerChars.length) {
        const chunk = Math.min(4, bannerChars.length - i)
        accumulated += bannerChars.slice(i, i + chunk).join('')
        setBootText(accumulated)
        i += chunk
      } else {
        clearInterval(interval)
        finishBoot()
      }
    }, 8)

    const skipBoot = () => {
      clearInterval(interval)
      setBootText(BANNER)
      finishBoot()
    }

    window.addEventListener('keydown', skipBoot, { once: true })

    return () => {
      cancelled = true
      clearInterval(interval)
      window.removeEventListener('keydown', skipBoot)
      unsubscribe()
      engineRef.current = null
    }
  }, [data])

  // Auto-scroll
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [lines, bootText, input])

  // Focus input
  useEffect(() => {
    if (booted) {
      inputRef.current?.focus()
    }
  }, [booted])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const engine = engineRef.current
    if (!engine) return

    if (e.key === 'Enter') {
      e.preventDefault()
      if (input.trim()) {
        engine.executeCommand(input)
        setInput('')
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prev = engine.navigateHistory('up')
      setInput(prev)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = engine.navigateHistory('down')
      setInput(next)
    } else if (e.key === 'Tab') {
      e.preventDefault()
      const completed = engine.tabComplete(input)
      if (completed !== input) {
        setInput(completed)
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault()
      engine.clearLines()
    }
  }

  const handleOutputClick = () => {
    inputRef.current?.focus()
  }

  const handleThemeChange = useCallback((name: string) => {
    applyTheme(name)
    setCurrentTheme(name)
  }, [])

  const handleBackgroundChange = useCallback((name: string) => {
    applyBackground(name)
    setCurrentBackground(name)
  }, [])

  const renderLine = (line: TerminalLine, idx: number) => {
    const className = `terminal-line terminal-line--${line.type}`
    if (line.isHtml) {
      return (
        <div
          key={idx}
          className={className}
          dangerouslySetInnerHTML={{ __html: line.text }}
        />
      )
    }
    return (
      <div key={idx} className={className}>
        {line.text}
      </div>
    )
  }

  return (
    <div className="desktop-background">
      <div className="desktop-settings">
        <select
          value={currentBackground}
          onChange={(e) => handleBackgroundChange(e.target.value)}
          className="desktop-bg-select"
          aria-label="Select background"
        >
          {BACKGROUNDS.map((b) => (
            <option key={b.name} value={b.name}>
              {b.label}
            </option>
          ))}
        </select>
      </div>
      <div className="terminal-wrapper">
        <div className="terminal" onClick={handleOutputClick}>
          <div className="terminal-titlebar">
            <div className="traffic-lights">
              <button
                type="button"
                className="traffic-light tl-close"
                onClick={(e) => { e.stopPropagation(); playClick() }}
                aria-label="Close"
              />
              <button
                type="button"
                className="traffic-light tl-minimize"
                onClick={(e) => { e.stopPropagation(); playClick() }}
                aria-label="Minimize"
              />
              <button
                type="button"
                className="traffic-light tl-maximize"
                onClick={(e) => { e.stopPropagation(); playClick() }}
                aria-label="Maximize"
              />
            </div>
            <span className="terminal-titlebar-title">LewisShell</span>
          </div>
          <div className="terminal-scanlines" />
          <div className="terminal-output" ref={outputRef}>
            {!booted && (
              <pre className="terminal-boot">{bootText}<span className="terminal-cursor" /></pre>
            )}
            {booted && (
              <>
                <pre className="terminal-boot">{BANNER}</pre>
                {lines.map(renderLine)}
                <div className="terminal-input-row">
                  <span className="terminal-prompt">$ / &gt;&nbsp;</span>
                  <input
                    ref={inputRef}
                    type="text"
                    className="terminal-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    style={{ width: `${Math.max(1, input.length)}ch` }}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    aria-label="Terminal input"
                  />
                  <span className="terminal-cursor" />
                </div>
              </>
            )}
          </div>
        </div>
        <div className="terminal-mobile-shortcuts">
          {['help', 'projects', 'garden', 'theme', 'about'].map((cmd) => (
            <button
              key={cmd}
              className="terminal-shortcut-btn"
              onClick={() => {
                const engine = engineRef.current
                if (engine) {
                  engine.executeCommand(cmd)
                  setInput('')
                }
              }}
            >
              {cmd}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
