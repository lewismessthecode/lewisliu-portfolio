export interface Background {
  readonly name: string
  readonly label: string
  readonly css: Record<string, string>
}

export const BACKGROUNDS: readonly Background[] = [
  {
    name: 'teal',
    label: 'Classic Teal (Windows 95/98)',
    css: { background: '#008080' },
  },
  {
    name: 'pixel',
    label: 'Pixel Art Landscape',
    css: {},
  },
]

export const DEFAULT_BACKGROUND = 'teal'

export function getBackground(name: string): Background | undefined {
  return BACKGROUNDS.find((b) => b.name === name)
}

export function applyBackground(name: string): void {
  const bg = getBackground(name)
  if (!bg) return
  const el = document.querySelector('.desktop-background') as HTMLElement | null
  if (!el) return
  el.removeAttribute('data-bg')
  for (const [key, value] of Object.entries(bg.css)) {
    el.style.setProperty(key, value)
  }
  if (name === 'pixel') {
    el.setAttribute('data-bg', 'pixel')
    el.style.removeProperty('background')
  }
  localStorage.setItem('terminal-background', name)
}

export function loadSavedBackground(): string {
  return localStorage.getItem('terminal-background') ?? DEFAULT_BACKGROUND
}
