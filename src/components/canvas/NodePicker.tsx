"use client";

import { useState } from "react";
import { Plus, Inbox, Crop, Sparkles, Flag } from "lucide-react";
import type { NodeKind } from "@/types/flow";
import { cn } from "@/lib/utils";

const ITEMS: {
  kind: NodeKind;
  label: string;
  desc: string;
  icon: React.ReactNode;
  accent: string;
}[] = [
  {
    kind: "request-inputs",
    label: "Request-Inputs",
    desc: "Source of text + image inputs",
    icon: <Inbox className="h-4 w-4" />,
    accent: "#1a1a23",
  },
  {
    kind: "crop-image",
    label: "Crop Image",
    desc: "Crop via Trigger.dev (30s+)",
    icon: <Crop className="h-4 w-4" />,
    accent: "#0ea5e9",
  },
  {
    kind: "gemini",
    label: "Gemini 3.1 Pro",
    desc: "Call Google Gemini",
    icon: <Sparkles className="h-4 w-4" />,
    accent: "#7c5cff",
  },
  {
    kind: "response",
    label: "Response",
    desc: "Collect the final result",
    icon: <Flag className="h-4 w-4" />,
    accent: "#6a45f0",
  },
];

export function NodePicker({ onAdd }: { onAdd: (kind: NodeKind) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex flex-col items-center">
      {open && (
        <>
          <div className="fixed inset-0 z-0" onClick={() => setOpen(false)} />
          <div className="z-10 mb-3 w-72 animate-fade-in rounded-2xl border border-hairline bg-white p-1.5 shadow-pop">
            {ITEMS.map((it) => (
              <button
                key={it.kind}
                onClick={() => {
                  onAdd(it.kind);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-violet-50"
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
                  style={{ background: it.accent }}
                >
                  {it.icon}
                </span>
                <span className="flex flex-col">
                  <span className="text-[13px] font-semibold text-ink">
                    {it.label}
                  </span>
                  <span className="text-[11px] text-ink-muted">{it.desc}</span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "z-10 flex h-12 w-12 items-center justify-center rounded-full bg-violet-500 text-white shadow-pop transition-transform hover:scale-105",
          open && "rotate-45",
        )}
        aria-label="Add node"
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}
