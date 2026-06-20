"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  ArrowLeft,
  Play,
  X,
  History as HistoryIcon,
  Download,
  Upload,
  Save,
  Loader2,
  ChevronDown,
  Calculator,
  Wallet,
} from "lucide-react";
import { useWorkflowStore } from "@/store/workflow-store";
import { useRunController } from "@/hooks/useRunController";
import { exportWorkflowJson, importWorkflowJson } from "@/lib/workflow-io";
import { formatCredits, shortId } from "@/lib/utils";
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
  const nodeCount = useWorkflowStore((s) => s.nodes.length);
  const selected = useWorkflowStore((s) => s.selectedNodeIds);
  const isRunning = useWorkflowStore((s) => s.isRunning);
  const currentRunId = useWorkflowStore((s) => s.currentRunId);
  const dirty = useWorkflowStore((s) => s.dirty);
  const loadGraph = useWorkflowStore((s) => s.loadGraph);

  const { run, save } = useRunController(workflowId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runMenu, setRunMenu] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleRun(mode: "full" | "single" | "multi") {
    setError(null);
    setRunMenu(false);
    try {
      await run(mode, mode === "full" ? [] : selected);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Run failed");
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await save();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleImport(file: File) {
    try {
      const { graph } = await importWorkflowJson(file);
      loadGraph(graph);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid workflow file");
    }
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-3">
      {/* Left cluster */}
      <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-hairline bg-white/90 px-2 py-1.5 shadow-node backdrop-blur">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-muted hover:bg-ink/5"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="h-5 w-px bg-hairline" />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-52 bg-transparent px-1 text-[15px] font-semibold text-ink outline-none"
        />
        <span className="rounded-pill bg-ink/5 px-2 py-0.5 text-[11px] font-medium text-ink-muted">
          {nodeCount}
        </span>
      </div>

      {/* Center: live run indicator */}
      {isRunning && currentRunId && (
        <div className="pointer-events-auto mt-1 flex items-center gap-2 rounded-pill border border-violet-200 bg-violet-50 px-3 py-1.5 text-[12px] font-medium text-violet-700 shadow-node">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Viewing live run {shortId(currentRunId, 8)}
        </div>
      )}

      {/* Right cluster */}
      <div className="pointer-events-auto flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-2xl border border-hairline bg-white/90 px-2.5 py-1.5 shadow-node backdrop-blur">
          <span className="flex items-center gap-1 text-[12px] text-ink-muted">
            <Calculator className="h-3.5 w-3.5" /> Est{" "}
            <span className="font-semibold text-ink">{formatCredits(0.01)}</span>
          </span>
          <div className="h-4 w-px bg-hairline" />
          <span className="flex items-center gap-1 text-[12px] text-ink-muted">
            <Wallet className="h-3.5 w-3.5" /> Bal{" "}
            <span className="font-semibold text-ink">{formatCredits(30.33)}</span>
          </span>
        </div>

        <div className="flex items-center gap-1 rounded-2xl border border-hairline bg-white/90 px-1.5 py-1.5 shadow-node backdrop-blur">
          <button
            onClick={handleSave}
            disabled={saving}
            title="Save"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-muted hover:bg-ink/5"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className={cn("h-4 w-4", dirty && "text-violet-600")} />
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImport(f);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            title="Import JSON"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-muted hover:bg-ink/5"
          >
            <Upload className="h-4 w-4" />
          </button>
          <button
            onClick={() =>
              exportWorkflowJson(name, useWorkflowStore.getState().toGraph())
            }
            title="Export JSON"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-muted hover:bg-ink/5"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            onClick={onToggleHistory}
            title="Run history"
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl hover:bg-ink/5",
              historyOpen ? "text-violet-600" : "text-ink-muted",
            )}
          >
            <HistoryIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Run / Cancel */}
        <div className="relative">
          {isRunning ? (
            <button
              className="flex h-11 items-center gap-2 rounded-2xl bg-red-500 px-4 text-[13px] font-semibold text-white shadow-pop hover:bg-red-600"
              onClick={() => {
                // The local executor can't be cancelled mid-flight; clear UI state.
                useWorkflowStore.getState().setRunning(false, null);
                useWorkflowStore.getState().resetRunStates();
              }}
            >
              <X className="h-4 w-4" /> Cancel
            </button>
          ) : (
            <div className="flex items-stretch overflow-hidden rounded-2xl bg-violet-500 shadow-pop">
              <button
                onClick={() => handleRun("full")}
                className="flex items-center gap-2 px-4 text-[13px] font-semibold text-white hover:bg-violet-600"
              >
                <Play className="h-4 w-4" /> Run
              </button>
              <button
                onClick={() => setRunMenu((o) => !o)}
                className="flex items-center border-l border-white/20 px-2 text-white hover:bg-violet-600"
                aria-label="Run options"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          )}
          {runMenu && !isRunning && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setRunMenu(false)} />
              <div className="absolute right-0 top-12 z-20 w-56 animate-fade-in rounded-xl border border-hairline bg-white p-1 shadow-pop">
                <RunOption label="Run entire workflow" desc="All nodes" onClick={() => handleRun("full")} />
                <RunOption
                  label="Run selected node"
                  desc={selected.length === 1 ? "1 node" : "Select exactly 1"}
                  disabled={selected.length !== 1}
                  onClick={() => handleRun("single")}
                />
                <RunOption
                  label="Run selected nodes"
                  desc={`${selected.length} selected`}
                  disabled={selected.length < 1}
                  onClick={() => handleRun("multi")}
                />
              </div>
            </>
          )}
        </div>

        <div className="flex h-11 items-center rounded-2xl border border-hairline bg-white/90 px-1.5 shadow-node backdrop-blur">
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </div>

      {error && (
        <div className="pointer-events-auto absolute left-1/2 top-16 -translate-x-1/2 rounded-lg bg-red-500 px-3 py-1.5 text-[12px] font-medium text-white shadow-pop">
          {error}
        </div>
      )}
    </div>
  );
}

function RunOption({
  label,
  desc,
  disabled,
  onClick,
}: {
  label: string;
  desc: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full flex-col rounded-lg px-2.5 py-1.5 text-left hover:bg-violet-50",
        disabled && "cursor-not-allowed opacity-40 hover:bg-transparent",
      )}
    >
      <span className="text-[13px] font-medium text-ink">{label}</span>
      <span className="text-[11px] text-ink-muted">{desc}</span>
    </button>
  );
}
