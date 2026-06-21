"use client";

import { useEffect, useRef, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { useWorkflowStore } from "@/store/workflow-store";
import { useRunController } from "@/hooks/useRunController";
import { api } from "@/lib/client-api";
import { FlowCanvas } from "./FlowCanvas";
import { Topbar } from "./Topbar";
import { HistoryPanel } from "@/components/history/HistoryPanel";
import type { WorkflowGraph } from "@/types/flow";

export function WorkflowEditor({
  workflowId,
  name,
  graph,
}: {
  workflowId: string;
  name: string;
  graph: WorkflowGraph;
}) {
  const init = useWorkflowStore((s) => s.init);
  const dirty = useWorkflowStore((s) => s.dirty);
  const markClean = useWorkflowStore((s) => s.markClean);
  const setRunFn = useWorkflowStore((s) => s.setRunFn);
  const [historyOpen, setHistoryOpen] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { run } = useRunController(workflowId);

  // Load the workflow into the store once on mount.
  useEffect(() => {
    init(workflowId, name, graph);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId]);

  // Expose run() to node-level "Run" buttons, and open history on run.
  useEffect(() => {
    setRunFn((mode, ids) => {
      setHistoryOpen(true);
      run(mode, ids).catch(() => {});
    });
    return () => setRunFn(null);
  }, [run, setRunFn]);

  // Debounced autosave whenever the document is dirty.
  useEffect(() => {
    if (!dirty) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const s = useWorkflowStore.getState();
      try {
        await api.updateWorkflow(workflowId, { name: s.name, graph: s.toGraph() });
        markClean();
      } catch {
        /* will retry on next change */
      }
    }, 1500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [dirty, workflowId, markClean]);

  return (
    <ReactFlowProvider>
      <div className="relative flex h-screen w-screen overflow-hidden">
        <div className="relative flex-1">
          <Topbar
            workflowId={workflowId}
            onToggleHistory={() => setHistoryOpen((o) => !o)}
            historyOpen={historyOpen}
          />
          <FlowCanvas />
        </div>
        {historyOpen && (
          <HistoryPanel
            workflowId={workflowId}
            onClose={() => setHistoryOpen(false)}
          />
        )}
      </div>
    </ReactFlowProvider>
  );
}
