"use client";

import { cn } from "@/lib/utils";
import type { NodeRunState } from "@/types/flow";
import { StatusBadge } from "./parts";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { useState } from "react";
import { useWorkflowStore } from "@/store/workflow-store";

export function NodeShell({
  nodeId,
  title,
  icon,
  accent,
  runState,
  selected,
  headerExtra,
  children,
  width = 300,
}: {
  nodeId: string;
  title: string;
  icon: React.ReactNode;
  accent: string;
  runState: NodeRunState;
  selected?: boolean;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
  width?: number;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const deleteNode = useWorkflowStore((s) => s.deleteNode);

  return (
    <div
      style={{ width }}
      className={cn(
        "rounded-node border bg-white shadow-node transition-shadow",
        "hover:shadow-node-hover",
        selected ? "border-violet-400" : "border-hairline",
        runState === "running" && "animate-pulse-glow border-violet-400",
        runState === "completed" && "border-emerald-200",
        runState === "failed" && "border-red-300",
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-hairline px-3 py-2.5">
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-white"
          style={{ background: accent }}
        >
          {icon}
        </span>
        <span className="flex-1 truncate text-[13px] font-semibold text-ink">
          {title}
        </span>
        {headerExtra}
        <StatusBadge state={runState} />
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
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-7 z-20 w-36 animate-fade-in rounded-lg border border-hairline bg-white p-1 shadow-pop">
                <button
                  onClick={() => {
                    deleteNode(nodeId);
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete node
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-3 px-3 py-3">{children}</div>
    </div>
  );
}
