import { incomingMap } from "@/lib/dag";
import { NODE_SPECS } from "@/lib/nodes";
import {
  CropImageData,
  FlowNode,
  GeminiData,
  NodeKind,
  RequestInputsData,
  ResponseData,
  WorkflowGraph,
} from "@/types/flow";

/** Outputs a node exposes, keyed by its source handle id. */
export type NodeOutputs = Record<string, string | null>;

/** Resolved inputs handed to a node executor, keyed by target handle id.
 *  Vision handles may receive multiple connections, hence string[]. */
export interface ResolvedInputs {
  text: Record<string, string>; // prompt / system_prompt / etc.
  media: Record<string, string[]>; // image / video / audio / file (+ input_image)
}

export interface ExecutedNode {
  nodeId: string;
  nodeType: NodeKind;
  outputs: NodeOutputs;
  /** Patch to merge back into the node's data (e.g. response text, crop url). */
  dataPatch: Record<string, unknown>;
  logs: string[];
  /** Resolved input recorded for the history panel. */
  input?: unknown;
  /** Trigger.dev child run id, when executed via Trigger.dev. */
  triggerRunId?: string;
}

export interface NodeExecutor {
  /** Runs a single executable node (gemini / crop-image). */
  (node: FlowNode, inputs: ResolvedInputs): Promise<ExecutedNode>;
}

export interface EngineHooks {
  onNodeQueued?: (nodeId: string) => void | Promise<void>;
  onNodeStart?: (nodeId: string) => void | Promise<void>;
  onNodeFinish?: (result: ExecutedNode, durationMs: number) => void | Promise<void>;
  onNodeError?: (nodeId: string, error: string) => void | Promise<void>;
  onNodeSkipped?: (nodeId: string) => void | Promise<void>;
}

/** Resolve the outputs a local (non-executable) node exposes from its data. */
function localOutputs(node: FlowNode): NodeOutputs {
  switch (node.type) {
    case "request-inputs": {
      const d = node.data as RequestInputsData;
      return Object.fromEntries((d.fields ?? []).map((f) => [f.id, f.value]));
    }
    case "crop-image": {
      const d = node.data as CropImageData;
      return { output: d.outputUrl };
    }
    case "gemini": {
      const d = node.data as GeminiData;
      return { response: d.response };
    }
    case "response":
      return {};
    default:
      return {};
  }
}

/**
 * Executes a workflow as a dataflow DAG.
 *
 * Each node becomes a promise that awaits only its direct upstream node
 * promises, so independent branches fire concurrently (Crop#1, Crop#2 and
 * Gemini#1 all start at T=0) while dependents start the instant their own
 * inputs are ready (Gemini#2 starts when Gemini#1 finishes, without waiting
 * for the crops). For selective runs, nodes outside `runSet` are not executed;
 * their outputs are seeded from the persisted node data.
 */
export async function runDag(
  graph: WorkflowGraph,
  runSet: Set<string>,
  execute: NodeExecutor,
  hooks: EngineHooks = {},
): Promise<{ outputs: Map<string, NodeOutputs>; results: ExecutedNode[] }> {
  const incoming = incomingMap(graph);
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const outputs = new Map<string, NodeOutputs>();
  const results: ExecutedNode[] = [];

  // Seed every node's outputs from persisted data so selective runs and
  // not-yet-run upstreams resolve to their last known values.
  for (const node of graph.nodes) outputs.set(node.id, localOutputs(node));

  const promises = new Map<string, Promise<void>>();

  function resolveInputs(nodeId: string): ResolvedInputs {
    const inputs: ResolvedInputs = { text: {}, media: {} };
    for (const pred of incoming.get(nodeId) ?? []) {
      const upstream = outputs.get(pred.nodeId) ?? {};
      const value = upstream[pred.sourceHandle] ?? null;
      if (value == null) continue;
      const targetNode = nodeById.get(nodeId)!;
      const port = NODE_SPECS[targetNode.type as NodeKind].inputs.find(
        (p) => p.id === pred.targetHandle,
      );
      if (!port) continue;
      if (port.type === "text" || port.type === "any") {
        inputs.text[pred.targetHandle] = value;
      } else {
        (inputs.media[pred.targetHandle] ??= []).push(value);
      }
    }
    return inputs;
  }

  // Build promises in topological-safe lazy fashion: a node's promise awaits
  // its predecessors' promises (already defined because we create them on
  // demand and the graph is a DAG).
  function nodePromise(nodeId: string): Promise<void> {
    const existing = promises.get(nodeId);
    if (existing) return existing;

    const p = (async () => {
      const preds = incoming.get(nodeId) ?? [];
      // Wait only for direct upstream nodes that are part of this run.
      await Promise.all(
        preds
          .filter((pr) => runSet.has(pr.nodeId))
          .map((pr) => nodePromise(pr.nodeId)),
      );

      const node = nodeById.get(nodeId)!;
      const spec = NODE_SPECS[node.type as NodeKind];

      if (!runSet.has(nodeId)) {
        await hooks.onNodeSkipped?.(nodeId);
        return;
      }

      // Local nodes resolve instantly from their data / upstream inputs.
      if (!spec.executable) {
        const inputs = resolveInputs(nodeId);
        if (node.type === "response") {
          const result = inputs.text["result"] ?? null;
          outputs.set(nodeId, {});
          const exec: ExecutedNode = {
            nodeId,
            nodeType: "response",
            outputs: {},
            dataPatch: { result, runState: "completed" },
            logs: [],
            input: { result },
          };
          await hooks.onNodeStart?.(nodeId);
          results.push(exec);
          await hooks.onNodeFinish?.(exec, 0);
        } else {
          // request-inputs: outputs already seeded from data.
          const exec: ExecutedNode = {
            nodeId,
            nodeType: node.type as NodeKind,
            outputs: outputs.get(nodeId) ?? {},
            dataPatch: { runState: "completed" },
            logs: [],
            input: outputs.get(nodeId) ?? {},
          };
          await hooks.onNodeStart?.(nodeId);
          results.push(exec);
          await hooks.onNodeFinish?.(exec, 0);
        }
        return;
      }

      // Executable node → run via the provided executor.
      await hooks.onNodeStart?.(nodeId);
      const started = Date.now();
      try {
        const inputs = resolveInputs(nodeId);
        const exec = await execute(node, inputs);
        outputs.set(nodeId, exec.outputs);
        results.push(exec);
        await hooks.onNodeFinish?.(exec, Date.now() - started);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await hooks.onNodeError?.(nodeId, message);
        throw err;
      }
    })();

    promises.set(nodeId, p);
    return p;
  }

  await hooks.onNodeQueued?.("*");
  // Kick off every node in the run set; the promise graph enforces ordering.
  await Promise.allSettled([...runSet].map((id) => nodePromise(id)));

  return { outputs, results };
}

/** Build the executor input payload for a Gemini node from resolved inputs. */
export function geminiInputsFrom(node: FlowNode, inputs: ResolvedInputs) {
  const d = node.data as GeminiData;
  const prompt = inputs.text["prompt"] ?? d.prompt;
  const systemPrompt = inputs.text["system_prompt"] ?? d.systemPrompt;
  const pick = (handle: string, manual: string | null) =>
    inputs.media[handle]?.[0] ?? manual ?? null;
  return {
    model: d.model,
    prompt,
    systemPrompt,
    settings: d.settings,
    vision: {
      // All connected images (e.g. both crops) plus any manual upload.
      images: [...(inputs.media["image"] ?? []), ...(d.vision.image ? [d.vision.image] : [])],
      video: pick("video", d.vision.video),
      audio: pick("audio", d.vision.audio),
      file: pick("file", d.vision.file),
    },
  };
}

/** Build the executor input payload for a Crop node from resolved inputs. */
export function cropInputsFrom(node: FlowNode, inputs: ResolvedInputs) {
  const d = node.data as CropImageData;
  const imageUrl = inputs.media["input_image"]?.[0] ?? d.imageUrl;
  return { imageUrl, x: d.x, y: d.y, w: d.w, h: d.h };
}

export function isResponseLabel(node: FlowNode): string {
  return (node.data as ResponseData).resultKey ?? "result";
}
