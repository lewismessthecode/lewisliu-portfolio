import { useEffect, useRef, useState } from 'react'
import { useDesktop } from '../lib/desktop-context'

export default function StartMenu({ onClose }: { readonly onClose: () => void }) {
  const { openWindow, executeCommand, soundEnabled, toggleSound } = useDesktop()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus()
    const handlePointer = (event: MouseEvent) => {
      if (event.target instanceof Element && !ref.current?.contains(event.target) && !event.target.closest('.win98-start-btn')) onClose()
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        document.querySelector<HTMLButtonElement>('.win98-start-btn')?.focus()
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const items = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"], [role="menuitemcheckbox"]') ?? [])
        if (!items.length) return
        event.preventDefault()
        const index = items.findIndex((item) => item === document.activeElement)
        const offset = event.key === 'ArrowDown' ? 1 : -1
        items[(index + offset + items.length) % items.length]?.focus()
      }
    }
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => { document.removeEventListener('mousedown', handlePointer); document.removeEventListener('keydown', handleKey) }
  }, [onClose])

  return <div className="win98-start-menu" ref={ref} role="menu" aria-label="Start menu">
    <div className="win98-start-sidebar"><span className="win98-start-sidebar-text">Lewis Liu</span></div>
    <div className="win98-start-items">
      <button className="win98-start-item" role="menuitem" onClick={() => { openWindow('portfolio'); onClose() }}><span className="window-folder-icon" aria-hidden="true" />Portfolio</button>
      <button className="win98-start-item" role="menuitem" onClick={() => { openWindow('resume'); onClose() }}><span className="window-document-icon" aria-hidden="true" />Resume</button>
      <button className="win98-start-item" role="menuitem" onClick={() => { openWindow('terminal'); onClose() }}><span className="win98-terminal-icon" aria-hidden="true" />Terminal</button>
      <div className="win98-start-separator" role="separator" />
      <button className="win98-start-item" role="menuitem" aria-expanded={settingsOpen} onClick={() => setSettingsOpen((open) => !open)}><span className="win98-settings-icon" aria-hidden="true">⚙</span>Settings <span className="win98-settings-arrow" aria-hidden="true">{settingsOpen ? '▾' : '▸'}</span></button>
      {settingsOpen && <div className="win98-settings-items" role="group" aria-label="Settings">
        <button className="win98-start-item" role="menuitem" onClick={() => { executeCommand('theme'); onClose() }}><span className="win98-sound-check" aria-hidden="true" />Terminal themes</button>
        <button className="win98-start-item" role="menuitem" onClick={() => { executeCommand('background'); onClose() }}><span className="win98-sound-check" aria-hidden="true" />Desktop backgrounds</button>
        <button className="win98-start-item" role="menuitemcheckbox" aria-checked={soundEnabled} onClick={toggleSound}><span className="win98-sound-check" aria-hidden="true">{soundEnabled ? '✓' : ''}</span>Sound</button>
      </div>}
    </div>
  </div>
}
