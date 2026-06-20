import { prisma } from "@/lib/prisma";
import { ApiError, handleError, json, requireUserId } from "@/lib/api";

// GET /api/runs/:runId — run status + per-node detail, polled by the canvas
// to drive the pulsating glow and the history panel.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    const userId = await requireUserId();
    const { runId } = await params;
    const run = await prisma.run.findUnique({
      where: { id: runId },
      include: { nodeRuns: { orderBy: { startedAt: "asc" } } },
    });
    if (!run || run.userId !== userId) throw new ApiError(404, "Run not found");
    return json(run);
  } catch (err) {
    return handleError(err);
  }
}
