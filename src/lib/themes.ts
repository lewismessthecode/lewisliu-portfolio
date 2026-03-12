export interface Theme {
  readonly name: string
  readonly label: string
  readonly bg: string
  readonly text: string
  readonly textDim: string
  readonly accent: string
  readonly border: string
  readonly glow: string
  readonly titlebarBg: string
}

export const THEMES: readonly Theme[] = [
  {
    name: 'hacker',
    label: 'Classic green on black',
    bg: '#0a0a0a',
    text: '#00ff41',
    textDim: '#4d9e5e',
    accent: '#00ff41',
    border: '#00ff4133',
    glow: '0 0 10px #00ff4140',
    titlebarBg: '#050505',
  },
  {
    name: 'dracula',
    label: 'Purple aesthetic',
    bg: '#282a36',
    text: '#f8f8f2',
    textDim: '#7283b5',
    accent: '#bd93f9',
    border: '#44475a',
    glow: '0 0 10px #bd93f940',
    titlebarBg: '#1e1f29',
  },
  {
    name: 'one-dark',
    label: 'Atom One Dark colors',
    bg: '#282c34',
    text: '#abb2bf',
    textDim: '#7a8292',
    accent: '#61afef',
    border: '#3e4451',
    glow: '0 0 10px #61afef40',
    titlebarBg: '#1e2127',
  },
  {
    name: 'monokai',
    label: 'Warm, colorful syntax theme',
    bg: '#272822',
    text: '#f8f8f2',
    textDim: '#908b75',
    accent: '#a6e22e',
    border: '#3e3d32',
    glow: '0 0 10px #a6e22e40',
    titlebarBg: '#1d1e19',
  },
  {
    name: 'amber',
    label: 'Retro amber phosphor',
    bg: '#0a0a00',
    text: '#ffb000',
    textDim: '#b88b20',
    accent: '#ffb000',
    border: '#ffb00033',
    glow: '0 0 10px #ffb00040',
    titlebarBg: '#050500',
  },
] as const

export const DEFAULT_THEME = 'hacker'

export function getTheme(name: string): Theme | undefined {
  return THEMES.find((t) => t.name === name)
}

export function applyTheme(name: string): void {
  const theme = getTheme(name)
  if (!theme) return
  document.documentElement.setAttribute('data-theme', name)
  const style = document.documentElement.style
  style.setProperty('--bg', theme.bg)
  style.setProperty('--text', theme.text)
  style.setProperty('--text-dim', theme.textDim)
  style.setProperty('--accent', theme.accent)
  style.setProperty('--border', theme.border)
  style.setProperty('--glow', theme.glow)
  style.setProperty('--titlebar-bg', theme.titlebarBg)
  localStorage.setItem('terminal-theme', name)
}

export function loadSavedTheme(): string {
  return localStorage.getItem('terminal-theme') ?? DEFAULT_THEME
}
