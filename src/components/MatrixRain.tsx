import { useEffect, useRef, useCallback } from 'react'

interface MatrixRainProps {
  readonly onComplete: () => void
}

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%^&*()_+-=[]{}|;:,.<>?/~`\u30A2\u30A4\u30A6\u30A8\u30AA\u30AB\u30AD\u30AF\u30B1\u30B3'
const DURATION_MS = 5000

function randomChar(): string {
  return CHARS[Math.floor(Math.random() * CHARS.length)]
}

export default function MatrixRain({ onComplete }: MatrixRainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stoppedRef = useRef(false)

  const stop = useCallback(() => {
    if (stoppedRef.current) return
    stoppedRef.current = true
    onComplete()
  }, [onComplete])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const parent = canvas.parentElement
    if (!parent) return

    const width = parent.clientWidth
    const height = parent.clientHeight
    canvas.width = width
    canvas.height = height

    const fontSize = 14
    const columns = Math.floor(width / fontSize)
    const drops: number[] = Array.from({ length: columns }, () =>
      Math.random() * -height / fontSize
    )

    let animId: number
    const draw = () => {
      if (stoppedRef.current) return

      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'
      ctx.fillRect(0, 0, width, height)
      ctx.font = `${fontSize}px 'JetBrains Mono', monospace`

      for (let i = 0; i < drops.length; i++) {
        const char = randomChar()
        const x = i * fontSize
        const y = drops[i] * fontSize

        // Leading character is bright white-green
        ctx.fillStyle = '#ffffff'
        ctx.fillText(char, x, y)

        // Trail character behind it
        if (drops[i] > 1) {
          ctx.fillStyle = '#00ff41'
          ctx.fillText(randomChar(), x, y - fontSize)
        }

        if (y > height && Math.random() > 0.975) {
          drops[i] = 0
        }
        drops[i] += 0.5 + Math.random() * 0.5
      }

      animId = requestAnimationFrame(draw)
    }

    animId = requestAnimationFrame(draw)

    const timer = setTimeout(stop, DURATION_MS)

    // Delay attaching keydown listener to avoid the Enter key that launched the command
    const handleKey = () => stop()
    const keyTimer = setTimeout(() => {
      window.addEventListener('keydown', handleKey, { once: true })
    }, 300)

    return () => {
      cancelAnimationFrame(animId)
      clearTimeout(timer)
      clearTimeout(keyTimer)
      window.removeEventListener('keydown', handleKey)
    }
  }, [stop])

  return (
    <div className="matrix-rain-container">
      <canvas ref={canvasRef} className="matrix-rain-canvas" />
      <div className="matrix-rain-hint">Press any key to exit</div>
    </div>
  )
}
