"use client";

import { useState } from "react";
import { useReactFlow, useStore } from "@xyflow/react";
import {
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Move,
  Command,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useWorkflowStore } from "@/store/workflow-store";
import { cn } from "@/lib/utils";

/** Icon button with a dark tooltip above (matching the reference). The
 *  optional shortcut renders as a badge to the right of the label. */
function ToolBtn({
  label,
  shortcut,
  onClick,
  active,
  disabled,
  children,
}: {
  label: string;
  shortcut?: string;
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
      <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
        <span>{label}</span>
        {shortcut && (
          <kbd className="rounded bg-white/15 px-1.5 py-0.5 font-medium text-white/80">
            {shortcut}
          </kbd>
        )}
      </span>
    </div>
  );
}

const Divider = () => <div className="mx-0.5 h-5 w-px bg-hairline" />;

export function CanvasToolbar({
  selectMode,
  onToggleSelectMode,
}: {
  selectMode: boolean;
  onToggleSelectMode: () => void;
}) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const zoom = useStore((s) => s.transform[2]);
  const undo = useWorkflowStore((s) => s.undo);
  const redo = useWorkflowStore((s) => s.redo);
  const autoLayout = useWorkflowStore((s) => s.autoLayout);
  const canUndo = useWorkflowStore((s) => s.past.length > 0);
  const canRedo = useWorkflowStore((s) => s.future.length > 0);

  const [collapsed, setCollapsed] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  if (collapsed) {
    return (
      <div className="rounded-xl border border-hairline bg-white/95 p-1 shadow-pop backdrop-blur">
        <ToolBtn label="Expand controls" onClick={() => setCollapsed(false)}>
          <ChevronRight className="h-4 w-4" />
        </ToolBtn>
      </div>
    );
  }

  return (
    <div className="relative flex items-center gap-0.5 rounded-xl border border-hairline bg-white/95 px-1.5 py-1 shadow-pop backdrop-blur">
      <ToolBtn label="Collapse controls" onClick={() => setCollapsed(true)}>
        <ChevronLeft className="h-4 w-4" />
      </ToolBtn>

      <Divider />

      <ToolBtn label="Undo" shortcut="⌘Z" onClick={undo} disabled={!canUndo}>
        <Undo2 className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn label="Redo" shortcut="⌘Y" onClick={redo} disabled={!canRedo}>
        <Redo2 className="h-4 w-4" />
      </ToolBtn>

      <div className="relative">
        <ToolBtn label="Keyboard shortcuts" onClick={() => setShortcutsOpen((o) => !o)} active={shortcutsOpen}>
          <Command className="h-4 w-4" />
        </ToolBtn>
        {shortcutsOpen && (
          <>
            <div className="fixed inset-0 z-0" onClick={() => setShortcutsOpen(false)} />
            <div className="absolute bottom-full left-0 z-10 mb-3 w-56 animate-fade-in rounded-xl border border-hairline bg-white p-2 text-[11px] shadow-pop">
              <p className="mb-1.5 px-1 font-semibold text-ink">Keyboard shortcuts</p>
              {[
                ["Delete", "Delete selection"],
                ["Ctrl/⌘ Z", "Undo"],
                ["Ctrl/⌘ ⇧ Z", "Redo"],
                ["Scroll", "Zoom"],
                ["Drag", "Pan"],
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

      <Divider />

      <ToolBtn label="Zoom out" shortcut="−" onClick={() => zoomOut()}>
        <ZoomOut className="h-4 w-4" />
      </ToolBtn>
      <button
        onClick={() => fitView({ padding: 0.3, duration: 200 })}
        className="min-w-[44px] rounded-md px-1.5 py-1 text-center text-[12px] font-medium tabular-nums text-ink-muted hover:bg-ink/[0.06]"
        title="Reset zoom"
      >
        {Math.round((zoom ?? 1) * 100)}%
      </button>
      <ToolBtn label="Zoom in" shortcut="+" onClick={() => zoomIn()}>
        <ZoomIn className="h-4 w-4" />
      </ToolBtn>

      <Divider />

      <ToolBtn label="Fit view" shortcut="F" onClick={() => fitView({ padding: 0.3, duration: 200 })}>
        <Maximize2 className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn label="Auto-arrange" shortcut="Shift+A" onClick={autoLayout}>
        <LayoutGrid className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn
        label={selectMode ? "Select mode (on)" : "Select / move"}
        shortcut="S"
        onClick={onToggleSelectMode}
        active={selectMode}
      >
        <Move className="h-4 w-4" />
      </ToolBtn>
    </div>
  );
}
