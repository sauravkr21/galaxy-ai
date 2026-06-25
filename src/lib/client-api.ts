"use client";

import type { WorkflowGraph, WorkflowSummary } from "@/types/flow";

async function jsonOrThrow(res: Response) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export const api = {
  listWorkflows: (): Promise<WorkflowSummary[]> =>
    fetch("/api/workflows").then(jsonOrThrow),

  createWorkflow: (body?: { name?: string; graph?: WorkflowGraph }): Promise<{ id: string }> =>
    fetch("/api/workflows", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body ?? {}),
    }).then(jsonOrThrow),

  getWorkflow: (
    id: string,
  ): Promise<{ id: string; name: string; status: string; graph: WorkflowGraph }> =>
    fetch(`/api/workflows/${id}`).then(jsonOrThrow),

  updateWorkflow: (
    id: string,
    body: { name?: string; status?: string; graph?: WorkflowGraph; thumbnailUrl?: string | null },
  ) =>
    fetch(`/api/workflows/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).then(jsonOrThrow),

  deleteWorkflow: (id: string) =>
    fetch(`/api/workflows/${id}`, { method: "DELETE" }).then(jsonOrThrow),

  startRun: (
    id: string,
    body: { mode: "full" | "single" | "multi"; targetNodeIds: string[]; graph: WorkflowGraph },
  ): Promise<{
    runId: string;
    mode: string;
    // Present only on the Trigger.dev path — used to subscribe via Realtime.
    triggerRunId?: string;
    publicAccessToken?: string;
  }> =>
    fetch(`/api/workflows/${id}/runs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).then(jsonOrThrow),

  getRun: (runId: string) => fetch(`/api/runs/${runId}`).then(jsonOrThrow),

  listRuns: (id: string) => fetch(`/api/workflows/${id}/runs`).then(jsonOrThrow),
};
