"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  Panel,
  useReactFlow,
  type OnSelectionChangeParams,
} from "@xyflow/react";
import { Map as MapIcon } from "lucide-react";
import { useWorkflowStore } from "@/store/workflow-store";
import { nodeTypes, edgeTypes } from "./registry";
import { CanvasToolbar } from "./CanvasToolbar";
import { AddStickyBar } from "./AddStickyBar";
import { cn } from "@/lib/utils";
import type { NodeKind } from "@/types/flow";

const MINIMAP_COLOR: Record<NodeKind, string> = {
  "request-inputs": "#1a1a23",
  "crop-image": "#0ea5e9",
  gemini: "#7c5cff",
  response: "#6a45f0",
  sticky: "#f5a623",
};

export function FlowCanvas() {
  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);
  const onNodesChange = useWorkflowStore((s) => s.onNodesChange);
  const onEdgesChange = useWorkflowStore((s) => s.onEdgesChange);
  const onConnect = useWorkflowStore((s) => s.onConnect);
  const isValidConnection = useWorkflowStore((s) => s.isValidConnection);
  const setSelected = useWorkflowStore((s) => s.setSelected);
  const deleteSelected = useWorkflowStore((s) => s.deleteSelected);
  const pushHistory = useWorkflowStore((s) => s.pushHistory);
  const undo = useWorkflowStore((s) => s.undo);
  const redo = useWorkflowStore((s) => s.redo);
  const addNode = useWorkflowStore((s) => s.addNode);

  const [selectMode, setSelectMode] = useState(false);
  const [showMinimap, setShowMinimap] = useState(false);
  const { screenToFlowPosition } = useReactFlow();

  const onSelectionChange = useCallback(
    (params: OnSelectionChangeParams) =>
      setSelected(params.nodes.map((n) => n.id)),
    [setSelected],
  );

  // Keyboard: delete (undoable), undo/redo.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;
      if (typing) return;

      if ((e.key === "Delete" || e.key === "Backspace") && !typing) {
        e.preventDefault();
        deleteSelected();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [deleteSelected, undo, redo]);

  const handleAdd = useCallback(
    (kind: NodeKind) => {
      // Drop new nodes near the centre of the current viewport.
      const pos = screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });
      addNode(kind, { x: pos.x - 150, y: pos.y - 80 });
    },
    [addNode, screenToFlowPosition],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      isValidConnection={isValidConnection}
      onSelectionChange={onSelectionChange}
      onNodeDragStart={() => pushHistory()}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      defaultEdgeOptions={{ type: "data", animated: true }}
      deleteKeyCode={null}
      fitView
      fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
      minZoom={0.15}
      maxZoom={2}
      panOnDrag={!selectMode}
      selectionOnDrag={selectMode}
      proOptions={{ hideAttribution: true }}
      className="bg-canvas"
    >
      <Background variant={BackgroundVariant.Dots} gap={22} size={1.4} color="#d7d7e0" />

      {/* Minimap is collapsed by default into a map-icon toggle (matches the
          reference); clicking the button reveals the minimap above it. */}
      {showMinimap && (
        <MiniMap
          pannable
          zoomable
          nodeColor={(n) => MINIMAP_COLOR[n.type as NodeKind] ?? "#9a9aa7"}
          maskColor="rgba(247,247,250,0.7)"
          className="!bottom-16 !right-4"
        />
      )}
      <Panel position="bottom-right">
        <button
          onClick={() => setShowMinimap((v) => !v)}
          title={showMinimap ? "Hide minimap" : "Show minimap"}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg border border-hairline bg-white/95 shadow-pop backdrop-blur transition-colors hover:bg-ink/[0.03]",
            showMinimap ? "text-violet-600" : "text-ink-muted",
          )}
        >
          <MapIcon className="h-4 w-4" />
        </button>
      </Panel>

      <Panel position="bottom-left">
        <CanvasToolbar
          selectMode={selectMode}
          onToggleSelectMode={() => setSelectMode((s) => !s)}
        />
      </Panel>
      <Panel position="bottom-center">
        <AddStickyBar onAdd={handleAdd} />
      </Panel>
    </ReactFlow>
  );
}
