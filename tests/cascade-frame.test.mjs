import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cascadeCountStyle, windowFrameStyle } from '../src/lib/cascade-frame.ts'

test('resting windows keep a cascade slot and only a drag sets left and top', () => {
  assert.deepEqual(windowFrameStyle({ cascadeSlot: 1, cascadeCount: 3, dragged: null, maximized: false }), { '--cascade-slot': '1' })
  assert.deepEqual(windowFrameStyle({ cascadeSlot: 1, cascadeCount: 3, dragged: { left: 40, top: 50 }, maximized: false }), { '--cascade-slot': '1', left: 40, top: 50 })
  assert.deepEqual(windowFrameStyle({ cascadeSlot: 1, cascadeCount: 3, dragged: { left: 40, top: 50 }, maximized: true }), { '--cascade-slot': '1' })
  assert.deepEqual(cascadeCountStyle(3), { '--cascade-count': '3' })
  assert.throws(() => cascadeCountStyle(0))
  assert.throws(() => windowFrameStyle({ cascadeSlot: 3, cascadeCount: 3, dragged: null, maximized: false }))
})
