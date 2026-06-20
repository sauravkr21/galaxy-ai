"use client";

import { Handle, Position } from "@xyflow/react";
import { cn } from "@/lib/utils";
import type { NodeRunState, PortType } from "@/types/flow";
import { Loader2, Check, AlertCircle } from "lucide-react";

const PORT_COLORS: Record<PortType, string> = {
  text: "#f5a623",
  image: "#7c5cff",
  video: "#7c5cff",
  audio: "#22c55e",
  file: "#0ea5e9",
  any: "#9a9aa7",
};

/** A typed connection handle with a label sitting beside it. */
export function Port({
  id,
  label,
  type,
  side,
  connected,
}: {
  id: string;
  label: string;
  type: PortType;
  side: "left" | "right";
  connected?: boolean;
}) {
  const color = PORT_COLORS[type];
  return (
    <div
      className={cn(
        "relative flex items-center gap-2",
        side === "right" && "flex-row-reverse",
      )}
    >
      <Handle
        id={id}
        type={side === "left" ? "target" : "source"}
        position={side === "left" ? Position.Left : Position.Right}
        style={{ background: color, borderColor: "#fff" }}
        className={cn("!h-3 !w-3", side === "left" ? "!-left-[6px]" : "!-right-[6px]")}
      />
      <span
        className={cn(
          "text-[11px] font-medium",
          connected ? "text-violet-600" : "text-ink-muted",
        )}
      >
        {label}
        {connected && " · connected"}
      </span>
    </div>
  );
}

export function StatusBadge({ state }: { state: NodeRunState }) {
  if (state === "idle") return null;
  const map: Record<
    Exclude<NodeRunState, "idle">,
    { label: string; className: string; icon: React.ReactNode }
  > = {
    queued: {
      label: "Queued",
      className: "bg-ink/5 text-ink-muted",
      icon: <Loader2 className="h-3 w-3" />,
    },
    running: {
      label: "Running",
      className: "bg-amber-soft text-amber-ink",
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
    },
    completed: {
      label: "Completed",
      className: "bg-emerald-50 text-emerald-600",
      icon: <Check className="h-3 w-3" />,
    },
    failed: {
      label: "Failed",
      className: "bg-red-50 text-red-600",
      icon: <AlertCircle className="h-3 w-3" />,
    },
  };
  const m = map[state];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-[10px] font-semibold",
        m.className,
      )}
    >
      {m.icon}
      {m.label}
    </span>
  );
}

/** Field label used throughout the node bodies. */
export function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="mb-1 flex items-center gap-1 text-[11px] font-medium text-ink-muted">
      {children}
      {required && <span className="text-violet-500">*</span>}
    </label>
  );
}
