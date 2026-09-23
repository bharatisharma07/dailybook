import { useState, useEffect, useRef, useMemo } from "react";
import { clsx } from "clsx";
import { Flame, Terminal } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type EntryType = "log" | "task" | "done" | "flag" | "screen";

interface LogEntry {
  id: string;
  type: EntryType;
  content: string;
  project: string | null;
  createdAt: string;
}

type CommandSuggestion = {
  kind: "command";
  cmd: string;
  description: string;
  color: string;
};

type ProjectSuggestion = {
  kind: "project";
  value: string;
};

type Suggestion = CommandSuggestion | ProjectSuggestion;

// ── Constants ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = "trace_logs_v1";

const COMMANDS: CommandSuggestion[] = [
  { kind: "command", cmd: "/log",    description: "Record a work context entry",     color: "text-blue-400"   },
  { kind: "command", cmd: "/task",   description: "Add an actionable item",           color: "text-yellow-400" },
  { kind: "command", cmd: "/done",   description: "Mark a task complete",             color: "text-green-400"  },
  { kind: "command", cmd: "/flag",   description: "Highlight key decision/milestone", color: "text-red-400"    },
  { kind: "command", cmd: "/screen", description: "Capture context snapshot",         color: "text-purple-400" },
];

const TYPE_BADGE: Record<EntryType, { label: string; cls: string }> = {
  log:    { label: "LOG",    cls: "text-blue-400   border-blue-400/30   bg-blue-400/10"   },
  task:   { label: "TASK",   cls: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10" },
  done:   { label: "DONE",   cls: "text-green-400  border-green-400/30  bg-green-400/10"  },
  flag:   { label: "FLAG",   cls: "text-red-400    border-red-400/30    bg-red-400/10"    },
  screen: { label: "SCR",    cls: "text-purple-400 border-purple-400/30 bg-purple-400/10" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadLogs(): LogEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function parseEntry(raw: string): { type: EntryType; content: string; project: string | null } {
  const text = raw.trim();
  let type: EntryType = "log";
  let rest = text;

  const cmdMatch = text.match(/^\/(\w+)\s*/);
  if (cmdMatch) {
    const k = cmdMatch[1].toLowerCase();
    if (["log", "task", "done", "flag", "screen"].includes(k)) {
      type = k as EntryType;
    }
    rest = rest.slice(cmdMatch[0].length);
  }

  const projMatch = rest.match(/#(\w+)/);
  const project = projMatch ? projMatch[1] : null;
  const content = rest.replace(/#\w+\s*/g, "").trim();

  return {
    type,
    content: type === "screen" ? "Screen context snapshot captured" : content,
    project,
  };
}

// ── Heatmap ───────────────────────────────────────────────────────────────────

function Heatmap({ logs }: { logs: LogEntry[] }) {
  const todayStr = new Date().toISOString().slice(0, 10);

  const cells = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (29 - i));
      const dateStr = d.toISOString().slice(0, 10);
      const count = logs.filter((l) => l.createdAt.startsWith(dateStr)).length;
      return { dateStr, count };
    });
  }, [logs]);

  const heatColor = (n: number) =>
    n === 0 ? "bg-neutral-800" :
    n <= 2  ? "bg-teal-900" :
    n <= 5  ? "bg-teal-700" :
              "bg-teal-400";

  const todayCount = logs.filter((l) => l.createdAt.startsWith(todayStr)).length;

  const stats = [
    { label: "Logs",      n: logs.filter((l) => l.type === "log").length,    color: "text-blue-400"   },
    { label: "Tasks",     n: logs.filter((l) => l.type === "task").length,   color: "text-yellow-400" },
    { label: "Completed", n: logs.filter((l) => l.type === "done").length,   color: "text-green-400"  },
    { label: "Flagged",   n: logs.filter((l) => l.type === "flag").length,   color: "text-red-400"    },
  ];

  return (
    <div className="flex-1 flex flex-col px-5 py-4 overflow-y-auto">
      <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest mb-3">
        Activity · Last 30 Days
      </p>

      {/* Grid */}
      <div className="grid grid-cols-10 gap-1.5 mb-4">
        {cells.map(({ dateStr, count }) => (
          <div
            key={dateStr}
            title={`${dateStr}: ${count} ${count === 1 ? "entry" : "entries"}`}
            className={clsx("h-4 rounded-sm transition-colors", heatColor(count))}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mb-5">
        {[
          { label: "0", cls: "bg-neutral-800" },
          { label: "1–2", cls: "bg-teal-900" },
          { label: "3–5", cls: "bg-teal-700" },
          { label: "6+", cls: "bg-teal-400" },
        ].map(({ label, cls }) => (
          <div key={label} className="flex items-center gap-1">
            <div className={clsx("h-2.5 w-2.5 rounded-sm", cls)} />
            <span className="text-[9px] text-neutral-600 font-mono">{label}</span>
          </div>
        ))}
        <span className="ml-auto text-[10px] text-neutral-500 font-mono">
          <span className="text-teal-400 font-semibold">{todayCount}</span>{" "}
          {todayCount === 1 ? "entry" : "entries"} today
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        {stats.map(({ label, n, color }) => (
          <div
            key={label}
            className="bg-neutral-900 rounded-lg px-3 py-2.5 flex items-center justify-between"
          >
            <span className="text-[11px] text-neutral-500 font-mono">{label}</span>
            <span className={clsx("text-sm font-mono font-semibold", color)}>{n}</span>
          </div>
        ))}
      </div>

      {logs.length === 0 && (
        <p className="text-center text-neutral-700 text-xs font-mono mt-6">
          Log something first to see your activity grid.
        </p>
      )}
    </div>
  );
}

// ── Log Feed ──────────────────────────────────────────────────────────────────

function LogFeed({ logs }: { logs: LogEntry[] }) {
  if (logs.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-6">
        <Terminal size={22} className="text-neutral-700" />
        <p className="text-neutral-600 text-sm font-mono">No context logged yet.</p>
        <p className="text-neutral-700 text-xs font-mono">
          Try:{" "}
          <span className="text-teal-500">/log #project what you just worked on</span>
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-2 py-2 space-y-px">
      {logs.map((entry) => {
        const { label, cls } = TYPE_BADGE[entry.type];
        return (
          <div
            key={entry.id}
            className="flex items-start gap-2 py-1.5 px-2 rounded-md hover:bg-neutral-800/50 group transition-colors cursor-default"
          >
            {/* Type badge */}
            <span
              className={clsx(
                "text-[9px] font-mono border px-1.5 py-0.5 rounded shrink-0 mt-0.5 tracking-wider",
                cls
              )}
            >
              {label}
            </span>

            {/* Content */}
            <span className="text-sm text-neutral-200 flex-1 leading-snug font-mono min-w-0 break-words">
              {entry.content}
            </span>

            {/* Meta */}
            <div className="flex items-center gap-1.5 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity">
              {entry.project && (
                <span className="text-[10px] font-mono text-teal-400 bg-teal-400/10 border border-teal-400/20 px-1.5 py-0.5 rounded">
                  #{entry.project}
                </span>
              )}
              <span className="text-[10px] text-neutral-600 font-mono whitespace-nowrap">
                {timeAgo(entry.createdAt)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [input, setInput]             = useState("");
  const [logs, setLogs]               = useState<LogEntry[]>(loadLogs);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [activeTab, setActiveTab]     = useState<"feed" | "heatmap">("feed");
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Persist to localStorage whenever logs change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  }, [logs]);

  // Reset suggestion cursor when input changes
  useEffect(() => { setSelectedIdx(0); }, [input]);

  // ── Autocomplete suggestions ─────────────────────────────────────────────
  const suggestions = useMemo((): Suggestion[] => {
    // Project tag: show when "#" is at end of input (works mid-command too)
    const hashMatch = input.match(/#(\w*)$/);
    if (hashMatch) {
      const q = hashMatch[1].toLowerCase();
      const existing = [
        ...new Set(logs.map((l) => l.project).filter((p): p is string => Boolean(p))),
      ];
      return existing
        .filter((p) => p.toLowerCase().startsWith(q) && p.toLowerCase() !== q)
        .map((p) => ({ kind: "project" as const, value: p }));
    }

    // Command: only while still on the single-token command (no space yet)
    const words = input.split(/\s+/);
    if (input.startsWith("/") && words.length === 1) {
      return COMMANDS.filter((c) => c.cmd.startsWith(words[0].toLowerCase()));
    }

    return [];
  }, [input, logs]);

  // ── Fill selected suggestion ─────────────────────────────────────────────
  const fillSuggestion = (s: Suggestion) => {
    if (s.kind === "command") {
      setInput(s.cmd + " ");
    } else {
      setInput(input.replace(/#\w*$/, "#" + s.value + " "));
    }
    inputRef.current?.focus();
  };

  // ── Submit entry ─────────────────────────────────────────────────────────
  const submitEntry = () => {
    if (!input.trim()) return;
    const { type, content, project } = parseEntry(input);
    if (!content && type !== "screen") return;

    const entry: LogEntry = {
      id: crypto.randomUUID(),
      type,
      content,
      project,
      createdAt: new Date().toISOString(),
    };

    setLogs((prev) => [entry, ...prev]);
    setInput("");
    setActiveTab("feed");
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // ── Keyboard handler ─────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, suggestions.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        fillSuggestion(suggestions[selectedIdx]);
        return;
      }
    }

    if (e.key === "Enter") {
      e.preventDefault();
      submitEntry();
    }

    if (e.key === "Escape") {
      setInput("");
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-transparent">
      <div className="w-full h-full bg-neutral-950/95 backdrop-blur-xl border border-neutral-800/60 rounded-2xl flex flex-col overflow-hidden shadow-2xl">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2.5 border-b border-neutral-800/50 shrink-0">
          <div className="flex items-center gap-2">
            <Flame size={13} className="text-teal-400" />
            <span className="text-[11px] font-mono font-semibold text-neutral-400 tracking-widest uppercase">
              Trace
            </span>
          </div>
          <div className="flex items-center gap-0.5 bg-neutral-900 rounded-lg p-0.5">
            {(["feed", "heatmap"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={clsx(
                  "text-[10px] font-mono px-2.5 py-1 rounded-md transition-colors capitalize",
                  activeTab === tab
                    ? "bg-neutral-700 text-neutral-100"
                    : "text-neutral-500 hover:text-neutral-300"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* ── Input Bar ─────────────────────────────────────────────────── */}
        <div className="relative shrink-0">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-neutral-800/50">
            <span className="text-teal-400 font-mono text-base leading-none shrink-0 select-none">
              ›
            </span>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="/log #project what did you just work on?"
              className="flex-1 bg-transparent text-neutral-100 font-mono text-sm outline-none placeholder:text-neutral-700 caret-teal-400"
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
            />
          </div>

          {/* ── Autocomplete Popover ───────────────────────────────────── */}
          {suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full bg-neutral-900 border-x border-b border-neutral-800/80 rounded-b-lg shadow-xl z-50 overflow-hidden">
              {suggestions.map((s, i) => (
                <button
                  key={s.kind === "command" ? s.cmd : s.value}
                  onClick={() => fillSuggestion(s)}
                  className={clsx(
                    "w-full flex items-center gap-3 px-4 py-2 text-left transition-colors",
                    i === selectedIdx ? "bg-neutral-800" : "hover:bg-neutral-800/60"
                  )}
                >
                  {s.kind === "command" ? (
                    <>
                      <span className={clsx("w-16 shrink-0 text-sm font-mono font-medium", s.color)}>
                        {s.cmd}
                      </span>
                      <span className="text-xs text-neutral-500 font-mono">{s.description}</span>
                    </>
                  ) : (
                    <>
                      <span className="w-16 shrink-0 text-sm font-mono text-teal-400">
                        #{s.value}
                      </span>
                      <span className="text-xs text-neutral-500 font-mono">existing project</span>
                    </>
                  )}
                </button>
              ))}
              <div className="flex gap-4 px-4 py-1.5 border-t border-neutral-800/60">
                <span className="text-[9px] text-neutral-700 font-mono">↑↓ navigate</span>
                <span className="text-[9px] text-neutral-700 font-mono">Tab fill</span>
                <span className="text-[9px] text-neutral-700 font-mono">Esc clear</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Content ───────────────────────────────────────────────────── */}
        {activeTab === "feed" ? (
          <LogFeed logs={logs} />
        ) : (
          <Heatmap logs={logs} />
        )}

      </div>
    </div>
  );
}
