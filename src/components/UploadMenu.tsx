"use client";

import { useRef, useState } from "react";
import { ImagePlus, Plus, Loader2 } from "lucide-react";
import { uploadFile } from "@/lib/upload-client";

/**
 * The shared upload popover body: "upload from device" or "select asset"
 * (paste a URL). Used by the canvas MediaUpload control and the dashboard
 * thumbnail picker so both look and behave identically.
 */
export function UploadMenu({
  accept = "image/*",
  onSelect,
  onClose,
}: {
  accept?: string;
  onSelect: (url: string) => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectingAsset, setSelectingAsset] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const url = await uploadFile(file);
      onSelect(url);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="h-[172px] w-[228px] rounded-xl border border-hairline bg-white p-3 shadow-pop">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
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
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-violet-600 text-[13px] font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-60"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" /> Upload
              </>
            )}
          </button>
          {error && <p className="mt-2 text-[11px] text-red-500">{error}</p>}
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
                onSelect(urlDraft.trim());
                onClose();
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
                onSelect(urlDraft.trim());
                onClose();
              }}
              className="h-9 flex-1 rounded-lg bg-violet-600 text-[12px] font-medium text-white disabled:opacity-50"
            >
              Select
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
