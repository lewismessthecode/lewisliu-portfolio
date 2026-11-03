import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildSync } from 'esbuild'

const bundle = buildSync({
  stdin: {
    contents: 'export { createCommands } from "./src/lib/commands.ts"; export { createTerminalEngine } from "./src/lib/terminal-engine.ts"; export { loadSavedTheme } from "./src/lib/themes.ts";',
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  bundle: true,
  platform: 'node',
  format: 'cjs',
  write: false,
}).outputFiles[0].text
const module = { exports: {} }
new Function('module', 'exports', bundle)(module, module.exports)
const { createCommands, createTerminalEngine, loadSavedTheme } = module.exports

function shell() {
  const data = {
    about: 'Lewis builds thoughtful software',
    skills: [],
    projects: [
      { title: 'Old project', description: 'Archive', tags: [], body: '' },
      { title: 'Loadout', description: 'Skills manager', tags: [], body: 'Local agent skills', featuredOrder: 1, github: 'https://github.com/example/loadout' },
      { title: 'Folio', description: '<img src=x onerror=alert(1)>', tags: [], body: 'Reading library', featuredOrder: 2 },
    ],
    garden: [],
    contact: { email: 'lewis@example.org', github: 'lewis', twitter: 'lewis' },
    resume: 'Software engineer',
  }
  let engine
  const { commands, getWorkingDirectory } = createCommands(data, () => engine.clearLines())
  engine = createTerminalEngine(commands, getWorkingDirectory)
  return {
    engine,
    run(command) {
      engine.clearLines()
      engine.executeCommand(command)
      return engine.getState().lines
    },
  }
}
const text = (lines) => lines.map((line) => line.text).join('\n')

test('the classic theme is the default without replacing a saved choice', () => {
  const previous = globalThis.localStorage
  try {
    globalThis.localStorage = { getItem: () => null }
    assert.equal(loadSavedTheme(), 'classic')
    globalThis.localStorage = { getItem: () => 'one-dark' }
    assert.equal(loadSavedTheme(), 'one-dark')
  } finally {
    globalThis.localStorage = previous
  }
})

test('browse the virtual portfolio and return home with normal shell paths', () => {
  const { engine, run } = shell()
  assert.match(text(run('pwd')), /\/home\/lewis/)
  assert.match(text(run('ls')), /about\.txt/)
  assert.match(text(run('ls ~/projects')), /loadout\.md/)
  run('cd projects')
  assert.match(engine.getPrompt(), /~\/projects\$$/)
  assert.match(text(run('pwd')), /\/home\/lewis\/projects/)
  assert.match(text(run('cat loadout.md')), /Local agent skills/)
  run('cd ../..')
  assert.match(text(run('pwd')), /\/home/)
  run('cd ~')
  assert.match(text(run('pwd')), /\/home\/lewis/)
  run('cd /')
  assert.equal(engine.getPrompt(), 'lewis@portfolio:/$')
})

test('invalid paths and write operations report errors without changing state', () => {
  const { engine, run } = shell()
  for (const [command, message] of [
    ['cd missing', /No such file or directory/],
    ['cd about.txt', /Not a directory/],
    ['cat projects', /Is a directory/],
    ['cat about.txt/', /Not a directory/],
    ['cat missing', /No such file or directory/],
    ['ls missing/..', /No such file or directory/],
    ['rm about.txt', /read-only filesystem/],
    ['mkdir new', /read-only filesystem/],
    ['ping example.org', /command not found/],
  ]) {
    const result = run(command)
    assert.equal(result.at(-1).type, 'error', command)
    assert.match(text(result), message, command)
    assert.equal(engine.getPrompt(), 'lewis@portfolio:~$')
  }
  assert.match(text(run('cat about.txt')), /thoughtful software/)
})

test('personal commands remain available, preserve project numbers and render data safely', () => {
  const { run } = shell()
  assert.match(text(run('project 1')), /Old project/)
  assert.match(text(run('project 2')), /Loadout/)
  assert.match(text(run('project loadout')), /Skills manager/)
  assert.match(text(run('project folio')), /Reading library/)
  assert.match(text(run('project "Old project"')), /Archive/)
  assert.match(text(run('project missing')), /Project not found/)
  assert.match(text(run('projects')), /Loadout/)
  assert.match(text(run('projects')), /project <name>/)
  assert.doesNotMatch(text(run('projects')), /Old project/)
  assert.match(text(run('garden')), /No entries found/)
  assert.match(text(run('help')), /pwd/)
  assert.match(text(run('help')), /cat/)
  const lines = run('cat ~/projects/folio.md')
  const unsafe = lines.find((line) => line.text.includes('<img'))
  assert.ok(unsafe)
  assert.notEqual(unsafe.isHtml, true)
  assert.match(text(run('echo "hello world"')), /hello world/)
})

test('agent commands clearly identify their scripted examples', () => {
  const { run } = shell()
  for (const command of ['codex', 'claude']) {
    assert.match(text(run(command)), /scripted, no AI connection/)
    assert.match(text(run(`${command} demo`)), /scripted, no AI connection/)
    assert.match(text(run(`${command} anything else`)), /only the scripted demo/)
  }
  assert.match(text(run('codex demo')), /Skills manager/)
  const claudeDemo = run('claude demo')
  assert.match(text(claudeDemo), /What is Folio/)
  assert.notEqual(claudeDemo.find((line) => line.text.includes('<img')).isHtml, true)
})
