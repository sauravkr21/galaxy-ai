"use client";

import { workflowGraphSchema } from "@/lib/validators";
import type { WorkflowGraph } from "@/types/flow";

/** Serialise a workflow graph to a downloadable JSON file. */
export function exportWorkflowJson(name: string, graph: WorkflowGraph) {
  const payload = { name, version: 1, graph };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.nextflow.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Parse + validate an imported workflow JSON file. */
export async function importWorkflowJson(
  file: File,
): Promise<{ name?: string; graph: WorkflowGraph }> {
  const text = await file.text();
  const parsed = JSON.parse(text);
  const graph = workflowGraphSchema.parse(parsed.graph ?? parsed);
  return { name: typeof parsed.name === "string" ? parsed.name : undefined, graph };
}
