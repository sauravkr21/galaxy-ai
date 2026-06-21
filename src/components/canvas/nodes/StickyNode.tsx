"use client";

import { type NodeProps, type Node } from "@xyflow/react";
import { X } from "lucide-react";
import type { StickyData } from "@/types/flow";
import { useWorkflowStore } from "@/store/workflow-store";

export function StickyNode({ id, data, selected }: NodeProps<Node<StickyData>>) {
  const update = useWorkflowStore((s) => s.updateNodeData);
  const deleteNode = useWorkflowStore((s) => s.deleteNode);

  return (
    <div
      className={[
        "group relative w-56 rounded-lg bg-[#fef3c7] p-2 shadow-node transition-shadow hover:shadow-node-hover",
        selected ? "ring-2 ring-amber-300" : "",
      ].join(" ")}
    >
      <button
        onClick={() => deleteNode(id)}
        className="nodrag absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded text-amber-ink/60 opacity-0 transition-opacity hover:bg-black/5 group-hover:opacity-100"
        aria-label="Delete note"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <textarea
        value={data.text}
        onChange={(e) => update(id, { text: e.target.value })}
        placeholder="Type a note..."
        className="nodrag h-28 w-full resize-none bg-transparent text-[12px] leading-snug text-amber-ink placeholder:text-amber-ink/40 outline-none"
      />
    </div>
  );
}
