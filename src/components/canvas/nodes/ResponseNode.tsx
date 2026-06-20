"use client";

import { type NodeProps, type Node } from "@xyflow/react";
import { Flag } from "lucide-react";
import type { ResponseData } from "@/types/flow";
import {
  connectedTargetHandles,
  useWorkflowStore,
} from "@/store/workflow-store";
import { NodeShell } from "./NodeShell";
import { Port } from "./parts";

export function ResponseNode({
  id,
  data,
  selected,
}: NodeProps<Node<ResponseData>>) {
  const update = useWorkflowStore((s) => s.updateNodeData);
  const edges = useWorkflowStore((s) => s.edges);
  const connected = connectedTargetHandles(edges, id).has("result");

  return (
    <NodeShell
      nodeId={id}
      title={data.label}
      icon={<Flag className="h-3.5 w-3.5" />}
      accent="#6a45f0"
      runState={data.runState}
      selected={selected}
      width={280}
    >
      <div>
        <Port id="result" label="result" type="any" side="left" connected={connected} />
      </div>

      <div className="rounded-lg border border-hairline">
        <div className="flex items-center justify-between border-b border-hairline px-2 py-1.5">
          <input
            value={data.resultKey}
            onChange={(e) => update(id, { resultKey: e.target.value })}
            className="nodrag w-full bg-transparent font-mono text-[12px] text-ink outline-none"
          />
        </div>
        <div className="max-h-40 overflow-auto p-2 text-[12px] leading-snug">
          {data.result ? (
            <span className="whitespace-pre-wrap text-ink">{data.result}</span>
          ) : (
            <span className="text-ink-faint">No output yet</span>
          )}
        </div>
      </div>
    </NodeShell>
  );
}
