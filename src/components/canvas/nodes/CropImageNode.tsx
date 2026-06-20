"use client";

import { type NodeProps, type Node } from "@xyflow/react";
import { Crop } from "lucide-react";
import type { CropImageData } from "@/types/flow";
import {
  connectedTargetHandles,
  useWorkflowStore,
} from "@/store/workflow-store";
import { NodeShell } from "./NodeShell";
import { FieldLabel, Port } from "./parts";
import { MediaUpload } from "../MediaUpload";

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex-1">
      <FieldLabel>{label} (%)</FieldLabel>
      <input
        type="number"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="nodrag h-8 w-full rounded-md border border-hairline px-2 text-[12px] outline-none focus:border-violet-400"
      />
    </div>
  );
}

export function CropImageNode({
  id,
  data,
  selected,
}: NodeProps<Node<CropImageData>>) {
  const update = useWorkflowStore((s) => s.updateNodeData);
  const edges = useWorkflowStore((s) => s.edges);
  const connected = connectedTargetHandles(edges, id);
  const inputConnected = connected.has("input_image");

  return (
    <NodeShell
      nodeId={id}
      title={data.label}
      icon={<Crop className="h-3.5 w-3.5" />}
      accent="#0ea5e9"
      runState={data.runState}
      selected={selected}
      width={300}
    >
      {/* input image */}
      <div>
        <div className="flex items-center justify-between">
          <Port
            id="input_image"
            label="Input image"
            type="image"
            side="left"
            connected={inputConnected}
          />
        </div>
        <div className="mt-1">
          {inputConnected ? (
            <div className="flex h-9 items-center rounded-lg border border-dashed border-violet-200 bg-violet-50 px-2 text-[11px] text-violet-600">
              Image provided by upstream connection
            </div>
          ) : (
            <MediaUpload
              value={data.imageUrl}
              onChange={(url) => update(id, { imageUrl: url })}
              label="Change image"
            />
          )}
        </div>
      </div>

      {/* crop rectangle */}
      <div className="flex gap-2">
        <NumberField label="x" value={data.x} onChange={(n) => update(id, { x: n })} />
        <NumberField label="y" value={data.y} onChange={(n) => update(id, { y: n })} />
      </div>
      <div className="flex gap-2">
        <NumberField label="w" value={data.w} onChange={(n) => update(id, { w: n })} />
        <NumberField label="h" value={data.h} onChange={(n) => update(id, { h: n })} />
      </div>

      {/* output */}
      <div>
        <div className="flex items-center justify-end">
          <Port id="output" label="Output image" type="image" side="right" />
        </div>
        <div className="mt-1 overflow-hidden rounded-lg border border-hairline bg-ink/5">
          {data.outputUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.outputUrl} alt="cropped" className="h-24 w-full object-contain" />
          ) : (
            <div className="flex h-12 items-center justify-center text-[11px] text-ink-faint">
              No output yet
            </div>
          )}
        </div>
      </div>
    </NodeShell>
  );
}
