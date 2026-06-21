"use client";

import { useState } from "react";
import { Upload, X, Image as ImageIcon, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { UploadMenu } from "@/components/UploadMenu";

export function MediaUpload({
  value,
  onChange,
  label = "Upload image",
  accept = "image/*",
  disabled,
  addButton,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  accept?: string;
  disabled?: boolean;
  /** Replaces the default "add media" plus (e.g. an "Add to request" control). */
  addButton?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

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
      <div className="flex items-center gap-1.5">
        <button
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
          className={cn(
            "flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-dashed border-hairline text-[12px] font-medium text-ink-muted transition-colors hover:border-violet-300 hover:text-violet-600",
            disabled && "cursor-not-allowed opacity-60",
          )}
        >
          <Upload className="h-3.5 w-3.5" /> {label}
        </button>
        {addButton ?? (
          <button
            disabled={disabled}
            onClick={() => setOpen((current) => !current)}
            title="Add media"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-hairline text-ink-muted hover:bg-ink/[0.03] hover:text-violet-600"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close upload menu"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-4 top-[43px] z-50">
            <UploadMenu
              accept={accept}
              onSelect={(url) => onChange(url)}
              onClose={() => setOpen(false)}
            />
          </div>
        </>
      )}
    </div>
  );
}
