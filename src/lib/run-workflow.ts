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
import type { FlowNode, WorkflowGraph } from "@/types/flow";

export type ExecutorMode = "local" | "trigger";

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

/** Trigger.dev executor — every executable node runs as a child task.
 *  Only valid inside a Trigger.dev run context (see executeWorkflowTask). */
function triggerExecutor(runId: string): NodeExecutor {
  return async (node, inputs): Promise<ExecutedNode> => {
    // Imported lazily so the local path never pulls the task runtime.
    const { cropImageTask } = await import("@/trigger/crop-image");
    const { geminiTask } = await import("@/trigger/gemini");

    if (node.type === "crop-image") {
      const { imageUrl, x, y, w, h } = cropInputsFrom(node, inputs);
      if (!imageUrl) throw new Error("Crop Image node has no input image.");
      const handle = await cropImageTask.triggerAndWait({
        runId,
        nodeId: node.id,
        imageUrl,
        x,
        y,
        w,
        h,
      });
      if (!handle.ok) throw new Error("Crop task failed.");
      return {
        nodeId: node.id,
        nodeType: "crop-image",
        outputs: { output: handle.output.outputUrl },
        dataPatch: { imageUrl, outputUrl: handle.output.outputUrl, runState: "completed" },
        logs: [],
        input: { imageUrl, x, y, w, h },
        triggerRunId: handle.id,
      };
    }
    if (node.type === "gemini") {
      const g = geminiInputsFrom(node, inputs);
      if (!g.prompt?.trim()) throw new Error("Gemini node has no prompt.");
      const handle = await geminiTask.triggerAndWait({
        runId,
        nodeId: node.id,
        model: g.model,
        prompt: g.prompt,
        systemPrompt: g.systemPrompt,
        settings: g.settings,
        vision: g.vision,
      });
      if (!handle.ok) throw new Error("Gemini task failed.");
      return {
        nodeId: node.id,
        nodeType: "gemini",
        outputs: { response: handle.output.text },
        dataPatch: { response: handle.output.text, runState: "completed" },
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

  await prisma.run.update({
    where: { id: runId },
    data: { status: "RUNNING", startedAt: new Date() },
  });

  const executor = mode === "trigger" ? triggerExecutor(runId) : localExecutor();

  try {
    const { results } = await runDag(graph, runSet, executor, {
      onNodeStart: async (nodeId) => {
        const id = nodeRunIdByNode.get(nodeId);
        if (id)
          await prisma.nodeRun.update({
            where: { id },
            data: { status: "RUNNING", startedAt: new Date() },
          });
      },
      onNodeFinish: async (res, durationMs) => {
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
        const id = nodeRunIdByNode.get(nodeId);
        if (id)
          await prisma.nodeRun.update({
            where: { id },
            data: { status: "FAILED", finishedAt: new Date(), error },
          });
      },
      onNodeSkipped: async (nodeId) => {
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
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.run.update({
      where: { id: runId },
      data: { status: "FAILED", finishedAt: new Date(), error: message },
    });
  }
}
