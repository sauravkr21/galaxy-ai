"use client";

import { useMemo, useState } from "react";
import {
  StickyNote,
  Plus,
  Search,
  X,
  ChevronRight,
  ChevronLeft,
  Image as ImageIcon,
  Video,
  Mic,
  Layers,
  Crop,
  Sparkles,
} from "lucide-react";
import type { NodeKind } from "@/types/flow";

interface Model {
  label: string;
  desc: string;
  kind: NodeKind;
  icon: React.ReactNode;
  accent: string;
}
interface Row {
  label: string;
  models?: Model[]; // present => functional submenu
}
interface Category {
  cat: string;
  icon: React.ReactNode;
  rows: Row[];
}

// Mirrors the reference picker. Only the rows with `models` are functional for
// this trial (Crop Image under Edit Image, Gemini under LLM Call).
const CATEGORIES: Category[] = [
  {
    cat: "IMAGE",
    icon: <ImageIcon className="h-3.5 w-3.5" />,
    rows: [
      { label: "Generate Image" },
      {
        label: "Edit Image",
        models: [
          { label: "Crop Image", desc: "Crop an image via Trigger.dev (30s+)", kind: "crop-image", icon: <Crop className="h-4 w-4" />, accent: "#0ea5e9" },
        ],
      },
      { label: "3D" },
    ],
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
      { label: "Utility" },
      {
        label: "LLM Call",
        models: [
          { label: "Gemini 3.1 Pro", desc: "Call Google Gemini", kind: "gemini", icon: <Sparkles className="h-4 w-4" />, accent: "#7c5cff" },
        ],
      },
    ],
  },
];

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATEGORIES;
    return CATEGORIES.map((c) => ({
      ...c,
      rows: c.rows.filter((r) => r.label.toLowerCase().includes(q)),
    })).filter((c) => c.rows.length > 0);
  }, [query]);

  function close() {
    setOpen(false);
    setQuery("");
    setActiveRow(null);
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
            <div className="absolute bottom-full left-1/2 z-10 mb-3 w-80 -translate-x-1/2 animate-fade-in overflow-hidden rounded-2xl border border-hairline bg-white shadow-pop">
              {/* Search header */}
              <div className="flex items-center gap-2 border-b border-hairline px-3 py-2.5">
                <Search className="h-4 w-4 shrink-0 text-ink-faint" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setActiveRow(null); }}
                  placeholder="Search nodes or models..."
                  className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-ink-faint"
                />
                <button onClick={close} className="flex h-5 w-5 items-center justify-center rounded text-ink-faint hover:text-ink">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="max-h-[360px] overflow-y-auto py-1">
                {activeRow ? (
                  // ── Submenu (models for a row) ──
                  <div className="px-1">
                    <button
                      onClick={() => setActiveRow(null)}
                      className="mb-1 flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium text-ink-muted hover:text-ink"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" /> {activeRow.label}
                    </button>
                    {activeRow.models && activeRow.models.length > 0 ? (
                      activeRow.models.map((m) => (
                        <button
                          key={m.kind}
                          onClick={() => { onAdd(m.kind); close(); }}
                          className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-violet-50"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white" style={{ background: m.accent }}>
                            {m.icon}
                          </span>
                          <span className="flex flex-col">
                            <span className="text-[13px] font-semibold text-ink">{m.label}</span>
                            <span className="text-[11px] text-ink-muted">{m.desc}</span>
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-4 text-center text-[12px] text-ink-faint">
                        No modules available in this build.
                      </p>
                    )}
                  </div>
                ) : (
                  // ── Category list ──
                  <>
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
                            className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[13px] text-ink transition-colors hover:bg-ink/[0.04]"
                          >
                            <span className="flex items-center gap-2">
                              {r.label}
                              {r.models && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" title="Available" />}
                            </span>
                            <ChevronRight className="h-4 w-4 text-ink-faint" />
                          </button>
                        ))}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
