import { useState, useCallback } from 'react'
import { useDesktop } from '../lib/desktop-context'
import StartMenu from './StartMenu'
import SystemTray from './SystemTray'

export default function Taskbar() {
  const { windowState, setWindowState } = useDesktop()
  const [startOpen, setStartOpen] = useState(false)

  const toggleStart = useCallback(() => {
    setStartOpen((prev) => !prev)
  }, [])

  const closeStart = useCallback(() => {
    setStartOpen(false)
  }, [])

  const handleTaskBtnClick = useCallback(() => {
    if (windowState === 'minimized') {
      setWindowState('normal')
    } else {
      setWindowState('minimized')
    }
  }, [windowState, setWindowState])

  return (
    <>
      {startOpen && <StartMenu onClose={closeStart} />}
      <div className="win98-taskbar" role="toolbar" aria-label="Taskbar">
        <button
          className={`win98-start-btn${startOpen ? ' win98-start-btn--active' : ''}`}
          onClick={toggleStart}
          aria-expanded={startOpen}
          aria-haspopup="true"
          aria-label="Start menu"
        >
          <span className="win98-windows-logo" aria-hidden="true">
            <span className="win98-logo-red" />
            <span className="win98-logo-green" />
            <span className="win98-logo-blue" />
            <span className="win98-logo-yellow" />
          </span>
          Start
        </button>

        <div className="win98-quick-launch">
          <a
            className="win98-quick-launch-btn"
            href="https://github.com/lewisliu"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            title="GitHub"
          >
            &#128187;
          </a>
          <a
            className="win98-quick-launch-btn"
            href="https://linkedin.com/in/lewisliu"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            title="LinkedIn"
          >
            &#128101;
          </a>
          <a
            className="win98-quick-launch-btn"
            href="https://twitter.com/lewisliu_dev"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Twitter"
            title="Twitter"
          >
            &#128172;
          </a>
        </div>

        <button
          className={`win98-task-btn${windowState !== 'minimized' ? ' win98-task-btn--active' : ''}`}
          onClick={handleTaskBtnClick}
          aria-label="Terminal window"
        >
          <span className="win98-terminal-icon" aria-hidden="true" style={{ width: 10, height: 8, flexShrink: 0 }} />
          Terminal.exe
        </button>

        <SystemTray />
      </div>
    </>
  )
}
