"use client";

import { type NodeProps, type Node } from "@xyflow/react";
import { Crop, RotateCcw } from "lucide-react";
import type { CropImageData } from "@/types/flow";
import {
  connectedTargetHandles,
  useWorkflowStore,
} from "@/store/workflow-store";
import { NodeShell } from "./NodeShell";
import { Port } from "./parts";
import { MediaUpload } from "../MediaUpload";
import { cn } from "@/lib/utils";

const PARAMS: { handle: string; label: string; key: "x" | "y" | "w" | "h"; def: number }[] = [
  { handle: "x", label: "X Position (%)", key: "x", def: 0 },
  { handle: "y", label: "Y Position (%)", key: "y", def: 0 },
  { handle: "width", label: "Width (%)", key: "w", def: 100 },
  { handle: "height", label: "Height (%)", key: "h", def: 100 },
];

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
      subtitle="Crops an image to a rectangle. Runs as a Trigger.dev task with a 30s+ delay."
      icon={<Crop className="h-3.5 w-3.5" />}
      accent="#0ea5e9"
      runState={data.runState}
      selected={selected}
      width={320}
      showRun
      cost="~0.005 M"
    >
      {/* Input image */}
      <div>
        <Port id="input_image" label="Input Image" type="image" side="left" connected={inputConnected} />
        <div className="mt-1">
          {inputConnected ? (
            <div className="flex h-9 items-center rounded-lg border border-dashed border-violet-200 bg-violet-50 px-2 text-[11px] text-violet-600">
              Image provided by upstream connection
            </div>
          ) : (
            <MediaUpload
              value={data.imageUrl}
              onChange={(url) => update(id, { imageUrl: url })}
              label="Upload Image"
            />
          )}
        </div>
      </div>

      {/* Crop parameters with sliders */}
      {PARAMS.map((p) => {
        const isConnected = connected.has(p.handle);
        const value = data[p.key];
        return (
          <div key={p.handle}>
            <div className="mb-1">
              <Port id={p.handle} label={p.label} type="any" side="left" connected={isConnected} />
            </div>
            {isConnected ? (
              <div className="flex h-8 items-center rounded-lg border border-dashed border-violet-200 bg-violet-50 px-2 text-[11px] text-violet-600">
                Provided by connection
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={value}
                  onChange={(e) => update(id, { [p.key]: Number(e.target.value) })}
                  className="nodrag h-1 flex-1 accent-violet-500"
                />
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={value}
                  onChange={(e) => update(id, { [p.key]: Number(e.target.value) })}
                  className="nodrag h-7 w-14 rounded-md border border-hairline px-1.5 text-[12px] outline-none focus:border-violet-400"
                />
                <button
                  onClick={() => update(id, { [p.key]: p.def })}
                  className="nodrag flex h-7 w-7 items-center justify-center rounded-md border border-hairline text-ink-faint hover:text-violet-600"
                  title="Reset"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Output */}
      <div>
        <div className="flex items-center justify-end">
          <Port id="output" label="Output Image" type="image" side="right" />
        </div>
        <div className="mt-1 overflow-hidden rounded-lg border border-hairline bg-ink/5">
          {data.outputUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.outputUrl} alt="cropped" className="h-24 w-full object-contain" />
          ) : (
            <div className={cn("flex h-16 items-center justify-center text-[11px] text-ink-faint")}>
              No output yet
            </div>
          )}
        </div>
      </div>
    </NodeShell>
  );
}
