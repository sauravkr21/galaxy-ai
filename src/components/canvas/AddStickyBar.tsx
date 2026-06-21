"use client";

import { useState } from "react";
import { StickyNote, Plus, Inbox, Crop, Sparkles, Flag } from "lucide-react";
import type { NodeKind } from "@/types/flow";

const ADD_ITEMS: {
  kind: NodeKind;
  label: string;
  desc: string;
  icon: React.ReactNode;
  accent: string;
}[] = [
  { kind: "request-inputs", label: "Request-Inputs", desc: "Source of text + image inputs", icon: <Inbox className="h-4 w-4" />, accent: "#1a1a23" },
  { kind: "crop-image", label: "Crop Image", desc: "Crop via Trigger.dev (30s+)", icon: <Crop className="h-4 w-4" />, accent: "#0ea5e9" },
  { kind: "gemini", label: "Gemini 3.1 Pro", desc: "Call Google Gemini", icon: <Sparkles className="h-4 w-4" />, accent: "#7c5cff" },
  { kind: "response", label: "Response", desc: "Collect the final result", icon: <Flag className="h-4 w-4" />, accent: "#6a45f0" },
];

/** Bottom-center cluster: a sticky-note button and an add-node button —
 *  separate from the controls bar, matching the reference. */
export function AddStickyBar({ onAdd }: { onAdd: (kind: NodeKind) => void }) {
  const [open, setOpen] = useState(false);

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
            <div className="absolute bottom-full left-1/2 z-10 mb-3 w-64 -translate-x-1/2 animate-fade-in rounded-2xl border border-hairline bg-white p-1.5 shadow-pop">
              {ADD_ITEMS.map((it) => (
                <button
                  key={it.kind}
                  onClick={() => { onAdd(it.kind); setOpen(false); }}
                  className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-violet-50"
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
          </>
        )}
      </div>
    </div>
  );
}
