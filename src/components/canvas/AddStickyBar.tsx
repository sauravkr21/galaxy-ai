"use client";

import { useEffect, useMemo, useState } from "react";
import {
  StickyNote,
  Plus,
  Search,
  X,
  ChevronRight,
  Clock,
  Image as ImageIcon,
  Video,
  Mic,
  Layers,
  Crop,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NodeKind } from "@/types/flow";

interface Model {
  label: string;
  /** Present => functional (adds a node). Absent => display-only placeholder. */
  kind?: NodeKind;
  icon: React.ReactNode;
}
interface Row {
  label: string;
  models?: Model[];
}
interface Category {
  cat: string;
  icon: React.ReactNode;
  rows: Row[];
}

const genIcon = <Layers className="h-4 w-4" />;

/** Display metadata for the functional node kinds (used by Recent + models). */
const FUNCTIONAL_META: Partial<
  Record<NodeKind, { label: string; icon: React.ReactNode }>
> = {
  "crop-image": { label: "Crop Image", icon: <Crop className="h-4 w-4" /> },
  gemini: { label: "Gemini 3.1 Pro", icon: <Sparkles className="h-4 w-4" /> },
};

// Mirrors the reference picker. Only Crop Image (Utility) and Gemini 3.1 Pro
// (LLM Call) are functional in this build; the rest are display-only.
const CATEGORIES: Category[] = [
  {
    cat: "IMAGE",
    icon: <ImageIcon className="h-3.5 w-3.5" />,
    rows: [{ label: "Generate Image" }, { label: "Edit Image" }, { label: "3D" }],
  },
  {
    cat: "VIDEO",
    icon: <Video className="h-3.5 w-3.5" />,
    rows: [{ label: "Generate Video" }, { label: "Enhance Video" }, { label: "BG Remover" }],
  },
  {
    cat: "AUDIO",
    icon: <Mic className="h-3.5 w-3.5" />,
    rows: [
      { label: "Text to Speech" },
      { label: "Music Generation" },
      { label: "Sound Effects" },
      { label: "Other Audio Tools" },
    ],
  },
  {
    cat: "OTHERS",
    icon: <Layers className="h-3.5 w-3.5" />,
    rows: [
      { label: "Input" },
      {
        label: "Utility",
        models: [
          { label: "Crop Image", kind: "crop-image", icon: <Crop className="h-4 w-4" /> },
          { label: "Merge Audio & Video", icon: genIcon },
          { label: "Merge Videos", icon: genIcon },
          { label: "Extract Audio", icon: genIcon },
          { label: "Text Selector", icon: genIcon },
          { label: "Text Concatenator", icon: genIcon },
          { label: "Image Router", icon: genIcon },
          { label: "Audio Router", icon: genIcon },
          { label: "Video Router", icon: genIcon },
          { label: "Text Router", icon: genIcon },
        ],
      },
      {
        label: "LLM Call",
        models: [
          { label: "GPT 5.4 Nano", icon: genIcon },
          { label: "GPT 5.4 Mini", icon: genIcon },
          { label: "GPT 5.4", icon: genIcon },
          { label: "GPT 5.5", icon: genIcon },
          { label: "GPT 5.5 Pro", icon: genIcon },
          { label: "Gemini 3.1 Pro", kind: "gemini", icon: <Sparkles className="h-4 w-4" /> },
          { label: "Claude Sonnet 4.6", icon: genIcon },
          { label: "Claude Opus 4.6", icon: genIcon },
          { label: "Claude Opus 4.8", icon: genIcon },
          { label: "Gemini 3.1 Flash Lite", icon: genIcon },
        ],
      },
    ],
  },
];

const RECENT_KEY = "magica:recent-nodes";

function readRecent(): NodeKind[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw.filter((k): k is NodeKind => typeof k === "string" && k in FUNCTIONAL_META);
  } catch {
    return [];
  }
}

function Tooltip({ label, children, onClick }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <div className="group relative flex">
      <button
        onClick={onClick}
        className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-ink/[0.06] hover:text-ink"
        aria-label={label}
      >
        {children}
      </button>
      <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
        {label}
      </span>
    </div>
  );
}

export function AddStickyBar({ onAdd }: { onAdd: (kind: NodeKind) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeRow, setActiveRow] = useState<Row | null>(null);
  const [recent, setRecent] = useState<NodeKind[]>([]);

  useEffect(() => {
    if (open) setRecent(readRecent());
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATEGORIES;
    return CATEGORIES.map((c) => ({
      ...c,
      rows: c.rows.filter(
        (r) =>
          r.label.toLowerCase().includes(q) ||
          r.models?.some((m) => m.label.toLowerCase().includes(q)),
      ),
    })).filter((c) => c.rows.length > 0);
  }, [query]);

  function close() {
    setOpen(false);
    setQuery("");
    setActiveRow(null);
  }

  function addAndRecord(kind: NodeKind) {
    onAdd(kind);
    const next = [kind, ...readRecent().filter((k) => k !== kind)].slice(0, 5);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    setRecent(next);
    close();
  }

  return (
    <div className="relative flex items-center gap-0.5 rounded-xl border border-hairline bg-white/95 px-1.5 py-1 shadow-pop backdrop-blur">
      <Tooltip label="Add sticky note" onClick={() => onAdd("sticky")}>
        <StickyNote className="h-4 w-4" />
      </Tooltip>

      <div className="relative flex">
        <Tooltip label="Add node" onClick={() => (open ? close() : setOpen(true))}>
          <Plus className="h-4 w-4" />
        </Tooltip>

        {open && (
          <>
            <div className="fixed inset-0 z-0" onClick={close} />
            <div className="absolute bottom-full left-1/2 z-10 mb-3 flex -translate-x-1/2 animate-fade-in overflow-hidden rounded-2xl border border-hairline bg-white shadow-pop">
              {/* ── Left column: search + categories ── */}
              <div className="flex w-72 flex-col">
                <div className="flex items-center gap-2 border-b border-hairline px-3 py-2.5">
                  <Search className="h-4 w-4 shrink-0 text-ink-faint" />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setActiveRow(null);
                    }}
                    placeholder="Search nodes or models..."
                    className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-ink-faint"
                  />
                  <button onClick={close} className="flex h-5 w-5 items-center justify-center rounded text-ink-faint hover:text-ink">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="max-h-[360px] overflow-y-auto py-1">
                  {/* Recent */}
                  {!query && recent.length > 0 && (
                    <div className="px-1 pb-1">
                      <div className="flex items-center gap-1.5 px-2.5 pb-0.5 pt-1.5 text-[10px] font-semibold tracking-wide text-ink-faint">
                        <Clock className="h-3.5 w-3.5" /> Recent
                      </div>
                      {recent.map((kind) => (
                        <button
                          key={kind}
                          onClick={() => addAndRecord(kind)}
                          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-ink transition-colors hover:bg-ink/[0.04]"
                        >
                          <span className="text-ink-muted">{FUNCTIONAL_META[kind]?.icon}</span>
                          {FUNCTIONAL_META[kind]?.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {filtered.length === 0 && (
                    <p className="px-3 py-4 text-center text-[12px] text-ink-faint">No matches</p>
                  )}
                  {filtered.map((c) => (
                    <div key={c.cat} className="px-1 pb-1">
                      <div className="flex items-center gap-1.5 px-2.5 pb-0.5 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
                        {c.icon} {c.cat}
                      </div>
                      {c.rows.map((r) => (
                        <button
                          key={r.label}
                          onClick={() => setActiveRow(r)}
                          onMouseEnter={() => setActiveRow(r)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[13px] text-ink transition-colors hover:bg-ink/[0.04]",
                            activeRow?.label === r.label && "bg-ink/[0.05]",
                          )}
                        >
                          <span>{r.label}</span>
                          <ChevronRight className="h-4 w-4 text-ink-faint" />
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Right column: models for the active row ── */}
              {activeRow && (
                <div className="flex w-60 flex-col border-l border-hairline">
                  <div className="border-b border-hairline px-3 py-2.5 text-[12px] font-semibold text-ink-muted">
                    {activeRow.label}
                  </div>
                  <div className="max-h-[360px] overflow-y-auto px-1 py-1">
                    {activeRow.models && activeRow.models.length > 0 ? (
                      activeRow.models.map((m) =>
                        m.kind ? (
                          <button
                            key={m.label}
                            onClick={() => addAndRecord(m.kind!)}
                            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-ink transition-colors hover:bg-violet-50"
                          >
                            <span className="text-ink-muted">{m.icon}</span> {m.label}
                          </button>
                        ) : (
                          <div
                            key={m.label}
                            className="flex w-full cursor-default items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-ink/80"
                          >
                            <span className="text-ink-faint">{m.icon}</span> {m.label}
                          </div>
                        ),
                      )
                    ) : (
                      <p className="px-3 py-4 text-center text-[12px] text-ink-faint">
                        No tools available yet.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
