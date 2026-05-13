import { useState, useEffect, useRef, useCallback } from "react";
import type { TerminalLine, TerminalEngine } from "../lib/terminal-engine";
import { createTerminalEngine } from "../lib/terminal-engine";
import { createCommands, type SiteData } from "../lib/commands";
import { applyTheme, loadSavedTheme } from "../lib/themes";
import { applyBackground, loadSavedBackground } from "../lib/backgrounds";
import { useDesktop } from "../lib/desktop-context";
import StatusBar from "./StatusBar";
import MatrixRain from "./MatrixRain";

const BANNER = `LewisShell v2.0 \u00b7 boot ok

 \u2588\u2588\u2557     \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2557    \u2588\u2588\u2557\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557
 \u2588\u2588\u2551     \u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255d\u2588\u2588\u2551    \u2588\u2588\u2551\u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255d
 \u2588\u2588\u2551     \u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2551 \u2588\u2557 \u2588\u2588\u2551\u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557
 \u2588\u2588\u2551     \u2588\u2588\u2554\u2550\u2550\u255d  \u2588\u2588\u2551\u2588\u2588\u2588\u2557\u2588\u2588\u2551\u2588\u2588\u2551\u255a\u2550\u2550\u2550\u2550\u2588\u2588\u2551
 \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u255a\u2588\u2588\u2588\u2554\u2588\u2588\u2588\u2554\u255d\u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2551
 \u255a\u2550\u2550\u2550\u2550\u2550\u2550\u255d\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u255d \u255a\u2550\u2550\u255d\u255a\u2550\u2550\u255d \u255a\u2550\u255d\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u255d

  engineer  \u00b7  builder  \u00b7  open source
  ai-agents  \u00b7  bioinformatics  \u00b7  dev-experience

  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  type 'help' for commands  \u00b7  'now' for what i'm shipping
`;

const BANNER_MOBILE = `LEWIS LIU
engineer \u00b7 ai-agents \u00b7 biology \u00b7 dev-ux
type 'help' or 'now' to begin.
`;

function getInitialCmd(): string | null {
  if (typeof window === "undefined") return null;
  const cmd = new URLSearchParams(window.location.search).get("cmd");
  if (!cmd || cmd.length > 100) return null;
  return /^[a-zA-Z0-9 \-_.]+$/.test(cmd) ? cmd : null;
}

function isMobileViewport(): boolean {
  return typeof window !== "undefined" && window.innerWidth <= 480;
}

interface TerminalCoreProps {
  readonly data: SiteData;
  readonly onEngineReady?: (engine: TerminalEngine) => void;
  readonly onThemeChange?: (theme: string) => void;
  readonly onBackgroundChange?: (bg: string) => void;
  readonly onCommandExecuted?: () => void;
}

export default function TerminalCore({
  data,
  onEngineReady,
  onThemeChange,
  onBackgroundChange,
  onCommandExecuted,
}: TerminalCoreProps) {
  const initialCmd = useRef(getInitialCmd()).current;
  const [lines, setLines] = useState<readonly TerminalLine[]>([]);
  const [input, setInput] = useState("");
  const [booted, setBooted] = useState(false);
  const [bootText, setBootText] = useState("");
  const [srAnnouncement, setSrAnnouncement] = useState("");
  const [activeAnimation, setActiveAnimation] = useState<string | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const engineRef = useRef<TerminalEngine | null>(null);
  const lastTabRef = useRef<{ value: string; time: number }>({
    value: "",
    time: 0,
  });

  useEffect(() => {
    const clearFn = () => {
      engineRef.current?.setLines([]);
    };
    const commands = createCommands(data, clearFn);
    const engine = createTerminalEngine(commands);
    engineRef.current = engine;
    onEngineReady?.(engine);

    const unsubscribe = engine.subscribe((state) => {
      setLines([...state.lines]);
      const t = loadSavedTheme();
      const b = loadSavedBackground();
      onThemeChange?.(t);
      onBackgroundChange?.(b);

      // Check for animation lines
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

    const savedTheme = loadSavedTheme();
    applyTheme(savedTheme);
    onThemeChange?.(savedTheme);

    const savedBg = loadSavedBackground();
    onBackgroundChange?.(savedBg);
    requestAnimationFrame(() => applyBackground(savedBg));

    let cancelled = false;
    let i = 0;
    const bannerText = isMobileViewport() ? BANNER_MOBILE : BANNER;
    const bannerChars = bannerText.split("");
    let accumulated = "";

    const finishBoot = () => {
      if (cancelled) return;
      cancelled = true;
      setBooted(true);
      setSrAnnouncement("Terminal loaded. Type help for available commands.");

      const visited = localStorage.getItem("lewisshell-visited");
      if (!visited) {
        localStorage.setItem("lewisshell-visited", "1");
        engine.executeCommand("about");
        onCommandExecuted?.();
      }

      if (initialCmd) {
        engine.executeCommand(initialCmd);
        onCommandExecuted?.();
      }
    };

    const interval = setInterval(() => {
      if (cancelled) {
        clearInterval(interval);
        return;
      }
      if (i < bannerChars.length) {
        const chunk = Math.min(4, bannerChars.length - i);
        accumulated += bannerChars.slice(i, i + chunk).join("");
        setBootText(accumulated);
        i += chunk;
      } else {
        clearInterval(interval);
        finishBoot();
      }
    }, 8);

    const skipBoot = () => {
      clearInterval(interval);
      setBootText(bannerText);
      finishBoot();
    };

    window.addEventListener("keydown", skipBoot, { once: true });
    window.addEventListener("touchstart", skipBoot, { once: true });

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("keydown", skipBoot);
      window.removeEventListener("touchstart", skipBoot);
      unsubscribe();
      engineRef.current = null;
    };
  }, [data]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [lines, bootText, input]);

  useEffect(() => {
    if (booted) {
      inputRef.current?.focus();
    }
  }, [booted]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const engine = engineRef.current;
    if (!engine) return;

    if (e.key === "Enter") {
      e.preventDefault();
      if (input.trim()) {
        engine.executeCommand(input);
        onCommandExecuted?.();
        setInput("");
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = engine.navigateHistory("up");
      setInput(prev);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = engine.navigateHistory("down");
      setInput(next);
    } else if (e.key === "Tab") {
      e.preventDefault();
      const now = Date.now();
      const lastTab = lastTabRef.current;

      if (lastTab.value === input && now - lastTab.time < 500) {
        const completions = engine.getCompletions(input);
        if (completions.length > 1) {
          engine.addLines([
            { type: "input", text: `lewis@portfolio:~$ ${input}` },
            { type: "output", text: `  ${completions.join("  ")}` },
          ]);
        }
      } else {
        const completed = engine.tabComplete(input);
        if (completed !== input) {
          setInput(completed);
        }
      }

      lastTabRef.current = { value: input, time: now };
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      engine.clearLines();
    }
  };

  const handleMatrixComplete = useCallback(() => {
    setActiveAnimation(null);
    const engine = engineRef.current;
    if (engine) {
      // Remove animation lines
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
    <div className="terminal" onClick={handleOutputClick}>
      {activeAnimation === "matrix" && (
        <MatrixRain onComplete={handleMatrixComplete} />
      )}
      <div className="terminal-scanlines" />
      <div
        className="terminal-output"
        ref={outputRef}
        role="log"
        aria-live="polite"
      >
        {!booted && (
          <pre className="terminal-boot" aria-hidden="true">
            {bootText}
            <span className="terminal-cursor" />
          </pre>
        )}
        {booted && (
          <>
            <pre className="terminal-boot" aria-hidden="true">
              {isMobileViewport() ? BANNER_MOBILE : BANNER}
            </pre>
            {lines.map(renderLine)}
            <div className="terminal-input-row">
              <span className="terminal-prompt">lewis@portfolio:~$&nbsp;</span>
              <input
                ref={inputRef}
                type="text"
                className="terminal-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{ width: `${Math.max(1, input.length)}ch` }}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                aria-label="Terminal input"
              />
              <span className="terminal-cursor" />
            </div>
          </>
        )}
        <div className="sr-only" aria-live="assertive">
          {srAnnouncement}
        </div>
      </div>
      <StatusBar />
    </div>
  );
}
