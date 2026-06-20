"use client";

import { useCallback, useRef } from "react";
import { useWorkflowStore } from "@/store/workflow-store";
import { api } from "@/lib/client-api";
import { validateGraph } from "@/lib/dag";
import type { NodeRunState, WorkflowGraph } from "@/types/flow";

type RunMode = "full" | "single" | "multi";

const STATUS_TO_STATE: Record<string, NodeRunState> = {
  PENDING: "queued",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
  SKIPPED: "idle",
};

interface NodeRunDto {
  nodeId: string;
  status: string;
}
interface RunDto {
  id: string;
  status: string;
  nodeRuns: NodeRunDto[];
}

export function useRunController(workflowId: string) {
  const store = useWorkflowStore;
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  /** Persist the current canvas to the backend. */
  const save = useCallback(async () => {
    const s = store.getState();
    await api.updateWorkflow(workflowId, { name: s.name, graph: s.toGraph() });
    s.markClean();
  }, [store, workflowId]);

  /** Pull the persisted graph and merge node outputs back onto the canvas. */
  const refreshOutputs = useCallback(async () => {
    const { graph } = await api.getWorkflow(workflowId);
    const s = store.getState();
    for (const node of graph.nodes) {
      const d = node.data as Record<string, unknown>;
      const patch: Record<string, unknown> = {};
      if ("response" in d) patch.response = d.response;
      if ("outputUrl" in d) patch.outputUrl = d.outputUrl;
      if ("result" in d) patch.result = d.result;
      if ("imageUrl" in d) patch.imageUrl = d.imageUrl;
      if (Object.keys(patch).length) s.applyNodeOutput(node.id, patch);
    }
  }, [store, workflowId]);

  const run = useCallback(
    async (mode: RunMode, targetNodeIds: string[] = []) => {
      const s = store.getState();
      const graph: WorkflowGraph = s.toGraph();

      const validation = validateGraph(graph);
      if (!validation.valid) {
        throw new Error(validation.errors.join(" "));
      }

      // Persist first so the run snapshot matches the canvas.
      await api.updateWorkflow(workflowId, { name: s.name, graph });
      s.markClean();

      // Immediate optimistic glow on targeted nodes.
      s.resetRunStates();
      const targets =
        mode === "full" ? graph.nodes.map((n) => n.id) : targetNodeIds;
      s.setManyRunState(targets, "queued");

      const { runId } = await api.startRun(workflowId, {
        mode,
        targetNodeIds,
        graph,
      });
      s.setRunning(true, runId);

      // Poll for per-node status to animate the glow in near real-time.
      stopPolling();
      pollRef.current = setInterval(async () => {
        try {
          const runDto: RunDto = await api.getRun(runId);
          for (const nr of runDto.nodeRuns) {
            const state = STATUS_TO_STATE[nr.status] ?? "idle";
            store.getState().setNodeRunState(nr.nodeId, state);
          }
          if (["COMPLETED", "FAILED", "CANCELLED"].includes(runDto.status)) {
            stopPolling();
            await refreshOutputs();
            const st = store.getState();
            st.setRunning(false, null);
            st.bumpHistory();
          }
        } catch {
          // transient — keep polling
        }
      }, 700);
    },
    [store, workflowId, stopPolling, refreshOutputs],
  );

  return { run, save, stopPolling };
}
