"use client";

import { type NodeProps, type Node } from "@xyflow/react";
import { Inbox } from "lucide-react";
import type { RequestInputsData } from "@/types/flow";
import { useWorkflowStore } from "@/store/workflow-store";
import { NodeShell } from "./NodeShell";
import { FieldLabel, Port } from "./parts";
import { MediaUpload } from "../MediaUpload";

export function RequestInputsNode({
  id,
  data,
  selected,
}: NodeProps<Node<RequestInputsData>>) {
  const update = useWorkflowStore((s) => s.updateNodeData);

  return (
    <NodeShell
      nodeId={id}
      title={data.label}
      icon={<Inbox className="h-3.5 w-3.5" />}
      accent="#1a1a23"
      runState={data.runState}
      selected={selected}
    >
      {/* text_field */}
      <div>
        <div className="flex items-center justify-between">
          <FieldLabel>text_field</FieldLabel>
          <Port id="text_field" label="" type="text" side="right" />
        </div>
        <textarea
          className="nodrag mt-1 h-20 w-full resize-none rounded-lg border border-hairline bg-white p-2 text-[12px] leading-snug text-ink outline-none focus:border-violet-400"
          placeholder="Describe the product, the request, the context…"
          value={data.textField}
          onChange={(e) => update(id, { textField: e.target.value })}
        />
      </div>

      {/* image_field */}
      <div>
        <div className="flex items-center justify-between">
          <FieldLabel>image_field</FieldLabel>
          <Port id="image_field" label="" type="image" side="right" />
        </div>
        <div className="mt-1">
          <MediaUpload
            value={data.imageUrl}
            onChange={(url) =>
              update(id, {
                imageUrl: url,
                imageName: url ? data.imageName ?? "upload" : null,
              })
            }
          />
        </div>
      </div>
    </NodeShell>
  );
}
