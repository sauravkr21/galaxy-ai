"use client";

import { create } from "zustand";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import { nanoid } from "nanoid";
import {
  NodeData,
  NodeKind,
  NodeRunState,
  RequestField,
  RequestFieldType,
  RequestInputsData,
  WorkflowGraph,
} from "@/types/flow";
import {
  canConnect,
  defaultData,
  getPort,
  NODE_SPECS,
  requestFieldPortType,
} from "@/lib/nodes";
import { incomingMap, topoSort } from "@/lib/dag";

export type AppNode = Node<NodeData, NodeKind>;
export type AppEdge = Edge;

interface Snapshot {
  nodes: AppNode[];
  edges: AppEdge[];
}

interface WorkflowState {
  workflowId: string | null;
  name: string;
  nodes: AppNode[];
  edges: AppEdge[];
  selectedNodeIds: string[];
  dirty: boolean;

  // undo/redo
  past: Snapshot[];
  future: Snapshot[];

  // run lifecycle
  isRunning: boolean;
  currentRunId: string | null;
  /** Trigger.dev orchestrator run id + scoped public token, set when a run is
   *  dispatched so the canvas can subscribe to it via Trigger Realtime. */
  realtimeRunId: string | null;
  realtimeToken: string | null;
  /** Bumped whenever a run finishes so the history panel refetches. */
  historyVersion: number;
  /** Registered by the editor so nodes can trigger their own (single) run. */
  runFn: ((mode: "full" | "single" | "multi", nodeIds: string[]) => void) | null;

  // ── actions ──
  init: (workflowId: string, name: string, graph: WorkflowGraph) => void;
  setName: (name: string) => void;
  onNodesChange: (changes: NodeChange<AppNode>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (conn: Connection) => void;
  isValidConnection: (conn: Connection | Edge) => boolean;
  /** Create a matching field on the Request-Inputs node and wire it to the
   *  given target input handle (the node "Add to request" buttons). */
  addRequestInput: (
    targetNodeId: string,
    targetHandle: string,
    fieldType: RequestFieldType,
  ) => void;
  addNode: (kind: NodeKind, position: { x: number; y: number }) => void;
  updateNodeData: (id: string, patch: Partial<NodeData>) => void;
  deleteNode: (id: string) => void;
  deleteSelected: () => void;
  duplicateNode: (id: string, withEdges: boolean) => void;
  toggleLock: (id: string) => void;
  clearNodeOutput: (id: string) => void;
  setSelected: (ids: string[]) => void;

  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  autoLayout: () => void;

  setNodeRunState: (id: string, runState: NodeRunState) => void;
  setManyRunState: (ids: string[], runState: NodeRunState) => void;
  resetRunStates: () => void;
  applyNodeOutput: (id: string, patch: Partial<NodeData>) => void;

  setRunning: (running: boolean, runId?: string | null) => void;
  setRealtime: (runId: string | null, token: string | null) => void;
  bumpHistory: () => void;
  setRunFn: (
    fn: ((mode: "full" | "single" | "multi", nodeIds: string[]) => void) | null,
  ) => void;
  markClean: () => void;
  toGraph: () => WorkflowGraph;
  loadGraph: (graph: WorkflowGraph) => void;
}

const clone = (s: Snapshot): Snapshot => ({
  nodes: structuredClone(s.nodes),
  edges: structuredClone(s.edges),
});

/** Ensure every edge renders as an animated, type-coloured DataEdge. */
function normalizeEdges(edges: AppEdge[]): AppEdge[] {
  return edges.map((e) => ({ ...e, type: "data", animated: true }));
}

/** Migrate legacy Request-Inputs data (fixed textField/imageUrl) to the
 *  dynamic `fields` shape so older workflows keep working. */
function migrateNodes(nodes: AppNode[]): AppNode[] {
  return nodes.map((n) => {
    if (n.type !== "request-inputs") return n;
    const d = n.data as Record<string, unknown>;
    if (Array.isArray(d.fields) && d.fields.length > 0) return n;
    return {
      ...n,
      data: {
        label: (d.label as string) ?? "Request-Inputs",
        fields: [
          { id: "text_field", name: "text_field", type: "text", value: (d.textField as string) ?? "" },
          { id: "image_field", name: "image_field", type: "image", value: (d.imageUrl as string) ?? null },
        ],
        runState: (d.runState as NodeRunState) ?? "idle",
      } as unknown as NodeData,
    };
  });
}

const PROTECTED_KINDS: NodeKind[] = ["request-inputs", "response"];

const HISTORY_LIMIT = 50;

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflowId: null,
  name: "New Workflow",
  nodes: [],
  edges: [],
  selectedNodeIds: [],
  dirty: false,
  past: [],
  future: [],
  isRunning: false,
  currentRunId: null,
  realtimeRunId: null,
  realtimeToken: null,
  historyVersion: 0,
  runFn: null,

  init: (workflowId, name, graph) =>
    set({
      workflowId,
      name,
      nodes: migrateNodes(graph.nodes as unknown as AppNode[]),
      edges: normalizeEdges(graph.edges as unknown as AppEdge[]),
      past: [],
      future: [],
      dirty: false,
      selectedNodeIds: [],
      isRunning: false,
      currentRunId: null,
      realtimeRunId: null,
      realtimeToken: null,
    }),

  setName: (name) => set({ name, dirty: true }),

  onNodesChange: (changes) =>
    set((s) => ({
      nodes: applyNodeChanges(changes, s.nodes),
      // Position/dimension churn during drag shouldn't flag a meaningful save,
      // but selection + removal should keep the doc in sync.
      dirty: s.dirty || changes.some((c) => c.type !== "select"),
    })),

  onEdgesChange: (changes) =>
    set((s) => ({
      edges: applyEdgeChanges(changes, s.edges),
      dirty: s.dirty || changes.some((c) => c.type !== "select"),
    })),

  isValidConnection: (conn) => {
    const { source, target, sourceHandle, targetHandle } = conn;
    if (!source || !target) return false;
    if (source === target) return false; // no self loops
    const nodes = get().nodes;
    const sNode = nodes.find((n) => n.id === source);
    const tNode = nodes.find((n) => n.id === target);
    if (!sNode || !tNode) return false;
    // Request-Inputs outputs are dynamic (per field), so derive their type
    // from the node's fields rather than the static NODE_SPECS.
    const sType =
      sNode.type === "request-inputs"
        ? requestFieldPortType(sNode.data as RequestInputsData, sourceHandle ?? "")
        : getPort(sNode.type as NodeKind, sourceHandle ?? "", "source")?.type;
    const tPort = getPort(tNode.type as NodeKind, targetHandle ?? "", "target");
    if (!sType || !tPort) return false;
    return canConnect(sType, tPort.type);
  },

  onConnect: (conn) => {
    if (!get().isValidConnection(conn)) return;
    get().pushHistory();
    set((s) => ({
      edges: addEdge(
        {
          ...conn,
          id: `e-${nanoid(8)}`,
          type: "data",
        },
        s.edges,
      ),
      dirty: true,
    }));
  },

  addRequestInput: (targetNodeId, targetHandle, fieldType) => {
    const { nodes, edges } = get();
    const reqNode = nodes.find((n) => n.type === "request-inputs");
    if (!reqNode) return;
    // Already wired — nothing to do.
    if (
      edges.some(
        (e) => e.target === targetNodeId && e.targetHandle === targetHandle,
      )
    )
      return;

    get().pushHistory();
    const reqData = reqNode.data as RequestInputsData;
    const fields = reqData.fields ?? [];
    const base = `${fieldType}_field`;
    const count = fields.filter((f) => f.name.startsWith(base)).length;
    const name = count === 0 ? base : `${base}_${count + 1}`;
    const field: RequestField = {
      id: `f_${nanoid(6)}`,
      name,
      type: fieldType,
      value:
        fieldType === "boolean"
          ? "false"
          : fieldType === "text" || fieldType === "number"
            ? ""
            : null,
    };
    const edge: AppEdge = {
      id: `e-${nanoid(8)}`,
      source: reqNode.id,
      sourceHandle: field.id,
      target: targetNodeId,
      targetHandle,
      type: "data",
      animated: true,
    };
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === reqNode.id
          ? { ...n, data: { ...n.data, fields: [...fields, field] } }
          : n,
      ),
      edges: [...s.edges, edge],
      dirty: true,
    }));
  },

  addNode: (kind, position) => {
    get().pushHistory();
    const id = `${kind}-${nanoid(6)}`;
    const node: AppNode = {
      id,
      type: kind,
      position,
      data: defaultData(kind),
    };
    set((s) => ({ nodes: [...s.nodes, node], dirty: true }));
  },

  updateNodeData: (id, patch) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...patch } as NodeData } : n,
      ),
      dirty: true,
    })),

  deleteNode: (id) => {
    const node = get().nodes.find((n) => n.id === id);
    // Pre-placed Request-Inputs / Response cannot be deleted.
    if (node && PROTECTED_KINDS.includes(node.type as NodeKind)) return;
    get().pushHistory();
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
      dirty: true,
    }));
  },

  deleteSelected: () => {
    const nodes = get().nodes;
    const ids = new Set(
      get().selectedNodeIds.filter((id) => {
        const n = nodes.find((x) => x.id === id);
        return n && !PROTECTED_KINDS.includes(n.type as NodeKind);
      }),
    );
    if (!ids.size) return;
    get().pushHistory();
    set((s) => ({
      nodes: s.nodes.filter((n) => !ids.has(n.id)),
      edges: s.edges.filter((e) => !ids.has(e.source) && !ids.has(e.target)),
      selectedNodeIds: [],
      dirty: true,
    }));
  },

  duplicateNode: (id, withEdges) => {
    const node = get().nodes.find((n) => n.id === id);
    if (!node || PROTECTED_KINDS.includes(node.type as NodeKind)) return;
    get().pushHistory();
    const newId = `${node.type}-${nanoid(6)}`;
    const clone: AppNode = {
      ...node,
      id: newId,
      position: { x: node.position.x + 48, y: node.position.y + 48 },
      data: structuredClone(node.data),
      selected: false,
    };
    const extraEdges: AppEdge[] = withEdges
      ? get()
          .edges.filter((e) => e.source === id || e.target === id)
          .map((e) => ({
            ...e,
            id: `e-${nanoid(8)}`,
            source: e.source === id ? newId : e.source,
            target: e.target === id ? newId : e.target,
          }))
      : [];
    set((s) => ({
      nodes: [...s.nodes, clone],
      edges: normalizeEdges([...s.edges, ...extraEdges]),
      dirty: true,
    }));
  },

  toggleLock: (id) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, draggable: n.draggable === false ? true : false } : n,
      ),
      dirty: true,
    })),

  clearNodeOutput: (id) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id
          ? {
              ...n,
              data: {
                ...n.data,
                runState: "idle",
                ...(n.type === "gemini" ? { response: null } : {}),
                ...(n.type === "crop-image" ? { outputUrl: null } : {}),
                ...(n.type === "response" ? { result: null } : {}),
              } as NodeData,
            }
          : n,
      ),
      dirty: true,
    })),

  setSelected: (ids) => set({ selectedNodeIds: ids }),

  pushHistory: () =>
    set((s) => ({
      past: [...s.past, clone({ nodes: s.nodes, edges: s.edges })].slice(
        -HISTORY_LIMIT,
      ),
      future: [],
    })),

  undo: () =>
    set((s) => {
      if (!s.past.length) return s;
      const previous = s.past[s.past.length - 1];
      return {
        nodes: previous.nodes,
        edges: previous.edges,
        past: s.past.slice(0, -1),
        future: [clone({ nodes: s.nodes, edges: s.edges }), ...s.future].slice(
          0,
          HISTORY_LIMIT,
        ),
        dirty: true,
      };
    }),

  redo: () =>
    set((s) => {
      if (!s.future.length) return s;
      const next = s.future[0];
      return {
        nodes: next.nodes,
        edges: next.edges,
        future: s.future.slice(1),
        past: [...s.past, clone({ nodes: s.nodes, edges: s.edges })].slice(
          -HISTORY_LIMIT,
        ),
        dirty: true,
      };
    }),

  autoLayout: () => {
    const { nodes, edges } = get();
    const graph = {
      nodes: nodes.map((n) => ({ id: n.id, type: n.type as NodeKind, position: n.position, data: n.data })),
      edges: edges.map((e) => ({ id: e.id, source: e.source, sourceHandle: e.sourceHandle ?? "", target: e.target, targetHandle: e.targetHandle ?? "" })),
    };
    const order = topoSort(graph);
    if (!order) return; // cycle — skip tidy
    const level = new Map<string, number>();
    const incoming = incomingMap(graph);
    for (const id of order) {
      const preds = incoming.get(id) ?? [];
      const max = preds.reduce((m, p) => Math.max(m, (level.get(p.nodeId) ?? 0) + 1), 0);
      level.set(id, max);
    }
    const byLevel = new Map<number, string[]>();
    for (const n of nodes) {
      if (n.type === "sticky") continue;
      const l = level.get(n.id) ?? 0;
      (byLevel.get(l) ?? byLevel.set(l, []).get(l)!).push(n.id);
    }
    const pos = new Map<string, { x: number; y: number }>();
    for (const [l, ids] of byLevel) {
      ids.forEach((id, i) => pos.set(id, { x: l * 400, y: i * 260 }));
    }
    get().pushHistory();
    set((s) => ({
      nodes: s.nodes.map((n) =>
        pos.has(n.id) ? { ...n, position: pos.get(n.id)! } : n,
      ),
      dirty: true,
    }));
  },

  setNodeRunState: (id, runState) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, runState } as NodeData } : n,
      ),
    })),

  setManyRunState: (ids, runState) => {
    const set_ = new Set(ids);
    set((s) => ({
      nodes: s.nodes.map((n) =>
        set_.has(n.id)
          ? { ...n, data: { ...n.data, runState } as NodeData }
          : n,
      ),
    }));
  },

  resetRunStates: () =>
    set((s) => ({
      nodes: s.nodes.map((n) => ({
        ...n,
        data: { ...n.data, runState: "idle" } as NodeData,
      })),
    })),

  applyNodeOutput: (id, patch) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...patch } as NodeData } : n,
      ),
    })),

  setRunning: (running, runId) =>
    set({ isRunning: running, currentRunId: runId ?? null }),

  setRealtime: (runId, token) =>
    set({ realtimeRunId: runId, realtimeToken: token }),

  bumpHistory: () => set((s) => ({ historyVersion: s.historyVersion + 1 })),

  setRunFn: (fn) => set({ runFn: fn }),

  markClean: () => set({ dirty: false }),

  toGraph: () => {
    const { nodes, edges } = get();
    return {
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type as NodeKind,
        position: n.position,
        data: n.data,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        sourceHandle: e.sourceHandle ?? "",
        target: e.target,
        targetHandle: e.targetHandle ?? "",
      })),
    };
  },

  loadGraph: (graph) => {
    get().pushHistory();
    set({
      nodes: migrateNodes(graph.nodes as unknown as AppNode[]),
      edges: normalizeEdges(graph.edges as unknown as AppEdge[]),
      dirty: true,
    });
  },
}));

/** Which target handles on a node currently have an incoming edge (for the
 *  connected → greyed-out field state). */
export function connectedTargetHandles(
  edges: AppEdge[],
  nodeId: string,
): Set<string> {
  const set = new Set<string>();
  for (const e of edges) {
    if (e.target === nodeId && e.targetHandle) set.add(e.targetHandle);
  }
  return set;
}

export { NODE_SPECS };
