const SOUND_KEY = 'desktop-sound'
let audio: AudioContext | undefined

export function loadSoundEnabled(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) === 'on'
  } catch {
    return false
  }
}

export function saveSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(SOUND_KEY, enabled ? 'on' : 'off')
  } catch {
    return
  }
}

export function playDesktopClick(): void {
  try {
    if (typeof AudioContext === 'undefined') return
    audio ??= new AudioContext()
    if (audio.state === 'suspended') {
      void audio.resume().catch(() => {})
      return
    }
    const oscillator = audio.createOscillator()
    const volume = audio.createGain()
    const start = audio.currentTime
    oscillator.type = 'triangle'
    oscillator.frequency.setValueAtTime(820, start)
    oscillator.frequency.exponentialRampToValueAtTime(510, start + 0.035)
    volume.gain.setValueAtTime(0.0001, start)
    volume.gain.exponentialRampToValueAtTime(0.035, start + 0.004)
    volume.gain.exponentialRampToValueAtTime(0.0001, start + 0.045)
    oscillator.connect(volume)
    volume.connect(audio.destination)
    oscillator.start(start)
    oscillator.stop(start + 0.05)
  } catch {
    return
  }
}
