import { useRef, useState } from 'react'
import type { PointerEvent, ReactNode } from 'react'
import { useDesktop, type WindowId } from '../lib/desktop-context'
import { windowFrameStyle } from '../lib/cascade-frame'
import { isVisible } from '../lib/window-state'

export default function Window({ id, title, icon, cascadeSlot, cascadeCount, children }: { readonly id: WindowId; readonly title: string; readonly icon: 'folder' | 'terminal' | 'document'; readonly cascadeSlot: number; readonly cascadeCount: number; readonly children: ReactNode }) {
  const { windows, activeWindow, focusWindow, minimizeWindow, maximizeWindow, closeWindow } = useDesktop()
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null)
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null)
  const status = windows[id]
  const maximized = status === 'maximized'
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    focusWindow(id)
    if (maximized || event.pointerType !== 'mouse' || (event.target instanceof Element && event.target.closest('button'))) return
    const rect = ref.current?.getBoundingClientRect()
    const parent = ref.current?.parentElement?.getBoundingClientRect()
    if (!rect || !parent) return
    drag.current = { x: event.clientX, y: event.clientY, left: rect.left - parent.left, top: rect.top - parent.top }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current || !ref.current?.parentElement) return
    const parent = ref.current.parentElement.getBoundingClientRect()
    const rect = ref.current.getBoundingClientRect()
    setPosition({ left: Math.max(0, Math.min(parent.width - rect.width, drag.current.left + event.clientX - drag.current.x)), top: Math.max(0, Math.min(parent.height - rect.height, drag.current.top + event.clientY - drag.current.y)) })
  }
  return <div ref={ref} className={`desktop-window desktop-window--${id} win98-window${maximized ? ' desktop-window--maximized' : ''}${activeWindow === id ? ' desktop-window--active' : ''}`} style={windowFrameStyle({ cascadeSlot, cascadeCount, dragged: position, maximized })} hidden={!isVisible(status)} onPointerDown={() => focusWindow(id)} onFocusCapture={() => focusWindow(id)}>
    <div className="win98-titlebar" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }} onDoubleClick={(event) => { if (!(event.target instanceof Element) || !event.target.closest('button')) maximizeWindow(id) }}>
      <span className={icon === 'folder' ? 'window-folder-icon' : icon === 'terminal' ? 'win98-terminal-icon' : 'window-document-icon'} aria-hidden="true" />
      <span className="win98-titlebar-title">{title}</span>
      <div className="win98-titlebar-buttons">
        <button className="win98-btn win98-btn-minimize" type="button" aria-label={`Minimize ${title}`} onClick={() => minimizeWindow(id)}>_</button>
        <button className="win98-btn" type="button" aria-label={`${maximized ? 'Restore' : 'Maximize'} ${title}`} onClick={() => maximizeWindow(id)}>{maximized ? '❐' : '□'}</button>
        <button className="win98-btn" type="button" aria-label={`Close ${title}`} onClick={() => closeWindow(id)}>×</button>
      </div>
    </div>
    {children}
  </div>
}
