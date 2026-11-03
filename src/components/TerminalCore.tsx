import { useState, useEffect, useRef, useCallback } from "react";
import type { TerminalLine, TerminalEngine } from "../lib/terminal-engine";
import { createTerminalEngine } from "../lib/terminal-engine";
import { createCommands, type SiteData } from "../lib/commands";
import { applyTheme, loadSavedTheme } from "../lib/themes";
import { applyBackground, loadSavedBackground } from "../lib/backgrounds";
import MatrixRain from "./MatrixRain";

const BANNER = `LewisShell\nRead-only portfolio files. Type 'help' for commands.\n`;

function getInitialCmd(): string | null {
  if (typeof window === "undefined") return null;
  const cmd = new URLSearchParams(window.location.search).get("cmd");
  if (!cmd || cmd.length > 100) return null;
  return /^[^\u0000-\u001f\u007f]+$/.test(cmd) ? cmd : null;
}

interface TerminalCoreProps {
  readonly data: SiteData;
  readonly active: boolean;
  readonly onEngineReady?: (engine: TerminalEngine) => void;
  readonly onBackgroundChange?: (bg: string) => void;
}

export default function TerminalCore({
  data,
  active,
  onEngineReady,
  onBackgroundChange,
}: TerminalCoreProps) {
  const initialCmd = useRef(getInitialCmd()).current;
  const [lines, setLines] = useState<readonly TerminalLine[]>([]);
  const [input, setInput] = useState("");
  const [prompt, setPrompt] = useState("lewis@portfolio:~$");
  const [srAnnouncement, setSrAnnouncement] = useState("");
  const [activeAnimation, setActiveAnimation] = useState<string | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const engineRef = useRef<TerminalEngine | null>(null);
  const historyDraftRef = useRef("");
  const lastTabRef = useRef<{ value: string; time: number }>({
    value: "",
    time: 0,
  });

  useEffect(() => {
    const clearFn = () => {
      engineRef.current?.setLines([]);
    };
    const { commands, getWorkingDirectory } = createCommands(data, clearFn);
    const engine = createTerminalEngine(commands, getWorkingDirectory);
    engineRef.current = engine;
    const unsubscribe = engine.subscribe((state) => {
      setLines([...state.lines]);
      setPrompt(engine.getPrompt());
      const b = loadSavedBackground();
      onBackgroundChange?.(b);

      const animLine = state.lines.find((l) => l.type === "animation");
      if (animLine?.animationId) {
        setActiveAnimation(animLine.animationId);
      }

      const lastOutput = [...state.lines]
        .reverse()
        .find(
          (l) =>
            l.type === "output" || l.type === "system" || l.type === "error",
        );
      if (lastOutput) {
        setSrAnnouncement(lastOutput.text.replace(/<[^>]*>/g, ""));
      }
    });

    onEngineReady?.(engine);

    const savedTheme = loadSavedTheme();
    applyTheme(savedTheme);

    const savedBg = loadSavedBackground();
    onBackgroundChange?.(savedBg);
    requestAnimationFrame(() => applyBackground(savedBg));

    if (initialCmd) {
      engine.executeCommand(initialCmd);
    }

    return () => {
      unsubscribe();
      engineRef.current = null;
    };
  }, [data]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [lines, input]);

  useEffect(() => {
    if (active && window.innerWidth > 768) {
      inputRef.current?.focus();
    }
  }, [active]);

  const navigateHistory = (direction: "up" | "down") => {
    const engine = engineRef.current;
    if (!engine) return;
    const state = engine.getState();
    if (!state.history.length) return;
    if (direction === "down" && state.historyIndex === -1) return;
    if (direction === "up" && state.historyIndex === -1) {
      historyDraftRef.current = input;
    }
    const next = engine.navigateHistory(direction);
    setInput(engine.getState().historyIndex === -1 ? historyDraftRef.current : next);
  };

  const completeInput = () => {
    const engine = engineRef.current;
    if (!engine) return;
    const now = Date.now();
    const lastTab = lastTabRef.current;
    if (lastTab.value === input && now - lastTab.time < 500) {
      const completions = engine.getCompletions(input);
      if (completions.length > 1) {
        engine.addLines([
          { type: "input", text: `${engine.getPrompt()} ${input}` },
          { type: "output", text: `  ${completions.join("  ")}` },
        ]);
      }
    } else {
      const completed = engine.tabComplete(input);
      if (completed !== input) setInput(completed);
    }
    lastTabRef.current = { value: input, time: now };
  };

  const cancelInput = () => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.addLines([{ type: "input", text: `${engine.getPrompt()} ${input}^C` }]);
    setInput("");
    historyDraftRef.current = "";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const engine = engineRef.current;
    if (!engine) return;

    if (e.key === "Enter") {
      e.preventDefault();
      if (input.trim()) {
        engine.executeCommand(input);
        setInput("");
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      navigateHistory("up");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      navigateHistory("down");
    } else if (e.key === "Tab") {
      e.preventDefault();
      completeInput();
    } else if (e.key.toLowerCase() === "c" && e.ctrlKey && e.currentTarget.selectionStart === e.currentTarget.selectionEnd) {
      e.preventDefault();
      cancelInput();
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      engine.clearLines();
    }
  };

  const handleMatrixComplete = useCallback(() => {
    setActiveAnimation(null);
    const engine = engineRef.current;
    if (engine) {
      const filtered = engine
        .getState()
        .lines.filter((l) => l.type !== "animation");
      engine.setLines([
        ...filtered,
        { type: "system", text: "Exited the Matrix." },
      ]);
    }
  }, []);

  const handleOutputClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("a")) return;
    if (window.getSelection()?.toString()) return;
    inputRef.current?.focus();
  };

  const renderLine = (line: TerminalLine, idx: number) => {
    if (line.type === "animation") {
      return null;
    }
    const className = `terminal-line terminal-line--${line.type}`;
    if (line.isHtml) {
      return (
        <div
          key={idx}
          className={className}
          dangerouslySetInnerHTML={{ __html: line.text }}
        />
      );
    }
    return (
      <div key={idx} className={className}>
        {line.text}
      </div>
    );
  };

  return (
    <div className="terminal">
      {activeAnimation === "matrix" && (
        <MatrixRain onComplete={handleMatrixComplete} />
      )}
      <div
        className="terminal-output"
        ref={outputRef}
        role="log"
        aria-live="polite"
        onClick={handleOutputClick}
      >
        <pre className="terminal-boot">{BANNER}</pre>
        {lines.map(renderLine)}
        <div className="terminal-input-row">
          <span className="terminal-prompt">{prompt}&nbsp;</span>
          <input
            ref={inputRef}
            type="text"
            className="terminal-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-label="Terminal input"
          />
        </div>
        <div className="sr-only" aria-live="assertive">
          {srAnnouncement}
        </div>
      </div>
      <div className="terminal-keys" role="toolbar" aria-label="Terminal keys">
        {([
          { label: "Tab", name: "Complete command", action: completeInput },
          { label: "↑", name: "Previous command", action: () => navigateHistory("up") },
          { label: "↓", name: "Next command", action: () => navigateHistory("down") },
          { label: "^C", name: "Cancel input", action: cancelInput },
          { label: "⌄", name: "Hide keyboard", action: () => inputRef.current?.blur() },
        ]).map((key) => (
          <button
            key={key.name}
            type="button"
            aria-label={key.name}
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => {
              key.action();
              if (key.name !== "Hide keyboard") inputRef.current?.focus();
            }}
          >{key.label}</button>
        ))}
      </div>
    </div>
  );
}
