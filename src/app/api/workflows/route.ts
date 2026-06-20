import { prisma } from "@/lib/prisma";
import { requireUserId, handleError, json } from "@/lib/api";
import { createWorkflowSchema } from "@/lib/validators";
import { buildStarterGraph } from "@/lib/sample-workflow";
import type { WorkflowGraph } from "@/types/flow";

// GET /api/workflows — list the signed-in user's workflows.
export async function GET() {
  try {
    const userId = await requireUserId();
    const workflows = await prisma.workflow.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
    return json(
      workflows.map((w) => {
        const graph = w.graph as unknown as WorkflowGraph;
        return {
          id: w.id,
          name: w.name,
          status: w.status,
          createdAt: w.createdAt.toISOString(),
          updatedAt: w.updatedAt.toISOString(),
          nodeCount: graph?.nodes?.length ?? 0,
        };
      }),
    );
  } catch (err) {
    return handleError(err);
  }
}

// POST /api/workflows — create a workflow (defaults to the starter graph).
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = createWorkflowSchema.parse(await req.json().catch(() => ({})));
    const workflow = await prisma.workflow.create({
      data: {
        userId,
        name: body.name ?? "New Workflow",
        graph: (body.graph ?? buildStarterGraph()) as object,
      },
    });
    return json({ id: workflow.id }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
