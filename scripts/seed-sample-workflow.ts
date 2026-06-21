/**
 * Seeds the required "Product Marketing Post" sample workflow (requirements
 * pages 6–7) for a given Clerk user. Run with:
 *   npx tsx scripts/seed-sample-workflow.ts <clerkUserId>
 */
import { prisma } from "@/lib/prisma";
import { buildSampleGraph, SAMPLE_WORKFLOW_NAME } from "@/lib/sample-workflow";

async function main() {
  const userId = process.argv[2];
  if (!userId) throw new Error("Usage: tsx scripts/seed-sample-workflow.ts <clerkUserId>");

  const graph = buildSampleGraph();

  // Avoid duplicates: reuse an existing sample for this user if present.
  const existing = await prisma.workflow.findFirst({
    where: { userId, name: SAMPLE_WORKFLOW_NAME },
  });

  const wf = existing
    ? await prisma.workflow.update({
        where: { id: existing.id },
        data: { graph: graph as object, status: "DRAFT" },
      })
    : await prisma.workflow.create({
        data: {
          userId,
          name: SAMPLE_WORKFLOW_NAME,
          status: "DRAFT",
          graph: graph as object,
        },
      });

  console.log(`${existing ? "Updated" : "Created"} workflow ${wf.id} for ${userId}`);
  console.log(`  nodes=${graph.nodes.length} edges=${graph.edges.length}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
