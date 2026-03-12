import { useState, useEffect } from 'react'

function formatClock(): string {
  const now = new Date()
  return now.toLocaleTimeString('en-US', {
    hour12: true,
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function SystemTray() {
  const [time, setTime] = useState('')

  useEffect(() => {
    setTime(formatClock())
    const id = setInterval(() => setTime(formatClock()), 60_000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="win98-systray">
      <span className="win98-systray-icon" aria-label="Volume" title="Volume">
        &#128266;
      </span>
      <span className="win98-systray-clock" aria-label={`Current time: ${time}`}>
        {time}
      </span>
    </div>
  )
}
