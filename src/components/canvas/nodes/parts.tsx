"use client";

import { Handle, Position } from "@xyflow/react";
import { cn } from "@/lib/utils";
import type { NodeRunState, PortType } from "@/types/flow";
import { Loader2, Check, AlertCircle, Plus, Info } from "lucide-react";

// Handle colors matched to the reference: text=orange, image=blue, video=green,
// audio=cyan, file=purple, any (e.g. crop X/Y/W/H)=pink.
const PORT_COLORS: Record<PortType, string> = {
  text: "#f59e0b",
  image: "#3b82f6",
  video: "#22c55e",
  audio: "#06b6d4",
  file: "#a855f7",
  any: "#ec4899",
};

/** Small info icon that reveals helper text on hover. */
export function InfoTip({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return (
    <span className={cn("group/tip relative inline-flex", className)}>
      <Info className="h-3 w-3 cursor-help text-ink-faint" />
      <span className="pointer-events-none absolute left-1/2 top-[calc(100%+4px)] z-50 w-max max-w-[200px] -translate-x-1/2 rounded-md border border-hairline bg-white px-2 py-1 text-[10px] font-normal leading-snug text-ink-muted opacity-0 shadow-pop transition-opacity duration-100 group-hover/tip:opacity-100">
        {text}
      </span>
    </span>
  );
}

/** A typed connection handle with a label sitting beside it. */
export function Port({
  id,
  label,
  type,
  side,
  connected,
  required,
  info,
  strong,
}: {
  id: string;
  label: string;
  type: PortType;
  side: "left" | "right";
  connected?: boolean;
  /** Renders a red required asterisk after the label. */
  required?: boolean;
  /** Adds an info icon after the label with this hover text. */
  info?: string;
  /** Use the strong (dark) label colour instead of muted. */
  strong?: boolean;
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
          "flex items-center text-[11px] font-medium",
          connected ? "text-violet-600" : strong ? "text-ink" : "text-ink-muted",
        )}
      >
        <span>{label}</span>
        {required && <span className="text-red-500">*</span>}
        {info && (
          <span className="ml-1">
            <InfoTip text={info} />
          </span>
        )}
        {connected && <span className="ml-1">· connected</span>}
      </span>
    </div>
  );
}

/** Small "+" control that wires an input to the Request-Inputs node.
 *  Shows an "Add to request" tooltip on hover. */
export function AddToRequestButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="group/atr relative shrink-0">
      <button
        type="button"
        onClick={onClick}
        aria-label="Add to request"
        className="nodrag flex h-8 w-8 items-center justify-center rounded-lg border border-hairline text-ink-muted transition-colors hover:border-violet-300 hover:bg-violet-50 hover:text-violet-600"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
      <span className="pointer-events-none absolute right-0 top-[calc(100%+4px)] z-50 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[10px] font-medium text-white opacity-0 shadow-pop transition-opacity duration-100 group-hover/atr:opacity-100">
        Add to request
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
