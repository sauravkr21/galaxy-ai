import { WorkflowGraph } from "@/types/flow";

export interface Predecessor {
  nodeId: string;
  sourceHandle: string;
  targetHandle: string;
}

/** Direct upstream edges feeding each node, keyed by node id. */
export function incomingMap(graph: WorkflowGraph): Map<string, Predecessor[]> {
  const map = new Map<string, Predecessor[]>();
  for (const n of graph.nodes) map.set(n.id, []);
  for (const e of graph.edges) {
    const list = map.get(e.target) ?? [];
    list.push({
      nodeId: e.source,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    });
    map.set(e.target, list);
  }
  return map;
}

/** Direct downstream node ids for each node. */
export function outgoingMap(graph: WorkflowGraph): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const n of graph.nodes) map.set(n.id, []);
  for (const e of graph.edges) {
    const list = map.get(e.source) ?? [];
    list.push(e.target);
    map.set(e.source, list);
  }
  return map;
}

/**
 * Kahn topological sort. Returns the node ids in execution order, or null if
 * the graph contains a cycle.
 */
export function topoSort(graph: WorkflowGraph): string[] | null {
  const indegree = new Map<string, number>();
  for (const n of graph.nodes) indegree.set(n.id, 0);
  for (const e of graph.edges) {
    indegree.set(e.target, (indegree.get(e.target) ?? 0) + 1);
  }
  const out = outgoingMap(graph);
  const queue = [...indegree.entries()]
    .filter(([, d]) => d === 0)
    .map(([id]) => id);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const next of out.get(id) ?? []) {
      const d = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, d);
      if (d === 0) queue.push(next);
    }
  }
  return order.length === graph.nodes.length ? order : null;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/** Static validation surfaced in the UI before a run. */
export function validateGraph(graph: WorkflowGraph): ValidationResult {
  const errors: string[] = [];
  const ids = new Set(graph.nodes.map((n) => n.id));

  for (const e of graph.edges) {
    if (!ids.has(e.source)) errors.push(`Edge references missing source ${e.source}`);
    if (!ids.has(e.target)) errors.push(`Edge references missing target ${e.target}`);
  }

  if (topoSort(graph) === null) {
    errors.push("Workflow contains a cycle — connections must form a DAG.");
  }

  const incoming = incomingMap(graph);
  for (const node of graph.nodes) {
    if (node.type === "gemini") {
      const hasPromptEdge = (incoming.get(node.id) ?? []).some(
        (p) => p.targetHandle === "prompt",
      );
      const data = node.data as { prompt?: string };
      if (!hasPromptEdge && !data.prompt?.trim()) {
        errors.push(`"${(node.data as { label: string }).label}" needs a prompt (typed or connected).`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/** Set of node ids that must execute for a selective run of `targets`.
 *  Selective runs (single/multi) execute ONLY the targeted nodes — upstream
 *  outputs are reused from the most recent run. */
export function selectionToRunSet(
  graph: WorkflowGraph,
  mode: "full" | "single" | "multi",
  targets: string[],
): Set<string> {
  // Sticky notes are annotations — never part of execution.
  const runnable = graph.nodes.filter((n) => n.type !== "sticky");
  if (mode === "full") return new Set(runnable.map((n) => n.id));
  const targetSet = new Set(targets);
  return new Set(runnable.filter((n) => targetSet.has(n.id)).map((n) => n.id));
}
