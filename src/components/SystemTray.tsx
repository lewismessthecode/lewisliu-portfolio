import { useState, useEffect } from 'react'
function formatClock(): string {
  return new Date().toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: '2-digit' })
}
export default function SystemTray() {
  const [time, setTime] = useState('')
  useEffect(() => { setTime(formatClock()); const id = setInterval(() => setTime(formatClock()), 60_000); return () => clearInterval(id) }, [])
  return <div className="win98-systray"><span className="win98-systray-clock" aria-label={`Current time: ${time}`}>{time}</span></div>
}
