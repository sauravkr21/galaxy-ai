"use client";

import { useRef, useState } from "react";
import {
  Upload,
  X,
  Image as ImageIcon,
  ImagePlus,
  Loader2,
  Plus,
} from "lucide-react";
import { uploadToTransloadit } from "@/lib/upload-client";
import { cn } from "@/lib/utils";

export function MediaUpload({
  value,
  onChange,
  label = "Upload image",
  accept = "image/*",
  disabled,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  accept?: string;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [selectingAsset, setSelectingAsset] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const url = await uploadToTransloadit(file);
      onChange(url);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  if (value) {
    const isImage = accept.startsWith("image");
    return (
      <div className="nodrag relative overflow-hidden rounded-lg border border-hairline bg-ink/5">
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="upload" className="h-28 w-full object-cover" />
        ) : (
          <div className="flex h-16 items-center gap-2 px-3 text-[12px] text-ink-muted">
            <ImageIcon className="h-4 w-4" /> Uploaded
          </div>
        )}
        {!disabled && (
          <button
            onClick={() => onChange(null)}
            className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md bg-black/50 text-white hover:bg-black/70"
            aria-label="Remove"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="nodrag relative">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
      <div className="flex items-center gap-1.5">
        <button
          disabled={disabled || busy}
          onClick={() => {
            setOpen((current) => !current);
            setSelectingAsset(false);
            setError(null);
          }}
          className={cn(
            "flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-dashed border-hairline text-[12px] font-medium text-ink-muted transition-colors hover:border-violet-300 hover:text-violet-600",
            (disabled || busy) && "cursor-not-allowed opacity-60",
          )}
        >
          {busy ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
            </>
          ) : (
            <>
              <Upload className="h-3.5 w-3.5" /> {label}
            </>
          )}
        </button>
        <button
          disabled={disabled || busy}
          onClick={() => {
            setOpen((current) => !current);
            setSelectingAsset(false);
            setError(null);
          }}
          title="Add media"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-hairline text-ink-muted hover:bg-ink/[0.03] hover:text-violet-600"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close upload menu"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-4 top-[43px] z-50 h-[172px] w-[228px] rounded-xl border border-hairline bg-white p-3 shadow-pop">
            {!selectingAsset ? (
              <>
                <p className="h-9 text-[12px] leading-[17px] text-ink">
                  Add a file from your device or select one from your library
                </p>
                <button
                  type="button"
                  onClick={() => setSelectingAsset(true)}
                  className="mt-1 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-hairline bg-white text-[12px] font-medium text-ink transition-colors hover:bg-ink/[0.03]"
                >
                  <ImagePlus className="h-4 w-4" /> Select Asset
                </button>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-violet-600 text-[13px] font-medium text-white transition-colors hover:bg-violet-700"
                >
                  <Plus className="h-4 w-4" /> Upload
                </button>
              </>
            ) : (
              <div className="flex h-full flex-col">
                <p className="text-[12px] leading-[17px] text-ink">
                  Paste a URL from your asset library
                </p>
                <input
                  autoFocus
                  value={urlDraft}
                  onChange={(e) => setUrlDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && urlDraft.trim()) {
                      onChange(urlDraft.trim());
                      setOpen(false);
                      setUrlDraft("");
                    }
                  }}
                  placeholder="https://…"
                  className="mt-3 h-10 w-full rounded-lg border border-hairline px-2 text-[12px] outline-none focus:border-violet-400"
                />
                <div className="mt-auto flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectingAsset(false)}
                    className="h-9 flex-1 rounded-lg border border-hairline text-[12px] text-ink-muted hover:bg-ink/[0.03]"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={!urlDraft.trim()}
                    onClick={() => {
                      onChange(urlDraft.trim());
                      setOpen(false);
                      setUrlDraft("");
                    }}
                    className="h-9 flex-1 rounded-lg bg-violet-600 text-[12px] font-medium text-white disabled:opacity-50"
                  >
                    Select
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
      {error && <p className="mt-1 text-[11px] text-red-500">{error}</p>}
    </div>
  );
}
