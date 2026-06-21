import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/app/Sidebar";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import type { WorkflowGraph, WorkflowSummary } from "@/types/flow";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const workflows = await prisma.workflow.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  const summaries: WorkflowSummary[] = workflows.map((w) => {
    const graph = w.graph as unknown as WorkflowGraph;
    return {
      id: w.id,
      name: w.name,
      status: w.status,
      createdAt: w.createdAt.toISOString(),
      updatedAt: w.updatedAt.toISOString(),
      nodeCount: graph?.nodes?.length ?? 0,
    };
  });

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-canvas">
        <DashboardClient initial={summaries} />
      </main>
    </div>
  );
}
