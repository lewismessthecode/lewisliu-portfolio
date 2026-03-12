import { useState, useCallback } from 'react'
import { useDesktop } from '../lib/desktop-context'

interface DesktopIcon {
  readonly id: string
  readonly label: string
  readonly command: string
  readonly iconClass: string
}

const ICONS: readonly DesktopIcon[] = [
  { id: 'computer', label: 'My Computer', command: 'about', iconClass: 'icon-computer' },
  { id: 'projects', label: 'Projects', command: 'projects', iconClass: 'icon-folder' },
  { id: 'blog', label: 'Blog', command: 'garden', iconClass: 'icon-globe' },
  { id: 'contact', label: 'Contact', command: 'contact', iconClass: 'icon-envelope' },
  { id: 'resume', label: 'Resume.pdf', command: 'resume', iconClass: 'icon-document' },
]

export default function DesktopIcons() {
  const { executeCommand } = useDesktop()
  const [selected, setSelected] = useState<string | null>(null)
  const lastClickRef = { current: { id: '', time: 0 } }

  const handleClick = useCallback((icon: DesktopIcon) => {
    const now = Date.now()
    const last = lastClickRef.current

    if (last.id === icon.id && now - last.time < 400) {
      executeCommand(icon.command)
      setSelected(null)
      lastClickRef.current = { id: '', time: 0 }
    } else {
      setSelected(icon.id)
      lastClickRef.current = { id: icon.id, time: now }
    }
  }, [executeCommand])

  const handleKeyDown = useCallback((e: React.KeyboardEvent, icon: DesktopIcon) => {
    if (e.key === 'Enter') {
      executeCommand(icon.command)
    }
  }, [executeCommand])

  return (
    <div className="win98-icons" role="list" aria-label="Desktop icons">
      {ICONS.map((icon) => (
        <button
          key={icon.id}
          className={`win98-icon${selected === icon.id ? ' win98-icon--selected' : ''}`}
          onClick={() => handleClick(icon)}
          onKeyDown={(e) => handleKeyDown(e, icon)}
          role="listitem"
          aria-label={`${icon.label} - double click to open`}
        >
          <div className="win98-icon-graphic">
            <div className={icon.iconClass} />
          </div>
          <span className="win98-icon-label">{icon.label}</span>
        </button>
      ))}
    </div>
  )
}
