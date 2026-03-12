import { useState, useEffect } from 'react'
import { useDesktop } from '../lib/desktop-context'

function formatTime(): string {
  const now = new Date()
  return now.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export default function StatusBar() {
  const { currentTheme, commandCount } = useDesktop()
  const [time, setTime] = useState('')

  useEffect(() => {
    setTime(formatTime())
    const id = setInterval(() => setTime(formatTime()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="terminal-statusbar">
      <div className="terminal-statusbar-left">
        <span className="terminal-statusbar-dot" aria-hidden="true" />
        <span>connected</span>
      </div>
      <div className="terminal-statusbar-right">
        <span>{currentTheme}</span>
        <span className="terminal-statusbar-sep" aria-hidden="true">|</span>
        <span>cmd: {commandCount}</span>
        <span className="terminal-statusbar-sep" aria-hidden="true">|</span>
        <span>{time}</span>
      </div>
    </div>
  )
}
