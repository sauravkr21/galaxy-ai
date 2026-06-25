"use client";

import { useEffect, useRef } from "react";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import { useWorkflowStore } from "@/store/workflow-store";
import type { NodeRunState } from "@/types/flow";

const BASE_URL = process.env.NEXT_PUBLIC_TRIGGER_API_URL;

/** Trigger.dev terminal run statuses. */
const TERMINAL = new Set([
  "COMPLETED",
  "FAILED",
  "CANCELED",
  "CRASHED",
  "SYSTEM_FAILURE",
  "INTERRUPTED",
  "TIMED_OUT",
  "EXPIRED",
]);

/**
 * Subscribes to the active Trigger.dev orchestrator run via Trigger Realtime
 * (`useRealtimeRun`) and translates server-pushed events into store updates:
 *
 *  - `run.metadata.nodes` → per-node glow (queued / running / completed / failed)
 *  - run completion        → one-shot output refresh + history refresh
 *
 * This is what replaces the old `setInterval` polling of `/api/runs/:id`.
 * Renders nothing; it is a pure event→store bridge mounted inside the editor.
 */
export function RealtimeRunBridge({
  refreshOutputs,
}: {
  refreshOutputs: () => Promise<void>;
}) {
  const realtimeRunId = useWorkflowStore((s) => s.realtimeRunId);
  const realtimeToken = useWorkflowStore((s) => s.realtimeToken);
  const finishedRef = useRef<string | null>(null);

  const { run } = useRealtimeRun(realtimeRunId ?? undefined, {
    accessToken: realtimeToken ?? undefined,
    enabled: !!realtimeRunId && !!realtimeToken,
    baseURL: BASE_URL,
  });

  // Per-node glow + live history, driven by streamed metadata.
  const nodes = run?.metadata?.nodes as
    | Record<string, NodeRunState>
    | undefined;
  useEffect(() => {
    if (!nodes) return;
    const st = useWorkflowStore.getState();
    for (const [nodeId, state] of Object.entries(nodes)) {
      st.setNodeRunState(nodeId, state);
    }
    // Each metadata push reflects a real node-status change → refresh the
    // history panel (event-driven, no interval).
    st.bumpHistory();
  }, [nodes]);

  // Run completion → refresh outputs once and settle the run lifecycle.
  const status = run?.status;
  useEffect(() => {
    if (!realtimeRunId || !status || !TERMINAL.has(status)) return;
    if (finishedRef.current === realtimeRunId) return;
    finishedRef.current = realtimeRunId;

    (async () => {
      try {
        await refreshOutputs();
      } finally {
        const st = useWorkflowStore.getState();
        st.setRunning(false, null);
        st.bumpHistory();
        st.setRealtime(null, null); // unsubscribe
      }
    })();
  }, [status, realtimeRunId, refreshOutputs]);

  return null;
}
