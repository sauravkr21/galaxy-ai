import { metadata } from "@trigger.dev/sdk";
import { prisma } from "@/lib/prisma";
import {
  cropInputsFrom,
  ExecutedNode,
  geminiInputsFrom,
  NodeExecutor,
  runDag,
} from "@/lib/engine";
import { selectionToRunSet } from "@/lib/dag";
import { runGemini } from "@/lib/gemini";
import { cropWithFfmpeg } from "@/lib/image-crop";
import { CANDIDATE_LINKEDIN } from "@/lib/branding";
import type { FlowNode, NodeRunState, WorkflowGraph } from "@/types/flow";

export type ExecutorMode = "local" | "trigger";

/** Shape of the per-node progress we stream over Trigger.dev Realtime metadata.
 *  The canvas reads `metadata.nodes[nodeId]` to drive the live glow, and
 *  `metadata.status` for the overall run badge — no DB polling required. */
export interface RunMetadata {
  status: "RUNNING" | "COMPLETED" | "FAILED";
  nodes: Record<string, NodeRunState>;
}

/**
 * Publishes per-node + overall run progress onto the orchestrator run's
 * metadata so any Realtime subscriber (the canvas) is pushed live updates.
 * A no-op in local mode, where there is no Trigger.dev run context.
 */
function makeProgressPublisher(mode: ExecutorMode) {
  const nodes: Record<string, NodeRunState> = {};
  const enabled = mode === "trigger";

  const flush = async () => {
    if (!enabled) return;
    metadata.set("nodes", { ...nodes });
    // Force a flush so the glow updates immediately rather than on the SDK's
    // periodic (~1s) auto-flush.
    await metadata.flush();
  };

  return {
    async setNode(nodeId: string, state: NodeRunState) {
      nodes[nodeId] = state;
      await flush();
    },
    async setMany(ids: string[], state: NodeRunState) {
      for (const id of ids) nodes[id] = state;
      await flush();
    },
    async setStatus(status: RunMetadata["status"]) {
      if (!enabled) return;
      metadata.set("status", status);
      await metadata.flush();
    },
  };
}

const attribution = `[NextFlow] Candidate LinkedIn: ${CANDIDATE_LINKEDIN}`;

/** In-process executor used for local demos (LOCAL_EXECUTOR=1). */
function localExecutor(): NodeExecutor {
  return async (node, inputs): Promise<ExecutedNode> => {
    if (node.type === "crop-image") {
      const { imageUrl, x, y, w, h } = cropInputsFrom(node, inputs);
      if (!imageUrl) throw new Error("Crop Image node has no input image.");
      // MANDATORY 30s+ artificial delay (mirrors the Trigger.dev task).
      await new Promise((r) => setTimeout(r, 30_000));
      const outputUrl = await cropWithFfmpeg(imageUrl, { x, y, w, h });
      return {
        nodeId: node.id,
        nodeType: "crop-image",
        outputs: { output: outputUrl },
        dataPatch: { imageUrl, outputUrl, runState: "completed" },
        logs: [attribution],
        input: { imageUrl, x, y, w, h },
      };
    }
    if (node.type === "gemini") {
      const g = geminiInputsFrom(node, inputs);
      if (!g.prompt?.trim()) throw new Error("Gemini node has no prompt.");
      const result = await runGemini({
        model: g.model,
        prompt: g.prompt,
        systemPrompt: g.systemPrompt,
        settings: g.settings,
        images: g.vision.images,
        vision: { video: g.vision.video, audio: g.vision.audio, file: g.vision.file },
      });
      return {
        nodeId: node.id,
        nodeType: "gemini",
        outputs: { response: result.text },
        dataPatch: { response: result.text, runState: "completed" },
        logs: [attribution],
        input: g,
      };
    }
    throw new Error(`Unsupported executable node type: ${node.type}`);
  };
}

/** Terminal Trigger.dev run statuses that are *not* a successful completion. */
const FAILED_RUN_STATUSES = new Set([
  "FAILED",
  "CANCELED",
  "CRASHED",
  "SYSTEM_FAILURE",
  "INTERRUPTED",
  "TIMED_OUT",
  "EXPIRED",
]);

/** Trigger.dev executor — every executable node runs as a child task.
 *  Only valid inside a Trigger.dev run context (see executeWorkflowTask). */
function triggerExecutor(runId: string): NodeExecutor {
  return async (node, inputs): Promise<ExecutedNode> => {
    // Imported lazily so the local path never pulls the task runtime.
    const { cropImageTask } = await import("@/trigger/crop-image");
    const { geminiTask } = await import("@/trigger/gemini");
    const { runs } = await import("@trigger.dev/sdk");

    // IMPORTANT: use `trigger` + `runs.subscribeToRun` (Trigger.dev Realtime),
    // NOT `triggerAndWait` and NOT `runs.poll`. The engine runs sibling nodes
    // concurrently, and Trigger.dev forbids parallel waitpoints ("Parallel
    // waits are not supported … Promise.all() around our wait functions"). A
    // Realtime subscription is not a waitpoint, so concurrent children work and
    // DAG concurrency is preserved — while child completion is delivered as a
    // server-pushed event (Electric/SSE) instead of interval HTTP polling.
    async function awaitChild<T>(handle: { id: string }): Promise<T> {
      for await (const childRun of runs.subscribeToRun(handle.id)) {
        if (childRun.status === "COMPLETED") {
          return childRun.output as T;
        }
        if (FAILED_RUN_STATUSES.has(childRun.status)) {
          const message =
            (childRun as { error?: { message?: string } }).error?.message ??
            "no output";
          throw new Error(`${childRun.taskIdentifier} ${childRun.status}: ${message}`);
        }
        // Non-terminal status (QUEUED/EXECUTING/…) — keep listening.
      }
      throw new Error(
        `Child run ${handle.id} subscription closed before completion`,
      );
    }

    if (node.type === "crop-image") {
      const { imageUrl, x, y, w, h } = cropInputsFrom(node, inputs);
      if (!imageUrl) throw new Error("Crop Image node has no input image.");
      const handle = await cropImageTask.trigger({
        runId,
        nodeId: node.id,
        imageUrl,
        x,
        y,
        w,
        h,
      });
      const out = await awaitChild<{ outputUrl: string }>(handle);
      return {
        nodeId: node.id,
        nodeType: "crop-image",
        outputs: { output: out.outputUrl },
        dataPatch: { imageUrl, outputUrl: out.outputUrl, runState: "completed" },
        logs: [],
        input: { imageUrl, x, y, w, h },
        triggerRunId: handle.id,
      };
    }
    if (node.type === "gemini") {
      const g = geminiInputsFrom(node, inputs);
      if (!g.prompt?.trim()) throw new Error("Gemini node has no prompt.");
      const handle = await geminiTask.trigger({
        runId,
        nodeId: node.id,
        model: g.model,
        prompt: g.prompt,
        systemPrompt: g.systemPrompt,
        settings: g.settings,
        vision: g.vision,
      });
      const out = await awaitChild<{ text: string }>(handle);
      return {
        nodeId: node.id,
        nodeType: "gemini",
        outputs: { response: out.text },
        dataPatch: { response: out.text, runState: "completed" },
        logs: [],
        input: g,
        triggerRunId: handle.id,
      };
    }
    throw new Error(`Unsupported executable node type: ${node.type}`);
  };
}

/** Merge run outputs back into the persisted workflow graph so the canvas and
 *  future selective runs see the latest node outputs. */
async function persistOutputs(
  workflowId: string,
  graph: WorkflowGraph,
  results: ExecutedNode[],
) {
  const patchByNode = new Map(results.map((r) => [r.nodeId, r.dataPatch]));
  const nodes: FlowNode[] = graph.nodes.map((n) => {
    const patch = patchByNode.get(n.id);
    if (!patch) return n;
    // Keep persisted runState neutral; the live glow is driven client-side.
    const { runState, ...rest } = patch as Record<string, unknown>;
    void runState;
    return { ...n, data: { ...n.data, ...rest } } as FlowNode;
  });
  await prisma.workflow.update({
    where: { id: workflowId },
    data: { graph: { ...graph, nodes } as object },
  });
}

/**
 * Drives a single Run end-to-end: flips statuses, executes the DAG via the
 * chosen executor, records every NodeRun, and finalises the Run + workflow.
 */
export async function executeRun(runId: string, mode: ExecutorMode) {
  const run = await prisma.run.findUnique({
    where: { id: runId },
    include: { nodeRuns: true },
  });
  if (!run) throw new Error(`Run ${runId} not found`);

  const graph = run.snapshot as unknown as WorkflowGraph;
  const runSet = selectionToRunSet(
    graph,
    run.mode.toLowerCase() as "full" | "single" | "multi",
    run.targetNodeIds,
  );
  const nodeRunIdByNode = new Map(run.nodeRuns.map((nr) => [nr.nodeId, nr.id]));
  const progress = makeProgressPublisher(mode);

  await prisma.run.update({
    where: { id: runId },
    data: { status: "RUNNING", startedAt: new Date() },
  });
  // Seed the Realtime metadata: everything in the run set starts "queued".
  await progress.setStatus("RUNNING");
  await progress.setMany([...runSet], "queued");

  const executor = mode === "trigger" ? triggerExecutor(runId) : localExecutor();

  try {
    const { results } = await runDag(graph, runSet, executor, {
      onNodeStart: async (nodeId) => {
        await progress.setNode(nodeId, "running");
        const id = nodeRunIdByNode.get(nodeId);
        if (id)
          await prisma.nodeRun.update({
            where: { id },
            data: { status: "RUNNING", startedAt: new Date() },
          });
      },
      onNodeFinish: async (res, durationMs) => {
        await progress.setNode(res.nodeId, "completed");
        const id = nodeRunIdByNode.get(res.nodeId);
        if (id)
          await prisma.nodeRun.update({
            where: { id },
            data: {
              status: "COMPLETED",
              finishedAt: new Date(),
              durationMs,
              input: (res.input ?? null) as object,
              output: res.outputs as object,
              logs: res.logs,
              triggerRunId: res.triggerRunId ?? null,
            },
          });
      },
      onNodeError: async (nodeId, error) => {
        await progress.setNode(nodeId, "failed");
        const id = nodeRunIdByNode.get(nodeId);
        if (id)
          await prisma.nodeRun.update({
            where: { id },
            data: { status: "FAILED", finishedAt: new Date(), error },
          });
      },
      onNodeSkipped: async (nodeId) => {
        // Skipped nodes go neutral on the canvas (idle glow).
        await progress.setNode(nodeId, "idle");
        const id = nodeRunIdByNode.get(nodeId);
        if (id)
          await prisma.nodeRun.update({
            where: { id },
            data: { status: "SKIPPED" },
          });
      },
    });

    await persistOutputs(run.workflowId, graph, results);

    const failed = await prisma.nodeRun.count({
      where: { runId, status: "FAILED" },
    });
    await prisma.run.update({
      where: { id: runId },
      data: {
        status: failed > 0 ? "FAILED" : "COMPLETED",
        finishedAt: new Date(),
      },
    });
    await prisma.workflow.update({
      where: { id: run.workflowId },
      data: { status: failed > 0 ? "FAILED" : "COMPLETED" },
    });
    await progress.setStatus(failed > 0 ? "FAILED" : "COMPLETED");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.run.update({
      where: { id: runId },
      data: { status: "FAILED", finishedAt: new Date(), error: message },
    });
    await progress.setStatus("FAILED");
  }
}
