import type { Command, TerminalLine } from "./terminal-engine";
import { THEMES, applyTheme, loadSavedTheme } from "./themes";
import {
  BACKGROUNDS,
  applyBackground,
  loadSavedBackground,
} from "./backgrounds";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol === "https:" ||
      parsed.protocol === "http:" ||
      parsed.protocol === "mailto:"
    ) {
      return escapeHtml(url);
    }
    return "#";
  } catch {
    return "#";
  }
}

export interface SiteData {
  readonly about: string;
  readonly skills: ReadonlyArray<{
    readonly category: string;
    readonly items: readonly string[];
  }>;
  readonly projects: ReadonlyArray<{
    readonly title: string;
    readonly description: string;
    readonly tags: readonly string[];
    readonly github?: string;
    readonly demo?: string;
    readonly body: string;
    readonly featuredOrder?: number;
    readonly image?: string;
  }>;
  readonly garden: ReadonlyArray<{
    readonly slug: string;
    readonly title: string;
    readonly date: string;
    readonly tags: readonly string[];
    readonly type: "post" | "note";
    readonly body: string;
  }>;
  readonly contact: {
    readonly email: string;
    readonly github: string;
    readonly twitter: string;
  };
  readonly resume: string;
}

function output(text: string, isHtml = false): TerminalLine {
  return { type: "output", text, isHtml };
}

function system(text: string): TerminalLine {
  return { type: "system", text };
}

type FileNode = { readonly kind: "file"; readonly content: string };
type DirectoryNode = { readonly kind: "directory"; readonly entries: ReadonlyMap<string, FileNode | DirectoryNode> };
type Node = FileNode | DirectoryNode;

function file(content: string): FileNode {
  return { kind: "file", content };
}

function directory(entries: Record<string, Node>): DirectoryNode {
  return { kind: "directory", entries: new Map(Object.entries(entries)) };
}

function createFiles(data: SiteData): DirectoryNode {
  const projects: Record<string, Node> = {};
  for (const project of data.projects.filter((item) => item.featuredOrder !== undefined)) {
    const slug = project.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const content = [project.title, project.description, project.body.trim(), project.github, project.demo].filter(Boolean).join("\n\n");
    projects[`${slug}.md`] = file(content);
  }
  return directory({ home: directory({ lewis: directory({
    "about.txt": file(data.about.trim()),
    "contact.txt": file(`Email: ${data.contact.email}\nGitHub: https://github.com/${data.contact.github}\nX: https://x.com/${data.contact.twitter}`),
    "resume.txt": file(data.resume.trim()),
    projects: directory(projects),
  }) }) });
}

function createFileCommands(data: SiteData): { commands: Command[]; getWorkingDirectory: () => string } {
  const root = createFiles(data);
  const home = ["home", "lewis"];
  let cwd = [...home];

  function resolve(path: string): { node: Node; parts: string[] } | { error: string } {
    const absolute = path.startsWith("/");
    const inHome = path === "~" || path.startsWith("~/");
    const parts = absolute ? [] : inHome ? [...home] : [...cwd];
    const input = inHome ? path.slice(1) : path;
    let node: Node = root;
    for (const part of parts) {
      if (node.kind !== "directory") return { error: "Not a directory" };
      const next = node.entries.get(part);
      if (!next) return { error: "No such file or directory" };
      node = next;
    }
    for (const part of input.split("/")) {
      if (!part || part === ".") continue;
      if (node.kind !== "directory") return { error: "Not a directory" };
      if (part === "..") {
        parts.pop();
        node = root;
        for (const name of parts) {
          if (node.kind !== "directory") return { error: "Not a directory" };
          const next = node.entries.get(name);
          if (!next) return { error: "No such file or directory" };
          node = next;
        }
      } else {
        const next = node.entries.get(part);
        if (!next) return { error: "No such file or directory" };
        node = next;
        parts.push(part);
      }
    }
    if (path.endsWith("/") && node.kind !== "directory") return { error: "Not a directory" };
    return { node, parts };
  }

  const fail = (command: string, path: string, message: string): TerminalLine[] => [{ type: "error", text: `${command}: ${path}: ${message}` }];
  const getWorkingDirectory = () => "/" + cwd.join("/");
  const commands: Command[] = [
    { name: "pwd", description: "Print working directory", execute: () => [output(getWorkingDirectory())] },
    { name: "cd", description: "Change directory", execute: (args) => {
      if (args.length > 1) return [{ type: "error", text: "cd: too many arguments" }];
      const path = args[0] ?? "~";
      const result = resolve(path);
      if ("error" in result) return fail("cd", path, result.error);
      if (result.node.kind !== "directory") return fail("cd", path, "Not a directory");
      cwd = result.parts;
      return [];
    } },
    { name: "ls", description: "List files", execute: (args) => {
      const paths = args.filter((arg) => !arg.startsWith("-"));
      const flags = args.filter((arg) => arg.startsWith("-"));
      if (flags.some((flag) => !/^-[a]+$/.test(flag))) return [{ type: "error", text: "ls: supported option is -a" }];
      const targets = paths.length ? paths : ["."];
      return targets.flatMap((path) => {
        const result = resolve(path);
        if ("error" in result) return fail("ls", path, result.error);
        const title = targets.length > 1 ? [output(`${path}:`)] : [];
        if (result.node.kind === "file") return [...title, output(path)];
        const names = [...result.node.entries.keys()].sort();
        if (flags.length) names.unshift(".", "..");
        return [...title, output(names.join("  "))];
      });
    } },
    { name: "cat", description: "Read a file", execute: (args) => {
      if (!args.length) return [{ type: "error", text: "cat: missing file" }];
      return args.flatMap((path) => {
        const result = resolve(path);
        if ("error" in result) return fail("cat", path, result.error);
        if (result.node.kind !== "file") return fail("cat", path, "Is a directory");
        return [output(result.node.content)];
      });
    } },
  ];
  return { commands, getWorkingDirectory };
}

export function createCommands(
  data: SiteData,
  clearFn: () => void,
): { commands: ReadonlyMap<string, Command>; getWorkingDirectory: () => string } {
  const commands = new Map<string, Command>();
  const files = createFileCommands(data);
  for (const command of files.commands) commands.set(command.name, command);

  commands.set("help", {
    name: "help",
    description: "Show available commands",
    execute: () => {
      const lines: TerminalLine[] = [
        output(""),
        output("  Read-only portfolio shell"),
        output(""),
      ];
      for (const [, cmd] of commands) {
        lines.push(output(`    ${cmd.name.padEnd(20)} ${cmd.description}`));
      }
      lines.push(output(""));
      return lines;
    },
  });

  for (const [name, projectName] of [["codex", "Loadout"], ["claude", "Folio"]] as const) {
    commands.set(name, {
      name,
      description: `Run a scripted ${name === "codex" ? "Codex" : "Claude Code"} demo`,
      execute: (args) => {
        const label = name === "codex" ? "Codex" : "Claude Code";
        if (args.length === 0 || args[0] === "--help") {
          return [output(`${label} demo (scripted, no AI connection)`), output(`Run '${name} demo' to see an example.`)];
        }
        if (args.length !== 1 || args[0] !== "demo") {
          return [{ type: "error", text: `${name}: only the scripted demo is available. Run '${name} demo'.` }];
        }
        const project = data.projects.find((item) => item.title === projectName);
        if (!project) return [output(`${label} demo (scripted): example project unavailable.`)];
        return [
          output(`${label} demo (scripted, no AI connection)`),
          output(`> What is ${project.title}?`),
          output(project.description),
          ...(project.github ? [output(project.github)] : []),
        ];
      },
    });
  }

  commands.set("about", {
    name: "about",
    description: "About me",
    execute: () => [
      output(""),
      output(data.about),
      output(""),
      output("  See also: now, projects, wins, skills, resume"),
      output(""),
    ],
  });

  commands.set("skills", {
    name: "skills",
    description: "Technical skills",
    execute: () => {
      const lines: TerminalLine[] = [
        output(""),
        output("  * Skills:"),
        output(""),
      ];
      for (const group of data.skills) {
        lines.push(output(`    [${group.category}]`));
        lines.push(output(`    ${group.items.join(", ")}`));
        lines.push(output(""));
      }
      lines.push(output("  See also: projects, resume"));
      lines.push(output(""));
      return lines;
    },
  });

  commands.set("projects", {
    name: "projects",
    description: "List projects",
    execute: () => {
      const lines: TerminalLine[] = [
        output(""),
        output("  * Projects:"),
        output(""),
      ];
      data.projects.filter((project) => project.featuredOrder !== undefined)
        .sort((a, b) => (a.featuredOrder ?? 99) - (b.featuredOrder ?? 99))
        .forEach((p) => {
        lines.push(
          output(
            `    <span class="proj-title">${escapeHtml(p.title)}</span>`,
            true,
          ),
        );
        lines.push(output(`        ${p.description}`));
        if (p.github) {
          lines.push(
            output(
              `        <a href="${safeUrl(p.github)}" target="_blank" rel="noopener">[GitHub: ${escapeHtml(p.github.replace("https://", ""))}]</a>`,
              true,
            ),
          );
        }
        if (p.demo) {
          lines.push(
            output(
              `        <a href="${safeUrl(p.demo)}" target="_blank" rel="noopener">[Demo: ${escapeHtml(p.demo.replace("https://", ""))}]</a>`,
              true,
            ),
          );
        }
        lines.push(output(""));
      });
      lines.push(output("    Type 'project <name>' for details."));
      lines.push(output(""));
      lines.push(output("  See also: skills, now, wins, resume"));
      lines.push(output(""));
      return lines;
    },
  });

  commands.set("project", {
    name: "project",
    description: "Show project details (project <name>)",
    execute: (args) => {
      if (args.length === 0) {
        const projectsCmd = commands.get("projects");
        return projectsCmd ? projectsCmd.execute([]) : [];
      }

      const requested = args.join(" ").toLowerCase();
      const normalise = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const p = /^\d+$/.test(requested)
        ? data.projects[Number(requested) - 1]
        : data.projects.find((item) => normalise(item.title) === normalise(requested));
      if (!p) {
        return [
          {
            type: "error",
            text: `Project not found: ${args.join(" ")}. Use 'projects' to see selected projects.`,
          },
        ];
      }
      const lines: TerminalLine[] = [
        output(""),
        output("  " + "─".repeat(50)),
        output(
          `  <span class="proj-title">${escapeHtml(p.title)}</span>`,
          true,
        ),
        output("  " + "─".repeat(50)),
        output(""),
        output(`  ${p.description}`),
        output(""),
      ];
      if (p.body) {
        for (const line of p.body.split("\n")) {
          lines.push(output(`  ${line}`));
        }
        lines.push(output(""));
      }
      if (p.github) {
        lines.push(
          output(
            `  <a href="${safeUrl(p.github)}" target="_blank" rel="noopener">GitHub: ${escapeHtml(p.github)}</a>`,
            true,
          ),
        );
      }
      if (p.demo) {
        lines.push(
          output(
            `  <a href="${safeUrl(p.demo)}" target="_blank" rel="noopener">Demo: ${escapeHtml(p.demo)}</a>`,
            true,
          ),
        );
      }
      lines.push(output(""));
      lines.push(output("  Type 'projects' to go back."));
      lines.push(output(""));
      return lines;
    },
  });

  commands.set("garden", {
    name: "garden",
    description: "Digital garden (blog/notes)",
    execute: (args) => {
      let items = [...data.garden];
      let tagFilter: string | null = null;

      const tagIdx = args.indexOf("--tag");
      if (tagIdx !== -1 && args[tagIdx + 1]) {
        tagFilter = args[tagIdx + 1].toLowerCase();
        items = items.filter((item) =>
          item.tags.some((t) => t.toLowerCase() === tagFilter),
        );
      }

      const lines: TerminalLine[] = [output(""), output("  * Digital Garden:")];
      if (tagFilter) {
        lines.push(output(`    Filtered by: #${tagFilter}`));
      }
      lines.push(output("    Posts marked with [P], Notes marked with [N]"));
      lines.push(output(""));

      if (items.length === 0) {
        lines.push(output("    No entries found."));
      } else {
        for (const item of items) {
          const typeLabel = item.type === "post" ? "[P]" : "[N]";
          const tags = item.tags.map((t) => `#${t}`).join(" ");
          lines.push(
            output(`    ${typeLabel} ${item.date}  ${item.title}    ${tags}`),
          );
          lines.push(output(`         Read: read ${item.slug}`));
        }
      }

      lines.push(output(""));
      lines.push(output("    Filter: 'garden --tag <tag>'"));
      lines.push(output(""));
      lines.push(output("  See also: projects, about"));
      lines.push(output(""));
      return lines;
    },
  });

  commands.set("read", {
    name: "read",
    description: "Read a garden entry (read <slug>)",
    execute: (args) => {
      const slug = args[0]?.toLowerCase();
      if (!slug) {
        return [
          {
            type: "error",
            text: "Usage: read <slug>. Use 'garden' to see available entries.",
          },
        ];
      }

      const entry = data.garden.find((e) => e.slug.toLowerCase() === slug);
      if (!entry) {
        return [
          {
            type: "error",
            text: `Entry not found: ${slug}. Use 'garden' to see available entries.`,
          },
        ];
      }

      const readTime = Math.max(
        1,
        Math.ceil(entry.body.split(/\s+/).length / 200),
      );
      const tags = entry.tags.map((t) => `#${t}`).join(" ");
      const lines: TerminalLine[] = [
        output(""),
        output("  " + "─".repeat(50)),
        output(`  ${entry.title}`),
        output(`  ${entry.date} · ${readTime} min read · ${tags}`),
        output("  " + "─".repeat(50)),
        output(""),
      ];

      for (const line of entry.body.split("\n")) {
        lines.push(output(`  ${line}`));
      }

      lines.push(output(""));
      lines.push(output("  " + "─".repeat(50)));
      lines.push(output("  Type 'garden' to go back."));
      lines.push(output(""));
      return lines;
    },
  });

  commands.set("contact", {
    name: "contact",
    description: "Contact information",
    execute: () => {
      const c = data.contact;
      return [
        output(""),
        output("  * Contact:"),
        output(""),
        output(
          `    Email:    <a href="${safeUrl(`mailto:${c.email}`)}">${escapeHtml(c.email)}</a>`,
          true,
        ),
        output(
          `    GitHub:   <a href="${safeUrl(`https://github.com/${c.github}`)}" target="_blank" rel="noopener">github.com/${escapeHtml(c.github)}</a>`,
          true,
        ),
        output(
          `    Twitter:  <a href="${safeUrl(`https://x.com/${c.twitter}`)}" target="_blank" rel="noopener">@${escapeHtml(c.twitter)}</a>`,
          true,
        ),
        output(""),
        output("  See also: about, resume"),
        output(""),
      ];
    },
  });

  commands.set("resume", {
    name: "resume",
    description: "View resume",
    execute: () => [
      output(""),
      output(data.resume),
      output(""),
      output("  See also: skills, projects, contact"),
      output(""),
    ],
  });

  commands.set("theme", {
    name: "theme",
    description: "List or switch themes (theme <name>)",
    execute: (args) => {
      if (args.length === 0) {
        const current = loadSavedTheme();
        const lines: TerminalLine[] = [
          output(""),
          output("  * Available Themes:"),
          output(""),
        ];
        for (const t of THEMES) {
          const marker = t.name === current ? " (active)" : "";
          lines.push(
            output(`    - ${t.name.padEnd(12)} : ${t.label}${marker}`),
          );
        }
        lines.push(output(""));
        lines.push(output("  Usage: 'theme <name>'"));
        lines.push(output(""));
        return lines;
      }

      const name = args[0].toLowerCase();
      const theme = THEMES.find((t) => t.name === name);
      if (!theme) {
        return [
          {
            type: "error",
            text: `Unknown theme: ${name}. Type 'theme' to see available themes.`,
          },
        ];
      }

      applyTheme(name);
      return [system(`Theme changed to ${theme.name}.`)];
    },
  });

  commands.set("background", {
    name: "background",
    description: "List or switch backgrounds (background <name>)",
    execute: (args) => {
      if (args.length === 0) {
        const current = loadSavedBackground();
        const lines: TerminalLine[] = [
          output(""),
          output("  * Available Backgrounds:"),
          output(""),
        ];
        for (const b of BACKGROUNDS) {
          const marker = b.name === current ? " (active)" : "";
          lines.push(
            output(`    - ${b.name.padEnd(12)} : ${b.label}${marker}`),
          );
        }
        lines.push(output(""));
        lines.push(output("  Usage: 'background <name>'"));
        lines.push(output(""));
        return lines;
      }

      const name = args[0].toLowerCase();
      const bg = BACKGROUNDS.find((b) => b.name === name);
      if (!bg) {
        return [
          {
            type: "error",
            text: `Unknown background: ${name}. Type 'background' to see available backgrounds.`,
          },
        ];
      }

      applyBackground(name);
      return [system(`Background changed to ${bg.name}.`)];
    },
  });

  commands.set("matrix", {
    name: "matrix",
    description: "Enter the Matrix",
    execute: () => [
      { type: "animation" as const, text: "", animationId: "matrix" },
    ],
  });

  commands.set("clear", {
    name: "clear",
    description: "Clear terminal",
    execute: () => {
      clearFn();
      return [];
    },
  });

  commands.set("date", {
    name: "date",
    description: "Show current date and time",
    execute: () => [output(`  ${new Date().toISOString()}`)],
  });

  commands.set("echo", {
    name: "echo",
    description: "Echo text",
    execute: (args) => [output(`  ${args.join(" ")}`)],
  });

  commands.set("whoami", {
    name: "whoami",
    description: "Print the current user",
    execute: () => [output("lewis")],
  });

  commands.set("now", {
    name: "now",
    description: "Selected work",
    execute: () => [
      output(""),
      output("  * Selected projects:"),
      output(""),
      ...data.projects
        .filter((project) => project.featuredOrder !== undefined)
        .sort((a, b) => (a.featuredOrder ?? 99) - (b.featuredOrder ?? 99))
        .map((project) => output(`    ${project.title} — ${project.description}`)),
      output(""),
      output("  See also: projects, contact"),
      output(""),
    ],
  });

  commands.set("wins", {
    name: "wins",
    description: "Recognition, papers, milestones",
    execute: () => {
      const recognition = data.resume.split("\n\n").find((section) => section.trimStart().startsWith("RECOGNITION\n"));
      return [output(recognition ?? "See resume for recognition.")];
    },
  });

  return { commands, getWorkingDirectory: files.getWorkingDirectory };
}
