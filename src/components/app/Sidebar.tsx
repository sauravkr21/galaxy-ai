"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { UserButton } from "@clerk/nextjs";
import { Plus, Workflow, Loader2 } from "lucide-react";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/utils";

/**
 * Minimal in-scope sidebar. The brief limits the app to three surfaces
 * (auth, dashboard, canvas) with no other pages, so the nav only exposes
 * Flow (the workflows dashboard) plus the New Workflow action — no marketing
 * or out-of-scope items.
 */
export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [creating, setCreating] = useState(false);

  const flowActive =
    pathname === "/dashboard" || pathname.startsWith("/workflow");

  async function createBlank() {
    setCreating(true);
    try {
      const { id } = await api.createWorkflow({ name: "New Workflow" });
      router.push(`/workflow/${id}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <aside className="flex h-screen w-[240px] shrink-0 flex-col border-r border-hairline bg-white">
      <div className="px-4 pb-3 pt-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500 text-white">
            <Workflow className="h-4 w-4" />
          </span>
          <span className="text-[17px] font-semibold tracking-tight text-ink">
            Galaxy.ai
          </span>
        </Link>
      </div>

      <div className="px-2">
        <button
          onClick={createBlank}
          disabled={creating}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-ink-muted transition-colors hover:bg-ink/[0.04] hover:text-ink"
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          New Workflow
        </button>
      </div>

      <nav className="flex-1 px-2 py-1">
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
            flowActive
              ? "bg-violet-50 text-violet-700"
              : "text-ink-muted hover:bg-ink/[0.04] hover:text-ink",
          )}
        >
          <Workflow className="h-4 w-4" />
          Flow
        </Link>
      </nav>

      <div className="border-t border-hairline p-2">
        <div className="flex items-center gap-2 rounded-lg px-1.5 py-1.5">
          <UserButton afterSignOutUrl="/sign-in" />
          <span className="truncate text-[13px] font-medium text-ink">Account</span>
        </div>
      </div>
    </aside>
  );
}
