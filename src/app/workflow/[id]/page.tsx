import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/app/Sidebar";
import { WorkflowEditor } from "@/components/canvas/WorkflowEditor";
import type { WorkflowGraph } from "@/types/flow";

export const dynamic = "force-dynamic";

export default async function WorkflowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  const { id } = await params;
  const wf = await prisma.workflow.findUnique({ where: { id } });
  if (!wf || wf.userId !== userId) notFound();

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar />
      <div className="relative min-w-0 flex-1">
        <WorkflowEditor
          workflowId={wf.id}
          name={wf.name}
          graph={wf.graph as unknown as WorkflowGraph}
        />
      </div>
    </div>
  );
}
