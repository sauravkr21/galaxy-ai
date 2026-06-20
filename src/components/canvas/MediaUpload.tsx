"use client";

import { useRef, useState } from "react";
import { Upload, X, Image as ImageIcon, Loader2, Link2 } from "lucide-react";
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
  const [pasting, setPasting] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const url = await uploadToTransloadit(file);
      onChange(url);
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
    <div className="nodrag">
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
      {pasting ? (
        <div className="flex items-center gap-1.5">
          <input
            autoFocus
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            placeholder="https://…"
            className="h-8 flex-1 rounded-md border border-hairline px-2 text-[12px] outline-none focus:border-violet-400"
          />
          <button
            onClick={() => {
              if (urlDraft.trim()) onChange(urlDraft.trim());
              setPasting(false);
              setUrlDraft("");
            }}
            className="h-8 rounded-md bg-violet-500 px-2 text-[12px] font-medium text-white"
          >
            Set
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <button
            disabled={disabled || busy}
            onClick={() => inputRef.current?.click()}
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
            disabled={disabled}
            onClick={() => setPasting(true)}
            title="Paste a URL"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-hairline text-ink-muted hover:text-violet-600"
          >
            <Link2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {error && <p className="mt-1 text-[11px] text-red-500">{error}</p>}
    </div>
  );
}
