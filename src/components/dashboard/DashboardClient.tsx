"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  Plus,
  Sparkles,
  Workflow as WorkflowIcon,
  MoreVertical,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/client-api";
import { buildSampleGraph, SAMPLE_WORKFLOW_NAME } from "@/lib/sample-workflow";
import type { WorkflowSummary } from "@/types/flow";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-ink/5 text-ink-muted",
  READY: "bg-violet-50 text-violet-600",
  RUNNING: "bg-amber-soft text-amber-ink",
  COMPLETED: "bg-emerald-50 text-emerald-600",
  FAILED: "bg-red-50 text-red-600",
};

export function DashboardClient({ initial }: { initial: WorkflowSummary[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);

  async function createBlank() {
    setBusy("blank");
    try {
      const { id } = await api.createWorkflow({ name: "New Workflow" });
      router.push(`/workflow/${id}`);
    } finally {
      setBusy(null);
    }
  }

  async function createSample() {
    setBusy("sample");
    try {
      const { id } = await api.createWorkflow({
        name: SAMPLE_WORKFLOW_NAME,
        graph: buildSampleGraph(),
      });
      router.push(`/workflow/${id}`);
    } finally {
      setBusy(null);
    }
  }

  async function rename(item: WorkflowSummary) {
    const name = window.prompt("Rename workflow", item.name);
    if (!name || name === item.name) return;
    await api.updateWorkflow(item.id, { name });
    setItems((xs) => xs.map((x) => (x.id === item.id ? { ...x, name } : x)));
  }

  async function remove(item: WorkflowSummary) {
    if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    await api.deleteWorkflow(item.id);
    setItems((xs) => xs.filter((x) => x.id !== item.id));
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Your workflows
          </h1>
          <p className="mt-1 text-[14px] text-ink-muted">
            Build and run LLM workflows on a visual canvas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={createSample}
            disabled={busy !== null}
            className="flex h-10 items-center gap-2 rounded-xl border border-hairline bg-white px-4 text-[13px] font-semibold text-ink shadow-node hover:bg-ink/[0.03]"
          >
            {busy === "sample" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 text-violet-500" />
            )}
            Use sample
          </button>
          <button
            onClick={createBlank}
            disabled={busy !== null}
            className="flex h-10 items-center gap-2 rounded-xl bg-violet-500 px-4 text-[13px] font-semibold text-white shadow-pop hover:bg-violet-600"
          >
            {busy === "blank" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            New Workflow
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState onCreate={createBlank} onSample={createSample} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <WorkflowCard
              key={item.id}
              item={item}
              onOpen={() => router.push(`/workflow/${item.id}`)}
              onRename={() => rename(item)}
              onDelete={() => remove(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WorkflowCard({
  item,
  onOpen,
  onRename,
  onDelete,
}: {
  item: WorkflowSummary;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const [menu, setMenu] = useState(false);
  return (
    <div className="group relative flex flex-col rounded-2xl border border-hairline bg-white p-4 shadow-node transition-shadow hover:shadow-node-hover">
      <button onClick={onOpen} className="flex flex-1 flex-col text-left">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-500">
          <WorkflowIcon className="h-5 w-5" />
        </div>
        <h3 className="truncate text-[15px] font-semibold text-ink">
          {item.name}
        </h3>
        <p className="mt-0.5 text-[12px] text-ink-muted">
          Edited {formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}
        </p>
      </button>
      <div className="mt-4 flex items-center justify-between">
        <span
          className={cn(
            "rounded-pill px-2 py-0.5 text-[10px] font-semibold",
            STATUS_STYLE[item.status] ?? STATUS_STYLE.DRAFT,
          )}
        >
          {item.status}
        </span>
        <span className="text-[11px] text-ink-faint">{item.nodeCount} nodes</span>
      </div>

      <div className="absolute right-3 top-3">
        <button
          onClick={() => setMenu((o) => !o)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint opacity-0 transition-opacity hover:bg-ink/5 group-hover:opacity-100"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        {menu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
            <div className="absolute right-0 top-9 z-20 w-36 animate-fade-in rounded-lg border border-hairline bg-white p-1 shadow-pop">
              <button
                onClick={() => {
                  setMenu(false);
                  onRename();
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] text-ink hover:bg-ink/5"
              >
                <Pencil className="h-3.5 w-3.5" /> Rename
              </button>
              <button
                onClick={() => {
                  setMenu(false);
                  onDelete();
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function EmptyState({
  onCreate,
  onSample,
}: {
  onCreate: () => void;
  onSample: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-hairline bg-white py-20 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-500">
        <WorkflowIcon className="h-7 w-7" />
      </div>
      <h3 className="text-[16px] font-semibold text-ink">No workflows yet</h3>
      <p className="mt-1 max-w-sm text-[13px] text-ink-muted">
        Create your first workflow from scratch, or start with the pre-built
        product-marketing sample.
      </p>
      <div className="mt-5 flex items-center gap-2">
        <button
          onClick={onSample}
          className="flex h-10 items-center gap-2 rounded-xl border border-hairline bg-white px-4 text-[13px] font-semibold text-ink shadow-node hover:bg-ink/[0.03]"
        >
          <Sparkles className="h-4 w-4 text-violet-500" /> Use sample
        </button>
        <button
          onClick={onCreate}
          className="flex h-10 items-center gap-2 rounded-xl bg-violet-500 px-4 text-[13px] font-semibold text-white shadow-pop hover:bg-violet-600"
        >
          <Plus className="h-4 w-4" /> New Workflow
        </button>
      </div>
    </div>
  );
}
