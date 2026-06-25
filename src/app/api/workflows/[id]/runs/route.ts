import { prisma } from "@/lib/prisma";
import {
  ApiError,
  handleError,
  isLocalExecutor,
  json,
  requireUserId,
} from "@/lib/api";
import { startRunSchema } from "@/lib/validators";
import { selectionToRunSet, validateGraph } from "@/lib/dag";
import { NODE_SPECS } from "@/lib/nodes";
import { executeRun } from "@/lib/run-workflow";
import type { NodeKind } from "@/types/flow";

async function ownedWorkflow(id: string, userId: string) {
  const wf = await prisma.workflow.findUnique({ where: { id } });
  if (!wf || wf.userId !== userId) throw new ApiError(404, "Workflow not found");
  return wf;
}

// GET /api/workflows/:id/runs — run history (newest first) with per-node detail.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    await ownedWorkflow(id, userId);
    const runs = await prisma.run.findMany({
      where: { workflowId: id },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { nodeRuns: { orderBy: { startedAt: "asc" } } },
    });
    return json(runs);
  } catch (err) {
    return handleError(err);
  }
}

// POST /api/workflows/:id/runs — snapshot the graph and start a run.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    await ownedWorkflow(id, userId);

    const body = startRunSchema.parse(await req.json());
    const validation = validateGraph(body.graph);
    if (!validation.valid) {
      throw new ApiError(400, validation.errors.join(" "));
    }

    const runSet = selectionToRunSet(body.graph, body.mode, body.targetNodeIds);

    // Persist the latest canvas state alongside the run snapshot.
    await prisma.workflow.update({
      where: { id },
      data: { graph: body.graph as object, status: "RUNNING" },
    });

    const run = await prisma.run.create({
      data: {
        workflowId: id,
        userId,
        mode: body.mode.toUpperCase() as "FULL" | "SINGLE" | "MULTI",
        targetNodeIds: body.targetNodeIds,
        status: "QUEUED",
        snapshot: body.graph as object,
        nodeRuns: {
          create: body.graph.nodes
            .filter((n) => runSet.has(n.id))
            .map((n) => ({
              nodeId: n.id,
              nodeType: n.type,
              label:
                (n.data as { label?: string }).label ??
                NODE_SPECS[n.type as NodeKind].title,
              status: "PENDING" as const,
            })),
        },
      },
    });

    // Dispatch execution.
    if (isLocalExecutor()) {
      // Fire-and-forget in-process dev fallback (no Trigger.dev configured).
      // There is no Realtime run to subscribe to in this mode.
      void executeRun(run.id, "local").catch((e) =>
        console.error("[run] local execution failed", e),
      );
      return json({ runId: run.id, mode: body.mode }, { status: 201 });
    }

    // Trigger.dev path: kick off the orchestrator and hand the client a public
    // access token scoped to this run so it can subscribe via Trigger Realtime
    // (useRealtimeRun) — driving the live node glow + history with zero polling.
    const { executeWorkflowTask } = await import("@/trigger/execute-workflow");
    const handle = await executeWorkflowTask.trigger({ runId: run.id });

    return json(
      {
        runId: run.id,
        mode: body.mode,
        triggerRunId: handle.id,
        publicAccessToken: handle.publicAccessToken,
      },
      { status: 201 },
    );
  } catch (err) {
    return handleError(err);
  }
}
