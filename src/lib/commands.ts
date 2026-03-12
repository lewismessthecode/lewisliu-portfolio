import type { Command, TerminalLine } from './terminal-engine'
import { THEMES, applyTheme, loadSavedTheme } from './themes'
import { BACKGROUNDS, applyBackground, loadSavedBackground } from './backgrounds'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function safeUrl(url: string): string {
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:' || parsed.protocol === 'mailto:') {
      return escapeHtml(url)
    }
    return '#'
  } catch {
    return '#'
  }
}

export interface SiteData {
  readonly about: string
  readonly skills: ReadonlyArray<{ readonly category: string; readonly items: readonly string[] }>
  readonly projects: ReadonlyArray<{
    readonly title: string
    readonly description: string
    readonly tags: readonly string[]
    readonly github?: string
    readonly demo?: string
    readonly body: string
  }>
  readonly garden: ReadonlyArray<{
    readonly slug: string
    readonly title: string
    readonly date: string
    readonly tags: readonly string[]
    readonly type: 'post' | 'note'
    readonly body: string
  }>
  readonly contact: {
    readonly email: string
    readonly github: string
    readonly twitter: string
  }
  readonly resume: string
}

function output(text: string, isHtml = false): TerminalLine {
  return { type: 'output', text, isHtml }
}

function system(text: string): TerminalLine {
  return { type: 'system', text }
}

export function createCommands(
  data: SiteData,
  clearFn: () => void
): ReadonlyMap<string, Command> {
  const commands = new Map<string, Command>()

  commands.set('help', {
    name: 'help',
    description: 'Show available commands',
    execute: () => {
      const lines: TerminalLine[] = [output(''), output('  Available Commands:'), output('')]
      for (const [, cmd] of commands) {
        lines.push(output(`    ${cmd.name.padEnd(20)} ${cmd.description}`))
      }
      lines.push(output(''))
      return lines
    },
  })

  commands.set('about', {
    name: 'about',
    description: 'About me',
    execute: () => [
      output(''),
      output(data.about),
      output(''),
      output('  Open to remote opportunities — reach out via "contact".'),
      output(''),
      output('  See also: skills, projects, resume'),
      output(''),
    ],
  })

  commands.set('skills', {
    name: 'skills',
    description: 'Technical skills',
    execute: () => {
      const lines: TerminalLine[] = [output(''), output('  * Skills:'), output('')]
      for (const group of data.skills) {
        lines.push(output(`    [${group.category}]`))
        lines.push(output(`    ${group.items.join(', ')}`))
        lines.push(output(''))
      }
      lines.push(output('  See also: projects, resume'))
      lines.push(output(''))
      return lines
    },
  })

  commands.set('projects', {
    name: 'projects',
    description: 'List projects',
    execute: () => {
      const lines: TerminalLine[] = [output(''), output('  * Projects:'), output('')]
      data.projects.forEach((p, i) => {
        lines.push(output(`    ${i + 1}. ${p.title}`))
        lines.push(output(`       ${p.description}`))
        lines.push(output(`       Stack: ${p.tags.join(', ')}`))
        if (p.github) {
          lines.push(
            output(
              `       <a href="${safeUrl(p.github)}" target="_blank" rel="noopener">[GitHub: ${escapeHtml(p.github.replace('https://', ''))}]</a>`,
              true
            )
          )
        }
        if (p.demo) {
          lines.push(
            output(
              `       <a href="${safeUrl(p.demo)}" target="_blank" rel="noopener">[Demo: ${escapeHtml(p.demo.replace('https://', ''))}]</a>`,
              true
            )
          )
        }
        lines.push(output(''))
      })
      lines.push(output("    Type 'project <number>' for details."))
      lines.push(output(''))
      lines.push(output('  See also: skills, resume'))
      lines.push(output(''))
      return lines
    },
  })

  commands.set('project', {
    name: 'project',
    description: 'Show project details (project <number>)',
    execute: (args) => {
      // No args → show project list
      if (args.length === 0) {
        const projectsCmd = commands.get('projects')
        return projectsCmd ? projectsCmd.execute([]) : []
      }

      const num = parseInt(args[0], 10)
      if (isNaN(num) || num < 1 || num > data.projects.length) {
        return [
          {
            type: 'error',
            text: `Invalid project number. Use 1-${data.projects.length}.`,
          },
        ]
      }
      const p = data.projects[num - 1]
      const lines: TerminalLine[] = [
        output(''),
        output('  ' + '─'.repeat(50)),
        output(`  ${p.title}`),
        output(`  ${p.tags.map((t) => `#${t}`).join(' ')}`),
        output('  ' + '─'.repeat(50)),
        output(''),
        output(`  ${p.description}`),
        output(''),
      ]
      if (p.body) {
        for (const line of p.body.split('\n')) {
          lines.push(output(`  ${line}`))
        }
        lines.push(output(''))
      }
      if (p.github) {
        lines.push(
          output(
            `  <a href="${safeUrl(p.github)}" target="_blank" rel="noopener">GitHub: ${escapeHtml(p.github)}</a>`,
            true
          )
        )
      }
      if (p.demo) {
        lines.push(
          output(
            `  <a href="${safeUrl(p.demo)}" target="_blank" rel="noopener">Demo: ${escapeHtml(p.demo)}</a>`,
            true
          )
        )
      }
      lines.push(output(''))
      lines.push(output("  Type 'projects' to go back."))
      lines.push(output(''))
      return lines
    },
  })

  commands.set('garden', {
    name: 'garden',
    description: 'Digital garden (blog/notes)',
    execute: (args) => {
      let items = [...data.garden]
      let tagFilter: string | null = null

      const tagIdx = args.indexOf('--tag')
      if (tagIdx !== -1 && args[tagIdx + 1]) {
        tagFilter = args[tagIdx + 1].toLowerCase()
        items = items.filter((item) =>
          item.tags.some((t) => t.toLowerCase() === tagFilter)
        )
      }

      const lines: TerminalLine[] = [output(''), output('  * Digital Garden:')]
      if (tagFilter) {
        lines.push(output(`    Filtered by: #${tagFilter}`))
      }
      lines.push(output('    Posts marked with [P], Notes marked with [N]'))
      lines.push(output(''))

      if (items.length === 0) {
        lines.push(output('    No entries found.'))
      } else {
        for (const item of items) {
          const typeLabel = item.type === 'post' ? '[P]' : '[N]'
          const tags = item.tags.map((t) => `#${t}`).join(' ')
          lines.push(
            output(`    ${typeLabel} ${item.date}  ${item.title}    ${tags}`)
          )
          lines.push(
            output(`         Read: read ${item.slug}`)
          )
        }
      }

      lines.push(output(''))
      lines.push(output("    Filter: 'garden --tag <tag>'"))
      lines.push(output(''))
      lines.push(output('  See also: projects, about'))
      lines.push(output(''))
      return lines
    },
  })

  commands.set('read', {
    name: 'read',
    description: 'Read a garden entry (read <slug>)',
    execute: (args) => {
      const slug = args[0]?.toLowerCase()
      if (!slug) {
        return [{ type: 'error', text: "Usage: read <slug>. Use 'garden' to see available entries." }]
      }

      const entry = data.garden.find((e) => e.slug.toLowerCase() === slug)
      if (!entry) {
        return [{ type: 'error', text: `Entry not found: ${slug}. Use 'garden' to see available entries.` }]
      }

      const readTime = Math.max(1, Math.ceil(entry.body.split(/\s+/).length / 200))
      const tags = entry.tags.map((t) => `#${t}`).join(' ')
      const lines: TerminalLine[] = [
        output(''),
        output('  ' + '─'.repeat(50)),
        output(`  ${entry.title}`),
        output(`  ${entry.date} · ${readTime} min read · ${tags}`),
        output('  ' + '─'.repeat(50)),
        output(''),
      ]

      for (const line of entry.body.split('\n')) {
        lines.push(output(`  ${line}`))
      }

      lines.push(output(''))
      lines.push(output('  ' + '─'.repeat(50)))
      lines.push(output("  Type 'garden' to go back."))
      lines.push(output(''))
      return lines
    },
  })

  commands.set('contact', {
    name: 'contact',
    description: 'Contact information',
    execute: () => {
      const c = data.contact
      return [
        output(''),
        output('  * Contact:'),
        output(''),
        output(
          `    Email:    <a href="${safeUrl(`mailto:${c.email}`)}">${escapeHtml(c.email)}</a>`,
          true
        ),
        output(
          `    GitHub:   <a href="${safeUrl(`https://github.com/${c.github}`)}" target="_blank" rel="noopener">github.com/${escapeHtml(c.github)}</a>`,
          true
        ),
        output(
          `    Twitter:  <a href="${safeUrl(`https://x.com/${c.twitter}`)}" target="_blank" rel="noopener">@${escapeHtml(c.twitter)}</a>`,
          true
        ),
        output(''),
        output('  See also: about, resume'),
        output(''),
      ]
    },
  })

  commands.set('resume', {
    name: 'resume',
    description: 'View resume',
    execute: () => [
      output(''),
      output(data.resume),
      output(''),
      output(
        '  <a href="/resume.pdf" target="_blank" rel="noopener">[Download PDF]</a>',
        true
      ),
      output(''),
      output('  See also: skills, projects, contact'),
      output(''),
    ],
  })

  commands.set('theme', {
    name: 'theme',
    description: 'List or switch themes (theme <name>)',
    execute: (args) => {
      if (args.length === 0) {
        const current = loadSavedTheme()
        const lines: TerminalLine[] = [
          output(''),
          output('  * Available Themes:'),
          output(''),
        ]
        for (const t of THEMES) {
          const marker = t.name === current ? ' (active)' : ''
          lines.push(
            output(`    - ${t.name.padEnd(12)} : ${t.label}${marker}`)
          )
        }
        lines.push(output(''))
        lines.push(output("  Usage: 'theme <name>'"))
        lines.push(output(''))
        return lines
      }

      const name = args[0].toLowerCase()
      const theme = THEMES.find((t) => t.name === name)
      if (!theme) {
        return [
          {
            type: 'error',
            text: `Unknown theme: ${name}. Type 'theme' to see available themes.`,
          },
        ]
      }

      applyTheme(name)
      return [system(`Theme changed to ${theme.name}.`)]
    },
  })

  commands.set('background', {
    name: 'background',
    description: 'List or switch backgrounds (background <name>)',
    execute: (args) => {
      if (args.length === 0) {
        const current = loadSavedBackground()
        const lines: TerminalLine[] = [
          output(''),
          output('  * Available Backgrounds:'),
          output(''),
        ]
        for (const b of BACKGROUNDS) {
          const marker = b.name === current ? ' (active)' : ''
          lines.push(
            output(`    - ${b.name.padEnd(12)} : ${b.label}${marker}`)
          )
        }
        lines.push(output(''))
        lines.push(output("  Usage: 'background <name>'"))
        lines.push(output(''))
        return lines
      }

      const name = args[0].toLowerCase()
      const bg = BACKGROUNDS.find((b) => b.name === name)
      if (!bg) {
        return [
          {
            type: 'error',
            text: `Unknown background: ${name}. Type 'background' to see available backgrounds.`,
          },
        ]
      }

      applyBackground(name)
      return [system(`Background changed to ${bg.name}.`)]
    },
  })

  commands.set('matrix', {
    name: 'matrix',
    description: 'Enter the Matrix',
    execute: () => [
      { type: 'animation' as const, text: '', animationId: 'matrix' },
    ],
  })

  commands.set('clear', {
    name: 'clear',
    description: 'Clear terminal',
    execute: () => {
      clearFn()
      return []
    },
  })

  commands.set('date', {
    name: 'date',
    description: 'Show current date and time',
    execute: () => [output(`  ${new Date().toISOString()}`)],
  })

  commands.set('echo', {
    name: 'echo',
    description: 'Echo text',
    execute: (args) => [output(`  ${args.join(' ')}`)],
  })

  commands.set('whoami', {
    name: 'whoami',
    description: 'Who am I?',
    execute: () => [output('  Lewis Liu - Full Stack / Web3 / AI')],
  })

  return commands
}
