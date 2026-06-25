"use client";

import { useCallback } from "react";
import { useWorkflowStore } from "@/store/workflow-store";
import { api } from "@/lib/client-api";
import { validateGraph } from "@/lib/dag";
import type { WorkflowGraph } from "@/types/flow";

type RunMode = "full" | "single" | "multi";

export function useRunController(workflowId: string) {
  const store = useWorkflowStore;

  /** Persist the current canvas to the backend. */
  const save = useCallback(async () => {
    const s = store.getState();
    await api.updateWorkflow(workflowId, { name: s.name, graph: s.toGraph() });
    s.markClean();
  }, [store, workflowId]);

  /** Pull the persisted graph and merge node outputs back onto the canvas.
   *  Called once when a run completes (driven by the Realtime subscription,
   *  not by polling). */
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

      const { runId, triggerRunId, publicAccessToken } = await api.startRun(
        workflowId,
        { mode, targetNodeIds, graph },
      );
      s.setRunning(true, runId);

      // Hand the Trigger.dev run id + scoped token to the store. The
      // RealtimeRunBridge subscribes to it and drives per-node glow, output
      // refresh, and history updates entirely from server-pushed events.
      if (triggerRunId && publicAccessToken) {
        s.setRealtime(triggerRunId, publicAccessToken);
      } else {
        // No Trigger.dev run (local dev fallback): nothing to subscribe to, so
        // surface whatever the in-process run persisted once it settles.
        s.setRealtime(null, null);
      }
    },
    [store, workflowId],
  );

  return { run, save, refreshOutputs };
}
