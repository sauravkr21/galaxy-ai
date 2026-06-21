"use client";

import { type NodeProps, type Node } from "@xyflow/react";
import { Crop, RotateCcw } from "lucide-react";
import type { CropImageData } from "@/types/flow";
import {
  connectedTargetHandles,
  useWorkflowStore,
} from "@/store/workflow-store";
import { NodeShell } from "./NodeShell";
import { AddToRequestButton, Port } from "./parts";
import { MediaUpload } from "../MediaUpload";

const PARAMS: {
  handle: string;
  label: string;
  key: "x" | "y" | "w" | "h";
  def: number;
  info: string;
}[] = [
  { handle: "x", label: "X Position (%)", key: "x", def: 0, info: "Horizontal offset of the crop, as a % of the source width. (placeholder — edit later)" },
  { handle: "y", label: "Y Position (%)", key: "y", def: 0, info: "Vertical offset of the crop, as a % of the source height. (placeholder — edit later)" },
  { handle: "width", label: "Width (%)", key: "w", def: 100, info: "Crop width as a % of the source width. (placeholder — edit later)" },
  { handle: "height", label: "Height (%)", key: "h", def: 100, info: "Crop height as a % of the source height. (placeholder — edit later)" },
];

export function CropImageNode({
  id,
  data,
  selected,
}: NodeProps<Node<CropImageData>>) {
  const update = useWorkflowStore((s) => s.updateNodeData);
  const edges = useWorkflowStore((s) => s.edges);
  const addRequestInput = useWorkflowStore((s) => s.addRequestInput);
  const connected = connectedTargetHandles(edges, id);
  const inputConnected = connected.has("input_image");

  return (
    <NodeShell
      nodeId={id}
      title={data.label}
      subtitle="Crops an image to Specified Dimensions"
      icon={<Crop className="h-3.5 w-3.5" />}
      accent="#0ea5e9"
      runState={data.runState}
      selected={selected}
      width={320}
      showRun
      cost="~0.005 M"
    >
      {/* Input image — label, upload and "+" inline on one row */}
      <div className="flex items-center gap-2">
        <Port id="input_image" label="Input Image" type="image" side="left" strong required connected={inputConnected} />
        {inputConnected ? (
          <div className="flex h-9 flex-1 items-center rounded-lg border border-dashed border-violet-200 bg-violet-50 px-2 text-[11px] text-violet-600">
            Image provided by upstream connection
          </div>
        ) : (
          <div className="flex-1">
            <MediaUpload
              value={data.imageUrl}
              onChange={(url) => update(id, { imageUrl: url })}
              label="Upload Image"
              addButton={
                <AddToRequestButton onClick={() => addRequestInput(id, "input_image", "image")} />
              }
            />
          </div>
        )}
      </div>

      {/* Crop parameters — label + info + slider + number + reset + "+" inline */}
      {PARAMS.map((p) => {
        const isConnected = connected.has(p.handle);
        const value = data[p.key];
        return (
          <div key={p.handle} className="flex items-center gap-1.5">
            <Port id={p.handle} label={p.label} type="any" side="left" strong info={p.info} connected={isConnected} />
            {isConnected ? (
              <div className="flex h-8 flex-1 items-center rounded-lg border border-dashed border-violet-200 bg-violet-50 px-2 text-[11px] text-violet-600">
                Provided by connection
              </div>
            ) : (
              <>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={value}
                  onChange={(e) => update(id, { [p.key]: Number(e.target.value) })}
                  className="nodrag h-1 min-w-0 flex-1 accent-violet-500"
                />
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={value}
                  onChange={(e) => update(id, { [p.key]: Number(e.target.value) })}
                  className="nodrag h-8 w-12 shrink-0 rounded-md border border-hairline px-1 text-[12px] outline-none focus:border-violet-400"
                />
                <button
                  onClick={() => update(id, { [p.key]: p.def })}
                  className="nodrag flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-hairline text-ink-faint hover:text-violet-600"
                  title="Reset"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
                <AddToRequestButton onClick={() => addRequestInput(id, p.handle, "number")} />
              </>
            )}
          </div>
        );
      })}

      {/* Output — label on the left, handle on the right */}
      <div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-ink">Output Image</span>
          <Port id="output" label="" type="image" side="right" />
        </div>
        <div className="mt-1 overflow-hidden rounded-lg border border-hairline bg-ink/5">
          {data.outputUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.outputUrl} alt="cropped" className="h-24 w-full object-contain" />
          ) : (
            <div className="flex h-16 items-center justify-center text-[11px] text-ink-faint">
              No output yet
            </div>
          )}
        </div>
      </div>
    </NodeShell>
  );
}
