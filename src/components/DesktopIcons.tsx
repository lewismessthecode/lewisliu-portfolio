import { useDesktop } from '../lib/desktop-context'
export default function DesktopIcons() {
  const { openWindow } = useDesktop()
  return <div className="win98-icons" aria-label="Desktop shortcuts">
    <button className="win98-icon" type="button" onClick={() => openWindow('portfolio')}><span className="desktop-folder" aria-hidden="true" /><span className="win98-icon-label">Work</span></button>
    <button className="win98-icon" type="button" onClick={() => openWindow('terminal')}><span className="desktop-prompt" aria-hidden="true">&gt;_</span><span className="win98-icon-label">Terminal</span></button>
  </div>
}
