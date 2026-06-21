"use client";

import { cn } from "@/lib/utils";
import type { NodeRunState } from "@/types/flow";
import {
  MoreHorizontal,
  Trash2,
  Play,
  Loader2,
  Check,
  AlertCircle,
  Info,
  RotateCcw,
  Copy,
  CopyPlus,
  Lock,
  Unlock,
} from "lucide-react";
import { useState } from "react";
import { useWorkflowStore } from "@/store/workflow-store";

export function NodeShell({
  nodeId,
  title,
  subtitle,
  icon,
  accent,
  runState,
  selected,
  headerExtra,
  children,
  width = 300,
  showRun = false,
  deletable = true,
  showMenu = true,
  cost,
}: {
  nodeId: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  accent: string;
  runState: NodeRunState;
  selected?: boolean;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
  width?: number;
  showRun?: boolean;
  deletable?: boolean;
  showMenu?: boolean;
  cost?: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const deleteNode = useWorkflowStore((s) => s.deleteNode);
  const duplicateNode = useWorkflowStore((s) => s.duplicateNode);
  const toggleLock = useWorkflowStore((s) => s.toggleLock);
  const clearNodeOutput = useWorkflowStore((s) => s.clearNodeOutput);
  const locked = useWorkflowStore(
    (s) => s.nodes.find((n) => n.id === nodeId)?.draggable === false,
  );

  return (
    <div
      style={{ width }}
      className={cn(
        "rounded-node border bg-white shadow-node transition-shadow",
        "hover:shadow-node-hover",
        selected ? "border-violet-500 ring-2 ring-violet-200" : "border-hairline",
        runState === "running" && "animate-pulse-glow border-violet-400",
        runState === "completed" && !selected && "border-emerald-300",
        runState === "failed" && !selected && "border-red-300",
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-2 border-b border-hairline px-3 py-2.5">
        <span
          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-white"
          style={{ background: accent }}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold leading-tight text-ink">
            {title}
          </div>
          {subtitle && (
            <div className="mt-0.5 line-clamp-2 text-[10.5px] leading-snug text-ink-faint">
              {subtitle}
            </div>
          )}
        </div>
        {subtitle && (
          <div className="group/info relative flex">
            <button className="nodrag flex h-6 w-6 items-center justify-center rounded-md text-ink-faint hover:bg-ink/5" aria-label="Info">
              <Info className="h-3.5 w-3.5" />
            </button>
            <span className="pointer-events-none absolute right-0 top-7 z-30 w-52 rounded-md border border-hairline bg-white px-2 py-1.5 text-[10px] leading-snug text-ink-muted opacity-0 shadow-pop transition-opacity group-hover/info:opacity-100">
              {subtitle}
            </span>
          </div>
        )}
        {showRun && (
          <button
            onClick={() => clearNodeOutput(nodeId)}
            className="nodrag flex h-6 w-6 items-center justify-center rounded-md text-ink-faint hover:bg-ink/5"
            aria-label="Reset output"
            title="Reset output"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}
        {headerExtra}
        {showRun ? (
          <RunControl nodeId={nodeId} runState={runState} />
        ) : (
          <StatusOnly runState={runState} />
        )}
        {showMenu && (
        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="nodrag flex h-6 w-6 items-center justify-center rounded-md text-ink-faint hover:bg-ink/5"
            aria-label="Node menu"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-7 z-20 w-44 animate-fade-in rounded-lg border border-hairline bg-white p-1 shadow-pop">
                {deletable && (
                  <>
                    <MenuItem icon={<Copy className="h-3.5 w-3.5" />} label="Duplicate" onClick={() => { duplicateNode(nodeId, false); setMenuOpen(false); }} />
                    <MenuItem icon={<CopyPlus className="h-3.5 w-3.5" />} label="Duplicate with Edges" onClick={() => { duplicateNode(nodeId, true); setMenuOpen(false); }} />
                  </>
                )}
                <MenuItem
                  icon={locked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                  label={locked ? "Unlock" : "Lock"}
                  onClick={() => { toggleLock(nodeId); setMenuOpen(false); }}
                />
                {deletable && (
                  <>
                    <div className="my-1 h-px bg-hairline" />
                    <button
                      onClick={() => { deleteNode(nodeId); setMenuOpen(false); }}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col gap-3 px-3 py-3">{children}</div>

      {cost && (
        <div className="flex items-center justify-end gap-1 border-t border-hairline px-3 py-1.5 text-[10px] text-ink-faint">
          <Play className="h-2.5 w-2.5" /> {cost}
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] text-ink hover:bg-ink/5"
    >
      {icon} {label}
    </button>
  );
}

/** Status pill for local (non-executable) nodes — no Run button. */
function StatusOnly({ runState }: { runState: NodeRunState }) {
  if (runState === "idle") return null;
  const map: Record<string, { cls: string; label: string; icon: React.ReactNode }> = {
    queued: { cls: "bg-ink/5 text-ink-muted", label: "Queued", icon: <Loader2 className="h-3 w-3" /> },
    running: { cls: "bg-amber-soft text-amber-ink", label: "Running", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
    completed: { cls: "bg-emerald-50 text-emerald-600", label: "Done", icon: <Check className="h-3 w-3" /> },
    failed: { cls: "bg-red-50 text-red-600", label: "Failed", icon: <AlertCircle className="h-3 w-3" /> },
  };
  const m = map[runState];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-[10px] font-semibold", m.cls)}>
      {m.icon} {m.label}
    </span>
  );
}

/** The green per-node "Run" pill (runs just this node), mirroring the
 *  reference. Switches to amber "Running" / states while executing. */
function RunControl({ nodeId, runState }: { nodeId: string; runState: NodeRunState }) {
  const runFn = useWorkflowStore((s) => s.runFn);
  const isRunning = useWorkflowStore((s) => s.isRunning);

  if (runState === "running") {
    return (
      <span className="inline-flex items-center gap-1 rounded-pill bg-amber-soft px-2 py-0.5 text-[10px] font-semibold text-amber-ink">
        <Loader2 className="h-3 w-3 animate-spin" /> Running
      </span>
    );
  }
  if (runState === "queued") {
    return (
      <span className="inline-flex items-center gap-1 rounded-pill bg-ink/5 px-2 py-0.5 text-[10px] font-semibold text-ink-muted">
        <Loader2 className="h-3 w-3" /> Queued
      </span>
    );
  }
  return (
    <button
      onClick={() => runFn?.("single", [nodeId])}
      disabled={isRunning || !runFn}
      title="Run this node"
      className={cn(
        "nodrag inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-[10px] font-semibold transition-colors",
        runState === "failed"
          ? "bg-red-50 text-red-600 hover:bg-red-100"
          : runState === "completed"
            ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
            : "bg-emerald-500 text-white hover:bg-emerald-600",
        (isRunning || !runFn) && "cursor-not-allowed opacity-50",
      )}
    >
      {runState === "completed" ? (
        <Check className="h-3 w-3" />
      ) : runState === "failed" ? (
        <AlertCircle className="h-3 w-3" />
      ) : (
        <Play className="h-3 w-3 fill-current" />
      )}
      Run
    </button>
  );
}
