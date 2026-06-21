"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  CircleDashed,
} from "lucide-react";
import { useWorkflowStore } from "@/store/workflow-store";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/utils";

interface NodeRunDto {
  id: string;
  nodeId: string;
  nodeType: string;
  label: string;
  status: string;
  input: unknown;
  output: unknown;
  logs: string[];
  error: string | null;
  durationMs: number | null;
  triggerRunId: string | null;
}
interface RunDto {
  id: string;
  status: string;
  mode: string;
  createdAt: string;
  finishedAt: string | null;
  error: string | null;
  nodeRuns: NodeRunDto[];
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  PENDING: <CircleDashed className="h-3.5 w-3.5 text-ink-faint" />,
  RUNNING: <Loader2 className="h-3.5 w-3.5 animate-spin text-amber" />,
  COMPLETED: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
  FAILED: <XCircle className="h-3.5 w-3.5 text-red-500" />,
  SKIPPED: <CircleDashed className="h-3.5 w-3.5 text-ink-faint" />,
  QUEUED: <Clock className="h-3.5 w-3.5 text-ink-faint" />,
  CANCELLED: <XCircle className="h-3.5 w-3.5 text-ink-faint" />,
};

export function HistoryPanel({
  workflowId,
  onClose,
}: {
  workflowId: string;
  onClose: () => void;
}) {
  const historyVersion = useWorkflowStore((s) => s.historyVersion);
  const isRunning = useWorkflowStore((s) => s.isRunning);
  const [runs, setRuns] = useState<RunDto[]>([]);
  const [openRun, setOpenRun] = useState<string | null>(null);
  const [tab, setTab] = useState<"ai" | "api">("ai");

  const load = useCallback(async () => {
    try {
      const data: RunDto[] = await api.listRuns(workflowId);
      setRuns(data);
      if (!openRun && data.length) setOpenRun(data[0].id);
    } catch {
      /* ignore */
    }
  }, [workflowId, openRun]);

  useEffect(() => {
    load();
  }, [load, historyVersion]);

  // While a run is active, refresh the history every couple seconds.
  useEffect(() => {
    if (!isRunning) return;
    const t = setInterval(load, 1500);
    return () => clearInterval(t);
  }, [isRunning, load]);

  return (
    <aside className="flex h-full w-[360px] shrink-0 flex-col border-l border-hairline bg-white">
      <div className="flex items-center justify-between px-4 pb-1 pt-3">
        <h2 className="text-[14px] font-semibold text-ink">Execution History</h2>
        <button
          onClick={onClose}
          className="text-[12px] font-medium text-ink-muted hover:text-ink"
        >
          Close
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-hairline px-4">
        {(["ai", "api"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "-mb-px border-b-2 pb-2 pt-1 text-[12px] font-medium transition-colors",
              tab === t
                ? "border-violet-500 text-violet-700"
                : "border-transparent text-ink-muted hover:text-ink",
            )}
          >
            {t === "ai" ? "AI Runs" : "API Runs"}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto px-2 py-2">
        {tab === "api" ? (
          <p className="px-2 py-10 text-center text-[12px] text-ink-faint">
            No API runs for this flow yet.
          </p>
        ) : runs.length === 0 ? (
          <p className="px-2 py-10 text-center text-[12px] text-ink-faint">
            No runs for this flow yet. Hit Run to execute the workflow.
          </p>
        ) : (
          runs.map((run) => (
            <RunRow
              key={run.id}
              run={run}
              open={openRun === run.id}
              onToggle={() => setOpenRun(openRun === run.id ? null : run.id)}
            />
          ))
        )}
      </div>
    </aside>
  );
}

function RunRow({
  run,
  open,
  onToggle,
}: {
  run: RunDto;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="mb-1.5 rounded-xl border border-hairline">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 text-ink-faint" />
        ) : (
          <ChevronRight className="h-4 w-4 text-ink-faint" />
        )}
        {STATUS_ICON[run.status]}
        <div className="flex flex-1 flex-col">
          <span className="text-[12px] font-medium text-ink">
            {run.mode} run
          </span>
          <span className="text-[10px] text-ink-faint">
            {formatDistanceToNow(new Date(run.createdAt), { addSuffix: true })} ·{" "}
            {run.nodeRuns.length} nodes
          </span>
        </div>
        <span
          className={cn(
            "rounded-pill px-2 py-0.5 text-[10px] font-semibold",
            run.status === "COMPLETED" && "bg-emerald-50 text-emerald-600",
            run.status === "FAILED" && "bg-red-50 text-red-600",
            run.status === "RUNNING" && "bg-amber-soft text-amber-ink",
            ["QUEUED", "CANCELLED"].includes(run.status) && "bg-ink/5 text-ink-muted",
          )}
        >
          {run.status}
        </span>
      </button>

      {open && (
        <div className="border-t border-hairline px-2 py-2">
          {run.error && (
            <p className="mb-2 rounded-md bg-red-50 px-2 py-1.5 text-[11px] text-red-600">
              {run.error}
            </p>
          )}
          {run.nodeRuns.map((nr) => (
            <NodeRunRow key={nr.id} nr={nr} />
          ))}
        </div>
      )}
    </div>
  );
}

function NodeRunRow({ nr }: { nr: NodeRunDto }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-1 rounded-lg bg-ink/[0.02]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-2 py-1.5 text-left"
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-ink-faint" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-ink-faint" />
        )}
        {STATUS_ICON[nr.status]}
        <span className="flex-1 truncate text-[12px] font-medium text-ink">
          {nr.label}
        </span>
        {nr.durationMs != null && (
          <span className="text-[10px] tabular-nums text-ink-faint">
            {(nr.durationMs / 1000).toFixed(1)}s
          </span>
        )}
      </button>
      {open && (
        <div className="space-y-2 px-3 pb-2 pt-1">
          {nr.error && (
            <p className="rounded-md bg-red-50 px-2 py-1 text-[11px] text-red-600">
              {nr.error}
            </p>
          )}
          <Detail title="Input" value={nr.input} />
          <Detail title="Output" value={nr.output} />
          {nr.logs?.length > 0 && (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
                Logs
              </p>
              <pre className="overflow-auto rounded-md bg-ink/90 p-2 font-mono text-[10px] leading-relaxed text-emerald-300">
                {nr.logs.join("\n")}
              </pre>
            </div>
          )}
          {nr.triggerRunId && (
            <p className="font-mono text-[10px] text-ink-faint">
              trigger: {nr.triggerRunId}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Detail({ title, value }: { title: string; value: unknown }) {
  if (value == null) return null;
  const text =
    typeof value === "string" ? value : JSON.stringify(value, null, 2);
  const display = text.length > 1200 ? text.slice(0, 1200) + "…" : text;
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
        {title}
      </p>
      <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-md border border-hairline bg-white p-2 font-mono text-[10px] leading-relaxed text-ink">
        {display}
      </pre>
    </div>
  );
}
