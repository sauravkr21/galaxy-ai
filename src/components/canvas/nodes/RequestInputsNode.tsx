"use client";

import { useState } from "react";
import { type NodeProps, type Node } from "@xyflow/react";
import { Inbox, Plus, Trash2, Type, ImageIcon, Pencil } from "lucide-react";
import { nanoid } from "nanoid";
import type { RequestField, RequestInputsData } from "@/types/flow";
import { useWorkflowStore } from "@/store/workflow-store";
import { NodeShell } from "./NodeShell";
import { Port } from "./parts";
import { MediaUpload } from "../MediaUpload";

export function RequestInputsNode({
  id,
  data,
  selected,
}: NodeProps<Node<RequestInputsData>>) {
  const update = useWorkflowStore((s) => s.updateNodeData);
  const edges = useWorkflowStore((s) => s.edges);
  const onEdgesChange = useWorkflowStore((s) => s.onEdgesChange);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const fields = data.fields ?? [];

  function patchFields(next: RequestField[]) {
    update(id, { fields: next });
  }

  function addField(type: "text" | "image") {
    const base = type === "text" ? "text_field" : "image_field";
    const existing = fields.filter((f) => f.name.startsWith(base)).length;
    const name = existing === 0 ? base : `${base}_${existing + 1}`;
    patchFields([
      ...fields,
      { id: `f_${nanoid(6)}`, name, type, value: type === "image" ? null : "" },
    ]);
    setAddOpen(false);
  }

  function setField(fieldId: string, patch: Partial<RequestField>) {
    patchFields(fields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)));
  }

  function removeField(fieldId: string) {
    patchFields(fields.filter((f) => f.id !== fieldId));
    const drop = edges
      .filter((e) => e.source === id && e.sourceHandle === fieldId)
      .map((e) => ({ id: e.id, type: "remove" as const }));
    if (drop.length) onEdgesChange(drop);
  }

  return (
    <NodeShell
      nodeId={id}
      title={data.label}
      subtitle="Define the input fields for your workflow. These become the request parameters when running via API."
      icon={<Inbox className="h-3.5 w-3.5" />}
      accent="#1a1a23"
      runState={data.runState}
      selected={selected}
      deletable={false}
    >
      {fields.map((f) => (
        <div key={f.id}>
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-1">
              {f.type === "text" ? (
                <Type className="h-3 w-3 shrink-0 text-ink-faint" />
              ) : (
                <ImageIcon className="h-3 w-3 shrink-0 text-violet-500" />
              )}
              {editing === f.id ? (
                <input
                  autoFocus
                  value={f.name}
                  onChange={(e) => setField(f.id, { name: e.target.value })}
                  onBlur={() => setEditing(null)}
                  onKeyDown={(e) => e.key === "Enter" && setEditing(null)}
                  className="nodrag w-28 bg-transparent text-[11px] font-medium text-ink outline-none"
                />
              ) : (
                <button
                  onClick={() => setEditing(f.id)}
                  className="nodrag group/name flex items-center gap-1 text-[11px] font-medium text-ink-muted"
                  title="Rename field"
                >
                  {f.name}
                  <Pencil className="h-2.5 w-2.5 opacity-0 group-hover/name:opacity-60" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => removeField(f.id)}
                className="nodrag flex h-5 w-5 items-center justify-center rounded text-ink-faint hover:bg-red-50 hover:text-red-600"
                title="Remove field"
              >
                <Trash2 className="h-3 w-3" />
              </button>
              {/* Each field exposes its own output handle. */}
              <Port id={f.id} label="" type={f.type} side="right" />
            </div>
          </div>
          <div className="mt-1">
            {f.type === "text" ? (
              <textarea
                className="nodrag h-16 w-full resize-none rounded-lg border border-hairline bg-white p-2 text-[12px] leading-snug text-ink outline-none focus:border-violet-400"
                placeholder="Enter a value…"
                value={f.value ?? ""}
                onChange={(e) => setField(f.id, { value: e.target.value })}
              />
            ) : (
              <MediaUpload
                value={f.value}
                onChange={(url) => setField(f.id, { value: url })}
              />
            )}
          </div>
        </div>
      ))}

      {/* Add field */}
      <div className="relative">
        <button
          onClick={() => setAddOpen((o) => !o)}
          className="nodrag flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-hairline py-1.5 text-[12px] font-medium text-ink-muted hover:border-violet-300 hover:text-violet-600"
        >
          <Plus className="h-3.5 w-3.5" /> Add a request
        </button>
        {addOpen && (
          <>
            <div className="fixed inset-0 z-0" onClick={() => setAddOpen(false)} />
            <div className="absolute bottom-full left-0 z-10 mb-1 w-full animate-fade-in rounded-lg border border-hairline bg-white p-1 shadow-pop">
              <button
                onClick={() => addField("text")}
                className="nodrag flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] text-ink hover:bg-ink/5"
              >
                <Type className="h-3.5 w-3.5" /> Text field
              </button>
              <button
                onClick={() => addField("image")}
                className="nodrag flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] text-ink hover:bg-ink/5"
              >
                <ImageIcon className="h-3.5 w-3.5" /> Image field
              </button>
            </div>
          </>
        )}
      </div>
    </NodeShell>
  );
}
