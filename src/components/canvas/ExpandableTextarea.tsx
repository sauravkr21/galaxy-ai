"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Maximize2, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** A textarea with an expand control that opens a large editing modal
 *  (rendered to <body> so it escapes the React Flow zoom transform). */
export function ExpandableTextarea({
  value,
  onChange,
  placeholder,
  title,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** Heading shown in the expanded modal. */
  title: string;
  /** Extra classes (e.g. height) for the inline textarea. */
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="relative">
      <textarea
        className={cn(
          "nodrag w-full resize-none rounded-lg border border-hairline p-2 pr-8 text-[12px] outline-none focus:border-violet-400",
          className,
        )}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Expand"
        aria-label="Expand"
        className="nodrag absolute bottom-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded text-ink-faint transition-colors hover:bg-ink/5 hover:text-violet-600"
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </button>

      {open &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4"
            onClick={() => setOpen(false)}
          >
            <div
              className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-pop"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[14px] font-semibold text-ink">{title}</h3>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-ink-muted hover:bg-ink/5"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <textarea
                autoFocus
                className="h-64 w-full resize-none rounded-xl border border-hairline p-3 text-[13px] leading-relaxed outline-none focus:border-violet-400"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
              />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
