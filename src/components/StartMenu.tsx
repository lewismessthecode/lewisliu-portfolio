import { useEffect, useRef } from 'react'
import { useDesktop } from '../lib/desktop-context'
export default function StartMenu({ onClose }: { readonly onClose: () => void }) {
  const { openWindow, executeCommand } = useDesktop()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handlePointer = (event: MouseEvent) => {
      if (event.target instanceof Element && !ref.current?.contains(event.target) && !event.target.closest('.win98-start-btn')) onClose()
    }
    const handleKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => { document.removeEventListener('mousedown', handlePointer); document.removeEventListener('keydown', handleKey) }
  }, [onClose])
  return <div className="win98-start-menu" ref={ref} role="menu" aria-label="Start menu">
    <div className="win98-start-sidebar"><span className="win98-start-sidebar-text">Lewis Liu</span></div>
    <div className="win98-start-items">
      <button className="win98-start-item" role="menuitem" onClick={() => { openWindow('portfolio'); onClose() }}><span className="window-folder-icon" aria-hidden="true" />Portfolio</button>
      <button className="win98-start-item" role="menuitem" onClick={() => { openWindow('terminal'); onClose() }}><span className="win98-terminal-icon" aria-hidden="true" />Terminal</button>
      <div className="win98-start-separator" />
      {(['about', 'projects', 'garden', 'contact', 'resume', 'theme'] as const).map((command) => <button className="win98-start-item" role="menuitem" key={command} onClick={() => { executeCommand(command); onClose() }}><span className="menu-command-icon" aria-hidden="true">›</span>{command[0].toUpperCase() + command.slice(1)}</button>)}
    </div>
  </div>
}
