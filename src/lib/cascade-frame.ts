import type { CSSProperties } from 'react'

type CountStyle = CSSProperties & { '--cascade-count': string }
type SlotStyle = CSSProperties & { '--cascade-slot': string }

function requireCascadeCount(count: number): void {
  if (!Number.isInteger(count) || count < 1) throw new Error('cascade count must be an integer >= 1')
}

export function cascadeCountStyle(count: number): CSSProperties {
  requireCascadeCount(count)
  const style: CountStyle = { '--cascade-count': String(count) }
  return style
}

export function windowFrameStyle(input: {
  cascadeSlot: number
  cascadeCount: number
  dragged: { left: number; top: number } | null
  maximized: boolean
}): CSSProperties {
  requireCascadeCount(input.cascadeCount)
  if (!Number.isInteger(input.cascadeSlot) || input.cascadeSlot < 0 || input.cascadeSlot >= input.cascadeCount) {
    throw new Error('cascade slot must be an integer inside the resting frame list')
  }
  const slot = String(input.cascadeSlot)
  if (input.dragged !== null && !input.maximized) {
    const placed: SlotStyle = { '--cascade-slot': slot, left: input.dragged.left, top: input.dragged.top }
    return placed
  }
  const resting: SlotStyle = { '--cascade-slot': slot }
  return resting
}
