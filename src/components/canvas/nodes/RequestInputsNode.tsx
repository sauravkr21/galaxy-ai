"use client";

import { useState } from "react";
import { type NodeProps, type Node } from "@xyflow/react";
import {
  Inbox,
  Plus,
  Trash2,
  Copy,
  GripVertical,
  AlignLeft,
  Hash,
  Check,
  Image as ImageIcon,
  Music,
  Video,
  FileAudio,
  File as FileIcon,
} from "lucide-react";
import { nanoid } from "nanoid";
import type { RequestField, RequestFieldType, RequestInputsData } from "@/types/flow";
import { useWorkflowStore } from "@/store/workflow-store";
import { NodeShell } from "./NodeShell";
import { Port } from "./parts";
import { MediaUpload } from "../MediaUpload";

const FIELD_TYPES: { type: RequestFieldType; label: string; icon: React.ReactNode }[] = [
  { type: "text", label: "Text", icon: <AlignLeft className="h-3.5 w-3.5" /> },
  { type: "number", label: "Number", icon: <Hash className="h-3.5 w-3.5" /> },
  { type: "boolean", label: "Boolean", icon: <Check className="h-3.5 w-3.5" /> },
  { type: "image", label: "Image", icon: <ImageIcon className="h-3.5 w-3.5" /> },
  { type: "audio", label: "Audio", icon: <Music className="h-3.5 w-3.5" /> },
  { type: "video", label: "Video", icon: <Video className="h-3.5 w-3.5" /> },
  { type: "media", label: "Media", icon: <FileAudio className="h-3.5 w-3.5" /> },
  { type: "file", label: "File", icon: <FileIcon className="h-3.5 w-3.5" /> },
];

const PORT_TYPE: Record<RequestFieldType, "text" | "image" | "audio" | "video" | "file" | "any"> = {
  text: "text",
  number: "any",
  boolean: "any",
  image: "image",
  audio: "audio",
  video: "video",
  media: "any",
  file: "file",
};

const ACCEPT: Partial<Record<RequestFieldType, string>> = {
  image: "image/*",
  audio: "audio/*",
  video: "video/*",
  media: "image/*,video/*,audio/*",
  file: "*/*",
};

export function RequestInputsNode({ id, data, selected }: NodeProps<Node<RequestInputsData>>) {
  const update = useWorkflowStore((s) => s.updateNodeData);
  const edges = useWorkflowStore((s) => s.edges);
  const onEdgesChange = useWorkflowStore((s) => s.onEdgesChange);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const fields = data.fields ?? [];
  const set = (next: RequestField[]) => update(id, { fields: next });

  function addField(type: RequestFieldType) {
    const base = `${type}_field`;
    const count = fields.filter((f) => f.name.startsWith(base)).length;
    const name = count === 0 ? base : `${base}_${count + 1}`;
    set([...fields, { id: `f_${nanoid(6)}`, name, type, value: type === "boolean" ? "false" : type === "text" || type === "number" ? "" : null }]);
    setAddOpen(false);
  }

  function patch(fieldId: string, p: Partial<RequestField>) {
    set(fields.map((f) => (f.id === fieldId ? { ...f, ...p } : f)));
  }

  function duplicateField(f: RequestField) {
    set([...fields, { ...f, id: `f_${nanoid(6)}`, name: `${f.name}_copy` }]);
  }

  function removeField(fieldId: string) {
    set(fields.filter((f) => f.id !== fieldId));
    const drop = edges
      .filter((e) => e.source === id && e.sourceHandle === fieldId)
      .map((e) => ({ id: e.id, type: "remove" as const }));
    if (drop.length) onEdgesChange(drop);
  }

  return (
    <NodeShell
      nodeId={id}
      title={data.label}
      subtitle="Define the input fields for your workflow. These become the request parameters when running via Playground or API."
      icon={<Inbox className="h-3.5 w-3.5" />}
      accent="#1a1a23"
      runState={data.runState}
      selected={selected}
      showMenu={false}
      headerExtra={
        <div className="relative">
          <button
            onClick={() => setAddOpen((o) => !o)}
            className="nodrag flex h-6 w-6 items-center justify-center rounded-md border border-hairline text-ink-muted hover:bg-ink/5"
            title="Add field"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          {addOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setAddOpen(false)} />
              <div className="absolute right-0 top-7 z-20 w-36 animate-fade-in rounded-lg border border-hairline bg-white p-1 shadow-pop">
                {FIELD_TYPES.map((t) => (
                  <button
                    key={t.type}
                    onClick={() => addField(t.type)}
                    className="nodrag flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] text-ink hover:bg-ink/5"
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      }
    >
      {fields.map((f) => (
        <div key={f.id}>
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-1">
              <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-ink-faint" />
              {editing === f.id ? (
                <input
                  autoFocus
                  value={f.name}
                  onChange={(e) => patch(f.id, { name: e.target.value })}
                  onBlur={() => setEditing(null)}
                  onKeyDown={(e) => e.key === "Enter" && setEditing(null)}
                  className="nodrag w-28 bg-transparent text-[11px] font-semibold text-ink outline-none"
                />
              ) : (
                <button
                  onClick={() => setEditing(f.id)}
                  className="nodrag truncate text-[11px] font-semibold text-ink"
                  title="Rename field"
                >
                  {f.name}
                </button>
              )}
            </div>
            <div className="flex items-center gap-0.5">
              <button onClick={() => duplicateField(f)} className="nodrag flex h-5 w-5 items-center justify-center rounded text-ink-faint hover:bg-ink/5" title="Duplicate field">
                <Copy className="h-3 w-3" />
              </button>
              <button onClick={() => removeField(f.id)} className="nodrag flex h-5 w-5 items-center justify-center rounded text-ink-faint hover:bg-red-50 hover:text-red-600" title="Remove field">
                <Trash2 className="h-3 w-3" />
              </button>
              <Port id={f.id} label="" type={PORT_TYPE[f.type]} side="right" />
            </div>
          </div>
          <div className="mt-1">{renderEditor(f, (v) => patch(f.id, { value: v }))}</div>
        </div>
      ))}

      {fields.length === 0 && (
        <p className="py-2 text-center text-[11px] text-ink-faint">
          Use + to add a request field.
        </p>
      )}
    </NodeShell>
  );
}

function renderEditor(f: RequestField, onChange: (v: string | null) => void) {
  if (f.type === "text" || f.type === "number") {
    return f.type === "number" ? (
      <input
        type="number"
        value={f.value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className="nodrag h-8 w-full rounded-lg border border-hairline px-2 text-[12px] outline-none focus:border-violet-400"
      />
    ) : (
      <textarea
        value={f.value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter a value…"
        className="nodrag h-16 w-full resize-none rounded-lg border border-hairline p-2 text-[12px] leading-snug outline-none focus:border-violet-400"
      />
    );
  }
  if (f.type === "boolean") {
    const on = f.value === "true";
    return (
      <button
        onClick={() => onChange(on ? "false" : "true")}
        className={`nodrag flex h-6 w-11 items-center rounded-full px-0.5 transition-colors ${on ? "bg-violet-500" : "bg-ink/15"}`}
      >
        <span className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : ""}`} />
      </button>
    );
  }
  return <MediaUpload value={f.value} accept={ACCEPT[f.type]} label={`Upload ${f.type}`} onChange={onChange} />;
}
