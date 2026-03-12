export interface TerminalLine {
  readonly type: 'input' | 'output' | 'error' | 'system' | 'animation'
  readonly text: string
  readonly isHtml?: boolean
  readonly animationId?: string
}

export interface Command {
  readonly name: string
  readonly description: string
  readonly execute: (args: readonly string[]) => readonly TerminalLine[]
}

export interface TerminalState {
  readonly lines: readonly TerminalLine[]
  readonly history: readonly string[]
  readonly historyIndex: number
  readonly currentInput: string
}

const INITIAL_STATE: TerminalState = {
  lines: [],
  history: [],
  historyIndex: -1,
  currentInput: '',
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      )
    }
  }

  return dp[m][n]
}

const UNIX_HINTS: ReadonlyMap<string, string> = new Map([
  ['ls', "Try 'help' to see available commands."],
  ['cd', "Navigation works via commands: about, projects, garden, etc."],
  ['cat', "To read content, use: read <slug>"],
  ['man', "Try: help"],
  ['pwd', "~/lewis/portfolio"],
  ['sudo', "Nice try. No root access here."],
  ['vim', "This terminal is already perfect. No editor needed."],
  ['nano', "This terminal is already perfect. No editor needed."],
  ['exit', "There is no escape. But try 'help' for things to do."],
  ['rm', "Whoa there. Nothing to delete in this terminal."],
  ['mkdir', "This is a read-only terminal. Try 'projects' instead."],
  ['ssh', "You're already connected to lewis@portfolio."],
  ['ping', "Pong! Lewis is reachable at 'contact'."],
  ['grep', "Try 'garden --tag <tag>' to filter content."],
])

export function createTerminalEngine(commands: ReadonlyMap<string, Command>) {
  let state: TerminalState = { ...INITIAL_STATE }
  const listeners: Set<(state: TerminalState) => void> = new Set()

  function notify(): void {
    for (const listener of listeners) {
      listener(state)
    }
  }

  function addLines(newLines: readonly TerminalLine[]): void {
    state = { ...state, lines: [...state.lines, ...newLines] }
  }

  function findFuzzyMatch(input: string): string | null {
    let bestMatch: string | null = null
    let bestDistance = Infinity

    for (const name of commands.keys()) {
      const dist = levenshtein(input, name)
      if (dist <= 2 && dist < bestDistance) {
        bestDistance = dist
        bestMatch = name
      }
    }

    return bestMatch
  }

  function executeCommand(raw: string): void {
    const trimmed = raw.trim()
    if (!trimmed) return

    addLines([{ type: 'input', text: `lewis@portfolio:~$ ${trimmed}` }])

    const newHistory = [...state.history.filter((h) => h !== trimmed), trimmed]
    state = { ...state, history: newHistory, historyIndex: -1 }

    const parts = parseInput(trimmed)
    const cmdName = parts[0].toLowerCase()
    const args = parts.slice(1)

    const command = commands.get(cmdName)
    if (command) {
      const output = command.execute(args)
      addLines(output)
    } else {
      // Check for UNIX command hints
      const hint = UNIX_HINTS.get(cmdName)
      if (hint) {
        addLines([{ type: 'system', text: hint }])
      } else {
        // Try fuzzy matching
        const fuzzy = findFuzzyMatch(cmdName)
        if (fuzzy) {
          addLines([
            {
              type: 'error',
              text: `Unknown command: ${cmdName}. Did you mean: ${fuzzy}?`,
            },
          ])
        } else {
          addLines([
            {
              type: 'error',
              text: `Unknown command: ${cmdName}. Type 'help' for available commands.`,
            },
          ])
        }
      }
    }

    notify()
  }

  function clearLines(): void {
    state = { ...state, lines: [] }
    notify()
  }

  function navigateHistory(direction: 'up' | 'down'): string {
    const { history, historyIndex } = state
    if (history.length === 0) return state.currentInput

    let newIndex: number
    if (direction === 'up') {
      newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1)
    } else {
      newIndex = historyIndex === -1 ? -1 : Math.min(history.length - 1, historyIndex + 1)
      if (historyIndex >= history.length - 1) {
        state = { ...state, historyIndex: -1 }
        notify()
        return ''
      }
    }

    state = { ...state, historyIndex: newIndex }
    notify()
    return history[newIndex] ?? ''
  }

  function tabComplete(partial: string): string {
    if (!partial) return ''
    const lower = partial.toLowerCase()
    const matches = Array.from(commands.keys()).filter((name) => name.startsWith(lower))
    if (matches.length === 1) return matches[0]
    return partial
  }

  function getCompletions(partial: string): readonly string[] {
    if (!partial) return Array.from(commands.keys()).sort()
    const lower = partial.toLowerCase()
    return Array.from(commands.keys())
      .filter((name) => name.startsWith(lower))
      .sort()
  }

  function subscribe(listener: (state: TerminalState) => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  function getState(): TerminalState {
    return state
  }

  function setLines(lines: readonly TerminalLine[]): void {
    state = { ...state, lines }
    notify()
  }

  return {
    executeCommand,
    clearLines,
    navigateHistory,
    tabComplete,
    getCompletions,
    subscribe,
    getState,
    addLines: (lines: readonly TerminalLine[]) => {
      addLines(lines)
      notify()
    },
    setLines,
  }
}

function parseInput(input: string): readonly string[] {
  const parts: string[] = []
  let current = ''
  let inQuote = false
  let quoteChar = ''

  for (const char of input) {
    if (inQuote) {
      if (char === quoteChar) {
        inQuote = false
      } else {
        current += char
      }
    } else if (char === '"' || char === "'") {
      inQuote = true
      quoteChar = char
    } else if (char === ' ') {
      if (current) {
        parts.push(current)
        current = ''
      }
    } else {
      current += char
    }
  }

  if (current) parts.push(current)
  return parts
}

export type TerminalEngine = ReturnType<typeof createTerminalEngine>
