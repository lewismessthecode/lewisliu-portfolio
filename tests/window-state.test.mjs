import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialDesktopState, reduceDesktop } from '../src/lib/window-state.ts'

test('opening and focusing windows keeps both available', () => {
  const opened = reduceDesktop(initialDesktopState, { type: 'open', id: 'terminal' })
  assert.deepEqual(opened, { windows: { portfolio: 'normal', terminal: 'normal' }, active: 'terminal' })
  const focused = reduceDesktop(opened, { type: 'task', id: 'portfolio' })
  assert.equal(focused.active, 'portfolio')
  assert.equal(focused.windows.terminal, 'normal')
})

test('taskbar restores a minimized maximized window and closing returns focus', () => {
  let state = reduceDesktop(initialDesktopState, { type: 'maximize', id: 'portfolio' })
  state = reduceDesktop(state, { type: 'minimize', id: 'portfolio' })
  state = reduceDesktop(state, { type: 'task', id: 'portfolio' })
  assert.equal(state.windows.portfolio, 'maximized')
  state = reduceDesktop(state, { type: 'open', id: 'terminal' })
  state = reduceDesktop(state, { type: 'close', id: 'terminal' })
  assert.equal(state.active, 'portfolio')
  assert.equal(state.windows.terminal, 'closed')
})

test('taskbar toggles the active window and reopens the desktop', () => {
  let state = reduceDesktop(initialDesktopState, { type: 'task', id: 'portfolio' })
  assert.equal(state.windows.portfolio, 'minimized')
  assert.equal(state.active, null)
  state = reduceDesktop(state, { type: 'task', id: 'portfolio' })
  assert.equal(state.windows.portfolio, 'normal')
  assert.equal(state.active, 'portfolio')
})
