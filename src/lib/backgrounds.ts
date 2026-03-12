export interface Background {
  readonly name: string
  readonly label: string
  readonly css: Record<string, string>
}

// Backgrounds with empty css use data-bg attribute for pure CSS styling
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
  {
    name: 'starfield',
    label: 'Starfield',
    css: {},
  },
  {
    name: 'synthwave',
    label: 'Synthwave Grid',
    css: {},
  },
  {
    name: 'matrix-bg',
    label: 'Matrix Rain',
    css: {},
  },
  {
    name: 'gradient-mesh',
    label: 'Gradient Mesh',
    css: {},
  },
]

export const DEFAULT_BACKGROUND = 'teal'

export function getBackground(name: string): Background | undefined {
  return BACKGROUNDS.find((b) => b.name === name)
}

const CSS_ONLY_BACKGROUNDS = new Set(['pixel', 'starfield', 'synthwave', 'matrix-bg', 'gradient-mesh'])

export function applyBackground(name: string): void {
  const bg = getBackground(name)
  if (!bg) return
  const el = document.querySelector('.desktop-background') as HTMLElement | null
  if (!el) return

  el.removeAttribute('data-bg')
  el.style.removeProperty('background')

  if (CSS_ONLY_BACKGROUNDS.has(name)) {
    el.setAttribute('data-bg', name)
  } else {
    for (const [key, value] of Object.entries(bg.css)) {
      el.style.setProperty(key, value)
    }
  }

  localStorage.setItem('terminal-background', name)
}

export function loadSavedBackground(): string {
  return localStorage.getItem('terminal-background') ?? DEFAULT_BACKGROUND
}
