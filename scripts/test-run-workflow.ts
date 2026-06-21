/** Executes a workflow end-to-end via the local executor and prints results.
 *   npx tsx scripts/test-run-workflow.ts <workflowId>
 */
import { prisma } from "@/lib/prisma";
import { executeRun } from "@/lib/run-workflow";
import { selectionToRunSet } from "@/lib/dag";
import { NODE_SPECS } from "@/lib/nodes";
import type { WorkflowGraph, NodeKind } from "@/types/flow";

async function main() {
  const wfId = process.argv[2];
  const wf = await prisma.workflow.findUnique({ where: { id: wfId } });
  if (!wf) throw new Error(`workflow ${wfId} not found`);
  const graph = wf.graph as unknown as WorkflowGraph;
  const runSet = selectionToRunSet(graph, "full", []);

  const run = await prisma.run.create({
    data: {
      workflowId: wf.id,
      userId: wf.userId,
      mode: "FULL",
      targetNodeIds: [],
      status: "QUEUED",
      snapshot: graph as object,
      nodeRuns: {
        create: graph.nodes
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

  console.log(`Running ${run.id} (local executor)…`);
  const t = Date.now();
  await executeRun(run.id, "local");
  console.log(`Finished in ${((Date.now() - t) / 1000).toFixed(1)}s\n`);

  const done = await prisma.run.findUnique({
    where: { id: run.id },
    include: { nodeRuns: { orderBy: { startedAt: "asc" } } },
  });
  console.log("RUN STATUS:", done!.status, "\n");
  for (const nr of done!.nodeRuns) {
    console.log(`- ${nr.label}: ${nr.status}${nr.error ? " — " + nr.error : ""}`);
  }
  const resp = done!.nodeRuns.find((n) => n.nodeType === "response");
  const finalGem = done!.nodeRuns.find((n) => n.nodeId === "gemini-3");
  console.log("\n=== FINAL MARKETING POST ===");
  console.log(
    (finalGem?.output as { response?: string })?.response ??
      (resp?.input as { result?: string })?.result ??
      "(none)",
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
