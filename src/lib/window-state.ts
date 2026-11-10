export type WindowId = 'portfolio' | 'terminal' | 'resume'
export type WindowState = 'closed' | 'normal' | 'minimized' | 'maximized' | 'minimized-maximized'
export type DesktopState = { windows: Record<WindowId, WindowState>; active: WindowId | null }
export type WindowAction = { type: 'open' | 'focus' | 'minimize' | 'maximize' | 'close' | 'task'; id: WindowId }

const windows: WindowId[] = ['portfolio', 'terminal', 'resume']
export const initialDesktopState: DesktopState = { windows: { portfolio: 'normal', terminal: 'closed', resume: 'closed' }, active: 'portfolio' }
export const isVisible = (state: WindowState) => state === 'normal' || state === 'maximized'
const restored = (state: WindowState): WindowState => state === 'minimized-maximized' ? 'maximized' : isVisible(state) ? state : 'normal'
const nextVisible = (state: DesktopState, id: WindowId) => windows.find((other) => other !== id && isVisible(state.windows[other])) ?? null

export function reduceDesktop(state: DesktopState, { type, id }: WindowAction): DesktopState {
  const current = state.windows[id]
  if (type === 'open') return { windows: { ...state.windows, [id]: restored(current) }, active: id }
  if (type === 'focus') return isVisible(current) ? { ...state, active: id } : state
  if (type === 'task') {
    if (!isVisible(current)) return { windows: { ...state.windows, [id]: restored(current) }, active: id }
    if (state.active !== id) return { ...state, active: id }
    type = 'minimize'
  }
  if (type === 'maximize' && isVisible(current)) return { windows: { ...state.windows, [id]: current === 'maximized' ? 'normal' : 'maximized' }, active: id }
  if (type === 'minimize' || type === 'close') return {
    windows: { ...state.windows, [id]: type === 'close' ? 'closed' : current === 'maximized' ? 'minimized-maximized' : 'minimized' },
    active: state.active === id ? nextVisible(state, id) : state.active,
  }
  return state
}
