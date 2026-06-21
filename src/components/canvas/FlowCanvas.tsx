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
import { Map as MapIcon, Minimize2 } from "lucide-react";
import { useWorkflowStore } from "@/store/workflow-store";
import { nodeTypes, edgeTypes } from "./registry";
import { CanvasToolbar } from "./CanvasToolbar";
import { AddStickyBar } from "./AddStickyBar";
import type { NodeKind } from "@/types/flow";

// Tuned for the dark minimap background — dark node accents are lightened so
// they stay visible against #1c1c22.
const MINIMAP_COLOR: Record<NodeKind, string> = {
  "request-inputs": "#71717a",
  "crop-image": "#0ea5e9",
  gemini: "#7c5cff",
  response: "#8b6dff",
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
  const autoLayout = useWorkflowStore((s) => s.autoLayout);

  const [selectMode, setSelectMode] = useState(false);
  const [showMinimap, setShowMinimap] = useState(false);
  const { screenToFlowPosition, fitView, zoomIn, zoomOut } = useReactFlow();

  const onSelectionChange = useCallback(
    (params: OnSelectionChangeParams) =>
      setSelected(params.nodes.map((n) => n.id)),
    [setSelected],
  );

  // Keyboard shortcuts (mirrors the toolbar tooltips).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;
      if (typing) return;

      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
      } else if (mod && key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && key === "y") {
        e.preventDefault();
        redo();
      } else if (mod) {
        return; // leave other modifier combos to the browser
      } else if (e.shiftKey && key === "a") {
        e.preventDefault();
        autoLayout();
      } else if (key === "f") {
        e.preventDefault();
        fitView({ padding: 0.3, duration: 200 });
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        zoomIn();
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        zoomOut();
      } else if (key === "s") {
        e.preventDefault();
        setSelectMode((m) => !m);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [deleteSelected, undo, redo, autoLayout, fitView, zoomIn, zoomOut]);

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
      <Background variant={BackgroundVariant.Dots} gap={22} size={1.8} color="#a8a8ba" />

      {/* Minimap collapses to a map-icon button. Expanded, it shows a dark
          minimap with a "hide minimap" control at its top-right corner. */}
      <Panel position="bottom-right">
        {showMinimap ? (
          <div className="relative">
            <MiniMap
              pannable
              zoomable
              nodeColor={(n) => MINIMAP_COLOR[n.type as NodeKind] ?? "#9a9aa7"}
              nodeStrokeColor="transparent"
              bgColor="#1c1c22"
              maskColor="rgba(0,0,0,0.4)"
              style={{ width: 208, height: 156, margin: 0 }}
              className="!static !m-0 overflow-hidden !rounded-xl !border-transparent"
            />
            <button
              onClick={() => setShowMinimap(false)}
              title="Hide minimap"
              className="absolute -right-2.5 -top-2.5 flex h-7 w-7 items-center justify-center rounded-lg border border-hairline bg-white text-ink-muted shadow-pop transition-colors hover:bg-ink/[0.03] hover:text-violet-600"
            >
              <Minimize2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowMinimap(true)}
            title="Show minimap"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-hairline bg-white/95 text-ink-muted shadow-pop backdrop-blur transition-colors hover:bg-ink/[0.03]"
          >
            <MapIcon className="h-4 w-4" />
          </button>
        )}
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
