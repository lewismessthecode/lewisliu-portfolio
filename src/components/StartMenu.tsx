import { useState, useEffect, useRef } from 'react'
import { useDesktop } from '../lib/desktop-context'
import { THEMES } from '../lib/themes'

interface StartMenuProps {
  readonly onClose: () => void
}

export default function StartMenu({ onClose }: StartMenuProps) {
  const { executeCommand, currentTheme } = useDesktop()
  const [themeSubmenu, setThemeSubmenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        const startBtn = (e.target as HTMLElement).closest('.win98-start-btn')
        if (!startBtn) {
          onClose()
        }
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  const runCommand = (cmd: string) => {
    executeCommand(cmd)
    onClose()
  }

  const handleThemeSelect = (name: string) => {
    executeCommand(`theme ${name}`)
    onClose()
  }

  return (
    <div className="win98-start-menu" ref={menuRef} role="menu" aria-label="Start menu">
      <div className="win98-start-sidebar">
        <span className="win98-start-sidebar-text">Lewis Liu</span>
      </div>
      <div className="win98-start-items">
        <button className="win98-start-item" role="menuitem" onClick={() => runCommand('about')}>
          <span className="win98-start-item-icon" aria-hidden="true">&#128100;</span>
          About
        </button>
        <button className="win98-start-item" role="menuitem" onClick={() => runCommand('now')}>
          <span className="win98-start-item-icon" aria-hidden="true">&#9881;</span>
          Now
        </button>
        <button className="win98-start-item" role="menuitem" onClick={() => runCommand('projects')}>
          <span className="win98-start-item-icon" aria-hidden="true">&#128193;</span>
          Projects
        </button>
        <button className="win98-start-item" role="menuitem" onClick={() => runCommand('wins')}>
          <span className="win98-start-item-icon" aria-hidden="true">&#127942;</span>
          Wins
        </button>
        <button className="win98-start-item" role="menuitem" onClick={() => runCommand('skills')}>
          <span className="win98-start-item-icon" aria-hidden="true">&#10070;</span>
          Skills
        </button>
        <button className="win98-start-item" role="menuitem" onClick={() => runCommand('garden')}>
          <span className="win98-start-item-icon" aria-hidden="true">&#127793;</span>
          Garden
        </button>
        <button className="win98-start-item" role="menuitem" onClick={() => runCommand('contact')}>
          <span className="win98-start-item-icon" aria-hidden="true">&#9993;</span>
          Contact
        </button>
        <button className="win98-start-item" role="menuitem" onClick={() => runCommand('resume')}>
          <span className="win98-start-item-icon" aria-hidden="true">&#128196;</span>
          Resume
        </button>
        <div className="win98-start-separator" />
        <div
          className="win98-start-item win98-start-item--has-submenu"
          role="menuitem"
          aria-haspopup="true"
          onMouseEnter={() => setThemeSubmenu(true)}
          onMouseLeave={() => setThemeSubmenu(false)}
          onFocus={() => setThemeSubmenu(true)}
        >
          <span className="win98-start-item-icon" aria-hidden="true">&#127912;</span>
          Themes
          {themeSubmenu && (
            <div className="win98-submenu" role="menu" aria-label="Theme selection">
              {THEMES.map((t) => (
                <button
                  key={t.name}
                  className="win98-start-item"
                  role="menuitem"
                  onClick={() => handleThemeSelect(t.name)}
                >
                  {t.name === currentTheme ? '\u2713 ' : '  '}
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
