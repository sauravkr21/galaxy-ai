"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  Plus,
  Upload,
  Sparkles,
  MoreVertical,
  Pencil,
  Trash2,
  Loader2,
  Workflow as WorkflowIcon,
  Search,
  ExternalLink,
  Files,
  Download,
  ImagePlus,
  Image as ImageIcon,
} from "lucide-react";
import { api } from "@/lib/client-api";
import { buildSampleGraph, SAMPLE_WORKFLOW_NAME } from "@/lib/sample-workflow";
import { importWorkflowJson, exportWorkflowJson } from "@/lib/workflow-io";
import { uploadFile } from "@/lib/upload-client";
import { cn } from "@/lib/utils";
import type { WorkflowSummary } from "@/types/flow";
import { useRef } from "react";

// A small built-in asset library for "Select Asset" (no asset backend needed).
const ASSET_LIBRARY = [
  "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=70",
  "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&q=70",
  "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=70",
  "https://images.unsplash.com/photo-1551434678-e076c223a692?w=400&q=70",
  "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&q=70",
  "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400&q=70",
];

export function DashboardClient({ initial }: { initial: WorkflowSummary[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(
    () =>
      items.filter((w) =>
        w.name.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [items, query],
  );

  async function createBlank() {
    setBusy("blank");
    try {
      const { id } = await api.createWorkflow({ name: "New Workflow" });
      router.push(`/workflow/${id}`);
    } finally {
      setBusy(null);
    }
  }

  async function createSample() {
    setBusy("sample");
    try {
      const { id } = await api.createWorkflow({
        name: SAMPLE_WORKFLOW_NAME,
        graph: buildSampleGraph(),
      });
      router.push(`/workflow/${id}`);
    } finally {
      setBusy(null);
    }
  }

  async function handleImport(file: File) {
    setBusy("import");
    try {
      const { name, graph } = await importWorkflowJson(file);
      const { id } = await api.createWorkflow({ name: name ?? "Imported workflow", graph });
      router.push(`/workflow/${id}`);
    } catch {
      setBusy(null);
    }
  }

  async function rename(item: WorkflowSummary) {
    const name = window.prompt("Rename workflow", item.name);
    if (!name || name === item.name) return;
    await api.updateWorkflow(item.id, { name });
    setItems((xs) => xs.map((x) => (x.id === item.id ? { ...x, name } : x)));
  }

  async function remove(item: WorkflowSummary) {
    if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    await api.deleteWorkflow(item.id);
    setItems((xs) => xs.filter((x) => x.id !== item.id));
  }

  async function duplicate(item: WorkflowSummary) {
    const { graph } = await api.getWorkflow(item.id);
    await api.createWorkflow({ name: `${item.name} Copy`, graph });
    setItems(await api.listWorkflows());
  }

  async function exportJson(item: WorkflowSummary) {
    const { name, graph } = await api.getWorkflow(item.id);
    exportWorkflowJson(name, graph);
  }

  async function setThumbnail(item: WorkflowSummary, url: string) {
    await api.updateWorkflow(item.id, { thumbnailUrl: url });
    setItems((xs) => xs.map((x) => (x.id === item.id ? { ...x, thumbnailUrl: url } : x)));
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-8 py-8">
      {/* Header row */}
      <div className="mb-7 flex items-start justify-between">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-ink">Flow</h1>
          <p className="mt-0.5 text-[13px] text-ink-muted">
            Build workflows or run modules directly.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImport(f);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy !== null}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-hairline bg-white px-3 text-[13px] font-medium text-ink-muted shadow-sm hover:bg-ink/[0.03]"
          >
            <Upload className="h-3.5 w-3.5" /> Import
          </button>
          <button
            onClick={createBlank}
            disabled={busy !== null}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink text-white hover:bg-ink/90"
            title="New workflow"
          >
            {busy === "blank" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* System Workflows (templates) */}
      <section className="mb-8">
        <h2 className="text-[15px] font-semibold text-ink">System Workflows</h2>
        <p className="mb-3 text-[12px] text-ink-muted">
          Prebuilt workflow templates — click to open and start using.
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <TemplateCard
            title={SAMPLE_WORKFLOW_NAME}
            subtitle="Product marketing post"
            loading={busy === "sample"}
            onClick={createSample}
          />
        </div>
      </section>

      {/* Your Workflows */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">Your Workflows</h2>
            <p className="text-[12px] text-ink-muted">
              Open, rename, run and rerun history.
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search workflows..."
              className="h-9 w-56 rounded-lg border border-hairline bg-white pl-8 pr-3 text-[13px] outline-none focus:border-violet-400"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-hairline bg-white py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-500">
              <WorkflowIcon className="h-6 w-6" />
            </div>
            <h3 className="text-[14px] font-semibold text-ink">
              {query ? "No matching workflows" : "No workflows yet"}
            </h3>
            <p className="mt-1 max-w-xs text-[12px] text-ink-muted">
              {query
                ? "Try a different search."
                : "Create one from scratch, or open the sample template above."}
            </p>
            {!query && (
              <button
                onClick={createBlank}
                className="mt-4 flex h-9 items-center gap-1.5 rounded-lg bg-violet-500 px-4 text-[13px] font-semibold text-white shadow-pop hover:bg-violet-600"
              >
                <Plus className="h-4 w-4" /> New Workflow
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((item) => (
              <WorkflowCard
                key={item.id}
                item={item}
                onOpen={() => router.push(`/workflow/${item.id}`)}
                onRename={() => rename(item)}
                onDuplicate={() => duplicate(item)}
                onExport={() => exportJson(item)}
                onDelete={() => remove(item)}
                onSetThumbnail={(url) => setThumbnail(item, url)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Thumb({ src, children }: { src?: string | null; children?: React.ReactNode }) {
  return (
    <div className="relative flex aspect-[16/10] w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-violet-500 via-violet-600 to-indigo-700">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="thumbnail" className="h-full w-full object-cover" />
      ) : (
        <WorkflowIcon className="h-8 w-8 text-white/80" />
      )}
      {children}
    </div>
  );
}

function TemplateCard({
  title,
  subtitle,
  loading,
  onClick,
}: {
  title: string;
  subtitle: string;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="group flex flex-col text-left">
      <Thumb>
        <span className="absolute left-2 top-2 flex items-center gap-1 rounded-pill bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          Template
        </span>
      </Thumb>
      <h3 className="mt-2 truncate text-[13px] font-medium text-ink">
        {title}
      </h3>
      <p className="text-[11px] text-ink-faint">{subtitle}</p>
    </button>
  );
}

function WorkflowCard({
  item,
  onOpen,
  onRename,
  onDuplicate,
  onExport,
  onDelete,
  onSetThumbnail,
}: {
  item: WorkflowSummary;
  onOpen: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  onDelete: () => void;
  onSetThumbnail: (url: string) => void;
}) {
  const [menu, setMenu] = useState(false);
  const [thumbOpen, setThumbOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function openThumb() {
    setLibraryOpen(false);
    setThumbOpen((o) => !o);
  }
  const MENU = [
    { label: "Open", icon: <ExternalLink className="h-3.5 w-3.5" />, fn: onOpen },
    { label: "Rename", icon: <Pencil className="h-3.5 w-3.5" />, fn: onRename },
    { label: "Duplicate", icon: <Files className="h-3.5 w-3.5" />, fn: onDuplicate },
    { label: "Export JSON", icon: <Download className="h-3.5 w-3.5" />, fn: onExport },
  ];

  async function pickFile(file: File) {
    setUploading(true);
    try {
      const url = await uploadFile(file);
      onSetThumbnail(url);
      setThumbOpen(false);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="group relative flex flex-col">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) pickFile(f);
          e.target.value = "";
        }}
      />
      <div onClick={onOpen} className="flex cursor-pointer flex-col text-left">
        <Thumb src={item.thumbnailUrl}>
          {/* Edit thumbnail control */}
          <span
            role="button"
            onClick={(e) => { e.stopPropagation(); openThumb(); }}
            className="group/edit absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-md bg-white/90 text-ink-muted opacity-0 shadow-sm transition-opacity hover:text-violet-600 group-hover:opacity-100"
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
            <span className="pointer-events-none absolute left-full top-1/2 z-30 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-hairline bg-white px-2 py-1 text-[10px] font-medium text-ink opacity-0 shadow-pop transition-opacity group-hover/edit:opacity-100">
              Edit thumbnail
            </span>
          </span>
          {thumbOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setThumbOpen(false); }} />
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute left-2 top-11 z-20 w-64 animate-fade-in rounded-xl border border-hairline bg-white p-3 text-left shadow-pop"
              >
                <p className="mb-2.5 text-[12px] leading-snug text-ink-muted">
                  Add a file from your device or select one from your library
                </p>
                <button
                  onClick={() => setLibraryOpen((o) => !o)}
                  className={cn(
                    "mb-2 flex w-full items-center justify-center gap-2 rounded-lg border py-2 text-[13px] font-medium text-ink hover:bg-ink/[0.03]",
                    libraryOpen ? "border-violet-300 bg-violet-50/40" : "border-hairline bg-white",
                  )}
                >
                  <ImageIcon className="h-4 w-4" /> Select Asset
                </button>
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-500 py-2 text-[13px] font-semibold text-white hover:bg-violet-600 disabled:opacity-60"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Upload
                </button>
                {libraryOpen && (
                  <div className="mt-2.5 border-t border-hairline pt-2.5">
                    <p className="mb-1.5 text-[11px] font-medium text-ink-muted">Your library</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {ASSET_LIBRARY.map((url) => (
                        <button
                          key={url}
                          onClick={() => { onSetThumbnail(url); setThumbOpen(false); }}
                          className="aspect-square overflow-hidden rounded-md border border-hairline hover:ring-2 hover:ring-violet-400"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="asset" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </Thumb>
        <h3 className="mt-2 truncate text-[13px] font-medium text-ink">
          {item.name}
        </h3>
        <p className="text-[11px] text-ink-faint">
          Edited {formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}
        </p>
      </div>
      <div className="absolute right-1.5 top-1.5">
        <button
          onClick={() => setMenu((o) => !o)}
          className="flex h-7 w-7 items-center justify-center rounded-md bg-white/90 text-ink-muted opacity-0 shadow-sm transition-opacity hover:bg-white group-hover:opacity-100"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        {menu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
            <div className="absolute right-0 top-8 z-20 w-40 animate-fade-in rounded-lg border border-hairline bg-white p-1 shadow-pop">
              {MENU.map((m) => (
                <button
                  key={m.label}
                  onClick={() => { setMenu(false); m.fn(); }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] text-ink hover:bg-ink/5"
                >
                  {m.icon} {m.label}
                </button>
              ))}
              <div className="my-1 h-px bg-hairline" />
              <button
                onClick={() => { setMenu(false); onDelete(); }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
