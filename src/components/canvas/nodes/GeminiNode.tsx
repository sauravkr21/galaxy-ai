"use client";

import { useState } from "react";
import { type NodeProps, type Node } from "@xyflow/react";
import { Sparkles, ChevronRight, ChevronDown } from "lucide-react";
import { GEMINI_MODELS, type GeminiData } from "@/types/flow";
import {
  connectedTargetHandles,
  useWorkflowStore,
} from "@/store/workflow-store";
import { NodeShell } from "./NodeShell";
import { FieldLabel, Port } from "./parts";
import { MediaUpload } from "../MediaUpload";
import { cn } from "@/lib/utils";

function ConnectedBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[34px] items-center rounded-lg border border-dashed border-violet-200 bg-violet-50 px-2 text-[11px] text-violet-600">
      {children}
    </div>
  );
}

const VISION_PORTS = [
  { id: "image", label: "Image (Vision)", type: "image" as const, accept: "image/*" },
  { id: "video", label: "Video", type: "video" as const, accept: "video/*" },
  { id: "audio", label: "Audio", type: "audio" as const, accept: "audio/*" },
  { id: "file", label: "File", type: "file" as const, accept: "*/*" },
];

export function GeminiNode({ id, data, selected }: NodeProps<Node<GeminiData>>) {
  const update = useWorkflowStore((s) => s.updateNodeData);
  const edges = useWorkflowStore((s) => s.edges);
  const connected = connectedTargetHandles(edges, id);
  const [showSettings, setShowSettings] = useState(false);

  const visionConnectedCount = VISION_PORTS.filter((p) =>
    connected.has(p.id),
  ).length;

  return (
    <NodeShell
      nodeId={id}
      title={data.label}
      icon={<Sparkles className="h-3.5 w-3.5" />}
      accent="#7c5cff"
      runState={data.runState}
      selected={selected}
      width={320}
      showRun
      headerExtra={
        <select
          value={data.model}
          onChange={(e) => update(id, { model: e.target.value })}
          className="nodrag mr-1 rounded-md border border-hairline bg-white px-1.5 py-0.5 text-[10px] font-medium text-ink-muted outline-none focus:border-violet-400"
        >
          {GEMINI_MODELS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      }
    >
      {/* Prompt (required) */}
      <div>
        <Port id="prompt" label="Prompt" type="text" side="left" connected={connected.has("prompt")} />
        <div className="mt-1">
          {connected.has("prompt") ? (
            <ConnectedBox>Prompt provided by upstream connection</ConnectedBox>
          ) : (
            <textarea
              className="nodrag h-16 w-full resize-none rounded-lg border border-hairline p-2 text-[12px] outline-none focus:border-violet-400"
              placeholder="Enter your prompt…"
              value={data.prompt}
              onChange={(e) => update(id, { prompt: e.target.value })}
            />
          )}
        </div>
      </div>

      {/* System prompt */}
      <div>
        <Port id="system_prompt" label="System Prompt" type="text" side="left" connected={connected.has("system_prompt")} />
        <div className="mt-1">
          {connected.has("system_prompt") ? (
            <ConnectedBox>System prompt provided by upstream connection</ConnectedBox>
          ) : (
            <textarea
              className="nodrag h-14 w-full resize-none rounded-lg border border-hairline p-2 text-[12px] outline-none focus:border-violet-400"
              placeholder="Optional system instruction…"
              value={data.systemPrompt}
              onChange={(e) => update(id, { systemPrompt: e.target.value })}
            />
          )}
        </div>
      </div>

      {/* Vision inputs */}
      <div className="flex flex-col gap-2">
        {VISION_PORTS.map((p) => {
          const isConnected = connected.has(p.id);
          const manual = data.vision[p.id as keyof typeof data.vision];
          return (
            <div key={p.id}>
              <Port id={p.id} label={p.label} type={p.type} side="left" connected={isConnected} />
              <div className="mt-1">
                {isConnected ? (
                  <ConnectedBox>Connected from upstream</ConnectedBox>
                ) : (
                  <MediaUpload
                    value={manual}
                    accept={p.accept}
                    label={`Upload ${p.id}`}
                    onChange={(url) =>
                      update(id, {
                        vision: { ...data.vision, [p.id]: url },
                      })
                    }
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Settings (collapsible) */}
      <div className="rounded-lg border border-hairline">
        <button
          onClick={() => setShowSettings((s) => !s)}
          className="nodrag flex w-full items-center gap-1 px-2 py-1.5 text-[11px] font-medium text-ink-muted"
        >
          {showSettings ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
          Settings
        </button>
        {showSettings && (
          <div className="flex flex-col gap-2 border-t border-hairline px-2 py-2">
            <Slider
              label="Temperature"
              min={0}
              max={2}
              step={0.05}
              value={data.settings.temperature}
              onChange={(v) =>
                update(id, { settings: { ...data.settings, temperature: v } })
              }
            />
            <Slider
              label="Top P"
              min={0}
              max={1}
              step={0.05}
              value={data.settings.topP}
              onChange={(v) =>
                update(id, { settings: { ...data.settings, topP: v } })
              }
            />
            <div>
              <FieldLabel>Max output tokens</FieldLabel>
              <input
                type="number"
                value={data.settings.maxOutputTokens}
                onChange={(e) =>
                  update(id, {
                    settings: {
                      ...data.settings,
                      maxOutputTokens: Number(e.target.value),
                    },
                  })
                }
                className="nodrag h-8 w-full rounded-md border border-hairline px-2 text-[12px] outline-none focus:border-violet-400"
              />
            </div>
          </div>
        )}
      </div>

      {/* Response output */}
      <div>
        <div className="flex items-center justify-end">
          <Port id="response" label="Response" type="text" side="right" />
        </div>
        <div
          className={cn(
            "mt-1 max-h-32 overflow-auto rounded-lg border border-hairline bg-ink/[0.03] p-2 text-[12px] leading-snug",
            data.response ? "text-ink" : "text-ink-faint",
          )}
        >
          {data.response || "No output yet"}
        </div>
        {visionConnectedCount > 0 && (
          <p className="mt-1 text-[10px] text-ink-faint">
            {visionConnectedCount} vision input
            {visionConnectedCount > 1 ? "s" : ""} connected
          </p>
        )}
      </div>
    </NodeShell>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <FieldLabel>{label}</FieldLabel>
        <span className="text-[10px] tabular-nums text-ink-muted">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="nodrag h-1 w-full accent-violet-500"
      />
    </div>
  );
}
