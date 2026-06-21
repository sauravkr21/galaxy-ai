"use client";

import { type NodeProps, type Node } from "@xyflow/react";
import { Flag, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import type {
  CropImageData,
  GeminiData,
  RequestInputsData,
  ResponseData,
} from "@/types/flow";
import { useWorkflowStore } from "@/store/workflow-store";
import { NodeShell } from "./NodeShell";
import { Port } from "./parts";
import { cn } from "@/lib/utils";

function defaultKey(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

/** Resolve the display value an upstream connection currently exposes. */
function upstreamValue(
  sourceType: string,
  sourceHandle: string,
  data: unknown,
): string | null {
  if (sourceType === "gemini") return (data as GeminiData).response;
  if (sourceType === "crop-image") return (data as CropImageData).outputUrl;
  if (sourceType === "request-inputs") {
    const d = data as RequestInputsData;
    return d.fields?.find((f) => f.id === sourceHandle)?.value ?? null;
  }
  return null;
}

export function ResponseNode({
  id,
  data,
  selected,
}: NodeProps<Node<ResponseData>>) {
  const update = useWorkflowStore((s) => s.updateNodeData);
  const edges = useWorkflowStore((s) => s.edges);
  const nodes = useWorkflowStore((s) => s.nodes);
  const onEdgesChange = useWorkflowStore((s) => s.onEdgesChange);
  const [editing, setEditing] = useState<string | null>(null);

  const incoming = edges.filter((e) => e.target === id && e.targetHandle === "result");
  const keys = data.keys ?? {};

  function setKey(sourceId: string, value: string) {
    update(id, { keys: { ...keys, [sourceId]: value } });
  }

  return (
    <NodeShell
      nodeId={id}
      title={data.label}
      subtitle="Connect node outputs here to define what your workflow returns. These values appear as results in Playground and API responses."
      icon={<Flag className="h-3.5 w-3.5" />}
      accent="#6a45f0"
      runState={data.runState}
      selected={selected}
      width={300}
      deletable={false}
      showMenu={false}
    >
      <div>
        <Port id="result" label="result" type="any" side="left" connected={incoming.length > 0} />
      </div>

      {incoming.length === 0 ? (
        <div className="rounded-lg border border-dashed border-hairline px-3 py-4 text-center text-[11px] text-ink-faint">
          Connect a node&apos;s output here to collect the result.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {incoming.map((e) => {
            const src = nodes.find((n) => n.id === e.source);
            const label = (src?.data as { label?: string })?.label ?? e.source;
            const key = keys[e.source] ?? defaultKey(label);
            const value = src
              ? upstreamValue(src.type as string, e.sourceHandle ?? "", src.data)
              : null;
            const isEditing = editing === e.source;
            return (
              <div key={e.id} className="rounded-lg border border-hairline">
                <div className="flex items-center justify-between border-b border-hairline px-2 py-1.5">
                  {isEditing ? (
                    <input
                      autoFocus
                      value={key}
                      onChange={(ev) => setKey(e.source, ev.target.value)}
                      onBlur={() => setEditing(null)}
                      onKeyDown={(ev) => ev.key === "Enter" && setEditing(null)}
                      className="nodrag w-full bg-transparent font-mono text-[12px] text-ink outline-none"
                    />
                  ) : (
                    <span className="truncate font-mono text-[12px] text-ink">{key}</span>
                  )}
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => setEditing(isEditing ? null : e.source)}
                      className="nodrag flex h-6 w-6 items-center justify-center rounded text-ink-faint hover:bg-ink/5"
                      title="Rename key"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => onEdgesChange([{ id: e.id, type: "remove" }])}
                      className="nodrag flex h-6 w-6 items-center justify-center rounded text-ink-faint hover:bg-red-50 hover:text-red-600"
                      title="Remove connection"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <div className={cn("max-h-32 overflow-auto p-2 text-[12px] leading-snug", value ? "text-ink" : "text-ink-faint")}>
                  {value
                    ? value.startsWith("data:image") || value.startsWith("http")
                      ? // eslint-disable-next-line @next/next/no-img-element
                        <img src={value} alt="result" className="max-h-28 rounded" />
                      : <span className="whitespace-pre-wrap">{value}</span>
                    : "No output yet"}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </NodeShell>
  );
}
