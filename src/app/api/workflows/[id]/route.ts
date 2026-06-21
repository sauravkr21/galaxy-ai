import { prisma } from "@/lib/prisma";
import { ApiError, handleError, json, requireUserId } from "@/lib/api";
import { updateWorkflowSchema } from "@/lib/validators";

async function ownedWorkflow(id: string, userId: string) {
  const wf = await prisma.workflow.findUnique({ where: { id } });
  if (!wf || wf.userId !== userId) throw new ApiError(404, "Workflow not found");
  return wf;
}

// GET /api/workflows/:id — full graph for the editor.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const wf = await ownedWorkflow(id, userId);
    return json({
      id: wf.id,
      name: wf.name,
      status: wf.status,
      graph: wf.graph,
      updatedAt: wf.updatedAt.toISOString(),
    });
  } catch (err) {
    return handleError(err);
  }
}

// PATCH /api/workflows/:id — rename, update status, or persist the graph.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    await ownedWorkflow(id, userId);
    const body = updateWorkflowSchema.parse(await req.json());
    const wf = await prisma.workflow.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.graph !== undefined ? { graph: body.graph as object } : {}),
        ...(body.thumbnailUrl !== undefined ? { thumbnailUrl: body.thumbnailUrl } : {}),
      },
    });
    return json({ id: wf.id, updatedAt: wf.updatedAt.toISOString() });
  } catch (err) {
    return handleError(err);
  }
}

// DELETE /api/workflows/:id
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    await ownedWorkflow(id, userId);
    await prisma.workflow.delete({ where: { id } });
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
