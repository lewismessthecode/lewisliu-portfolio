import { useCallback, useState } from 'react'
import { useDesktop } from '../lib/desktop-context'
import StartMenu from './StartMenu'
import SystemTray from './SystemTray'

export default function Taskbar() {
  const { windows, activeWindow, selectTask } = useDesktop()
  const [startOpen, setStartOpen] = useState(false)
  const closeStart = useCallback(() => setStartOpen(false), [])
  return <>
    {startOpen && <StartMenu onClose={closeStart} />}
    <div className="win98-taskbar" role="toolbar" aria-label="Taskbar">
      <button className={`win98-start-btn${startOpen ? ' win98-start-btn--active' : ''}`} onClick={() => setStartOpen((open) => !open)} aria-expanded={startOpen} aria-haspopup="menu">
        <span className="win98-windows-logo" aria-hidden="true"><span className="win98-logo-red" /><span className="win98-logo-green" /><span className="win98-logo-blue" /><span className="win98-logo-yellow" /></span>Start
      </button>
      {([{ id: 'portfolio', label: 'Portfolio', icon: 'window-folder-icon' }, { id: 'resume', label: 'Resume', icon: 'window-document-icon' }, { id: 'terminal', label: 'Terminal', icon: 'win98-terminal-icon' }] as const).map(({ id, label, icon }) => windows[id] !== 'closed' && <button key={id} className={`win98-task-btn${activeWindow === id ? ' win98-task-btn--active' : ''}`} onClick={() => selectTask(id)} aria-pressed={activeWindow === id}>
        <span className={icon} aria-hidden="true" />{label}
      </button>)}
      <SystemTray />
    </div>
  </>
}
