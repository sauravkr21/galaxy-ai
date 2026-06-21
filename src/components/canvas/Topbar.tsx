"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calculator,
  Clock3,
  Loader2,
  Pencil,
  Play,
  WalletCards,
} from "lucide-react";
import { useWorkflowStore } from "@/store/workflow-store";
import { useRunController } from "@/hooks/useRunController";
import { cn } from "@/lib/utils";

export function Topbar({
  workflowId,
  onToggleHistory,
  historyOpen,
}: {
  workflowId: string;
  onToggleHistory: () => void;
  historyOpen: boolean;
}) {
  const router = useRouter();
  const name = useWorkflowStore((s) => s.name);
  const setName = useWorkflowStore((s) => s.setName);
  const isRunning = useWorkflowStore((s) => s.isRunning);
  const { run } = useRunController(workflowId);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    setError(null);
    try {
      await run("full", []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Run failed");
    }
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between px-3 py-4">
      <div className="pointer-events-auto flex h-11 items-center rounded-2xl border border-hairline bg-white px-1.5 shadow-node">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-hairline text-ink-muted transition-colors hover:bg-ink/[0.04]"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Workflow name"
          className="ml-2 min-w-0 w-[150px] bg-transparent text-[13px] font-medium text-ink outline-none"
        />
        <Pencil className="mr-1 h-3 w-3 shrink-0 text-ink-faint" />
      </div>

      <div className="pointer-events-auto flex items-center gap-2">
        <Metric icon={<Calculator className="h-3.5 w-3.5" />} label="Est" value="1.72 M" />
        <Metric icon={<WalletCards className="h-3.5 w-3.5" />} label="Bal" value="0.00 M" />

        <button
          onClick={handleRun}
          disabled={isRunning}
          title={isRunning ? "Workflow is running" : "Run workflow"}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500 text-white shadow-node transition-colors hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isRunning ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4 fill-current" />
          )}
        </button>

        <button
          onClick={onToggleHistory}
          title="Run history"
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg border border-hairline bg-white shadow-node transition-colors hover:bg-ink/[0.03]",
            historyOpen ? "text-indigo-600" : "text-ink-muted",
          )}
        >
          <Clock3 className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <div className="pointer-events-auto absolute left-1/2 top-16 -translate-x-1/2 rounded-lg bg-red-500 px-3 py-1.5 text-[12px] font-medium text-white shadow-pop">
          {error}
        </div>
      )}
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex h-8 items-center gap-1.5 rounded-lg border border-hairline bg-white px-2.5 text-[11px] text-ink-muted shadow-node">
      {icon}
      <span>{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  );
}
