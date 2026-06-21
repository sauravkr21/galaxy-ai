"use client";

import { useState } from "react";
import { useReactFlow, useStore } from "@xyflow/react";
import {
  Plus,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  MousePointer2,
  Keyboard,
  ChevronUp,
  ChevronDown,
  Inbox,
  Crop,
  Sparkles,
  Flag,
} from "lucide-react";
import type { NodeKind } from "@/types/flow";
import { useWorkflowStore } from "@/store/workflow-store";
import { cn } from "@/lib/utils";

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

/** Small icon button with a dark tooltip above (matching the reference). */
function ToolBtn({
  label,
  onClick,
  active,
  children,
  disabled,
}: {
  label: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="group relative flex">
      <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-ink/[0.06] hover:text-ink",
          active && "bg-violet-50 text-violet-600",
          disabled && "cursor-not-allowed opacity-40 hover:bg-transparent",
        )}
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

const Divider = () => <div className="mx-0.5 h-5 w-px bg-hairline" />;

export function CanvasToolbar({
  onAdd,
  selectMode,
  onToggleSelectMode,
}: {
  onAdd: (kind: NodeKind) => void;
  selectMode: boolean;
  onToggleSelectMode: () => void;
}) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const zoom = useStore((s) => s.transform[2]);
  const undo = useWorkflowStore((s) => s.undo);
  const redo = useWorkflowStore((s) => s.redo);
  const canUndo = useWorkflowStore((s) => s.past.length > 0);
  const canRedo = useWorkflowStore((s) => s.future.length > 0);

  const [addOpen, setAddOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [hidden, setHidden] = useState(false);

  if (hidden) {
    return (
      <div className="rounded-xl border border-hairline bg-white/95 p-1 shadow-pop backdrop-blur">
        <ToolBtn label="Show controls" onClick={() => setHidden(false)}>
          <ChevronUp className="h-4 w-4" />
        </ToolBtn>
      </div>
    );
  }

  return (
    <div className="relative flex items-center gap-0.5 rounded-xl border border-hairline bg-white/95 px-1.5 py-1 shadow-pop backdrop-blur">
      {/* Add node */}
      <div className="relative">
        <ToolBtn label="Add node" onClick={() => setAddOpen((o) => !o)} active={addOpen}>
          <Plus className="h-4 w-4" />
        </ToolBtn>
        {addOpen && (
          <>
            <div className="fixed inset-0 z-0" onClick={() => setAddOpen(false)} />
            <div className="absolute bottom-full left-0 z-10 mb-3 w-64 animate-fade-in rounded-2xl border border-hairline bg-white p-1.5 shadow-pop">
              {ADD_ITEMS.map((it) => (
                <button
                  key={it.kind}
                  onClick={() => { onAdd(it.kind); setAddOpen(false); }}
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

      <Divider />

      <ToolBtn label="Undo" onClick={undo} disabled={!canUndo}>
        <Undo2 className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn label="Redo" onClick={redo} disabled={!canRedo}>
        <Redo2 className="h-4 w-4" />
      </ToolBtn>

      <Divider />

      <ToolBtn label="Zoom out" onClick={() => zoomOut()}>
        <ZoomOut className="h-4 w-4" />
      </ToolBtn>
      <button
        onClick={() => fitView({ padding: 0.3, duration: 200 })}
        className="min-w-[44px] rounded-md px-1.5 py-1 text-center text-[12px] font-medium tabular-nums text-ink-muted hover:bg-ink/[0.06]"
        title="Reset zoom"
      >
        {Math.round((zoom ?? 1) * 100)}%
      </button>
      <ToolBtn label="Zoom in" onClick={() => zoomIn()}>
        <ZoomIn className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn label="Fit view" onClick={() => fitView({ padding: 0.3, duration: 200 })}>
        <Maximize2 className="h-4 w-4" />
      </ToolBtn>

      <Divider />

      <ToolBtn
        label={selectMode ? "Select mode (on)" : "Select mode"}
        onClick={onToggleSelectMode}
        active={selectMode}
      >
        <MousePointer2 className="h-4 w-4" />
      </ToolBtn>

      <div className="relative">
        <ToolBtn label="Keyboard shortcuts" onClick={() => setShortcutsOpen((o) => !o)} active={shortcutsOpen}>
          <Keyboard className="h-4 w-4" />
        </ToolBtn>
        {shortcutsOpen && (
          <>
            <div className="fixed inset-0 z-0" onClick={() => setShortcutsOpen(false)} />
            <div className="absolute bottom-full right-0 z-10 mb-3 w-56 animate-fade-in rounded-xl border border-hairline bg-white p-2 text-[11px] shadow-pop">
              <p className="mb-1.5 px-1 font-semibold text-ink">Keyboard shortcuts</p>
              {[
                ["Delete / Backspace", "Delete selection"],
                ["Ctrl / ⌘ + Z", "Undo"],
                ["Ctrl / ⌘ + Shift + Z", "Redo"],
                ["Scroll / pinch", "Zoom"],
                ["Drag canvas", "Pan"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between px-1 py-0.5">
                  <span className="text-ink-muted">{v}</span>
                  <kbd className="rounded bg-ink/5 px-1.5 py-0.5 font-mono text-[10px] text-ink">{k}</kbd>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <ToolBtn label="Hide controls" onClick={() => setHidden(true)}>
        <ChevronDown className="h-4 w-4" />
      </ToolBtn>
    </div>
  );
}
