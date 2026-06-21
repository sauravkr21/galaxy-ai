"use client";

import { useMemo, useState } from "react";
import { StickyNote, Plus, Crop, Sparkles, Search } from "lucide-react";
import type { NodeKind } from "@/types/flow";

// The bottom-center picker only offers the nodes that are functional for this
// trial (Request-Inputs & Response are pre-placed, not addable). Grouped by
// category to mirror the reference picker.
const ADD_ITEMS: {
  kind: NodeKind;
  label: string;
  desc: string;
  category: string;
  icon: React.ReactNode;
  accent: string;
}[] = [
  { kind: "crop-image", label: "Crop Image", desc: "Crop an image via Trigger.dev (30s+)", category: "Image", icon: <Crop className="h-4 w-4" />, accent: "#0ea5e9" },
  { kind: "gemini", label: "Gemini 3.1 Pro", desc: "Call Google Gemini", category: "AI / LLM", icon: <Sparkles className="h-4 w-4" />, accent: "#7c5cff" },
];

/** Bottom-center cluster: a sticky-note button and an add-node button —
 *  separate from the controls bar, matching the reference. */
export function AddStickyBar({ onAdd }: { onAdd: (kind: NodeKind) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = ADD_ITEMS.filter(
      (i) => i.label.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q),
    );
    const byCat: Record<string, typeof ADD_ITEMS> = {};
    for (const i of matched) (byCat[i.category] ??= []).push(i);
    return byCat;
  }, [query]);

  return (
    <div className="relative flex items-center gap-0.5 rounded-xl border border-hairline bg-white/95 px-1.5 py-1 shadow-pop backdrop-blur">
      <div className="group relative flex">
        <button
          onClick={() => onAdd("sticky")}
          className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-ink/[0.06] hover:text-ink"
          aria-label="Add sticky note"
        >
          <StickyNote className="h-4 w-4" />
        </button>
        <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
          Add sticky note
        </span>
      </div>

      <div className="relative flex">
        <div className="group flex">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-ink/[0.06] hover:text-ink"
            aria-label="Add node"
          >
            <Plus className="h-4 w-4" />
          </button>
          <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
            Add node
          </span>
        </div>
        {open && (
          <>
            <div className="fixed inset-0 z-0" onClick={() => setOpen(false)} />
            <div className="absolute bottom-full left-1/2 z-10 mb-3 w-72 -translate-x-1/2 animate-fade-in rounded-2xl border border-hairline bg-white p-2 shadow-pop">
              <div className="relative mb-1.5">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search nodes or modules..."
                  className="h-8 w-full rounded-lg border border-hairline bg-white pl-8 pr-2 text-[12px] outline-none focus:border-violet-400"
                />
              </div>
              {Object.keys(groups).length === 0 && (
                <p className="px-2 py-3 text-center text-[12px] text-ink-faint">No matches</p>
              )}
              {Object.entries(groups).map(([cat, items]) => (
                <div key={cat} className="mb-1">
                  <p className="px-2 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
                    {cat}
                  </p>
                  {items.map((it) => (
                    <button
                      key={it.kind}
                      onClick={() => { onAdd(it.kind); setOpen(false); setQuery(""); }}
                      className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-violet-50"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white" style={{ background: it.accent }}>
                        {it.icon}
                      </span>
                      <span className="flex flex-col">
                        <span className="text-[13px] font-semibold text-ink">{it.label}</span>
                        <span className="text-[11px] text-ink-muted">{it.desc}</span>
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
