import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { Workflow } from "lucide-react";
import { prisma } from "@/lib/prisma";
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
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-10 border-b border-hairline bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500 text-white">
              <Workflow className="h-4 w-4" />
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-ink">
              NextFlow
            </span>
          </div>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </header>
      <DashboardClient initial={summaries} />
    </div>
  );
}
