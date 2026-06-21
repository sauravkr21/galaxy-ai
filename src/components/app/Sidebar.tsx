"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { UserButton, useUser, useClerk } from "@clerk/nextjs";
import { Plus, Workflow, Loader2, ChevronUp, LogOut, Settings, PanelLeftClose, PanelLeftOpen } from "lucide-react";
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
  const { user } = useUser();
  const { signOut } = useClerk();
  const [creating, setCreating] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const displayName =
    user?.fullName || user?.primaryEmailAddress?.emailAddress || "Account";

  // Ctrl/⌘ + .  toggles the sidebar (matches the reference shortcut).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === ".") {
        e.preventDefault();
        setCollapsed((c) => !c);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

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
    <aside
      className={cn(
        "flex h-screen shrink-0 flex-col border-r border-hairline bg-white transition-[width]",
        collapsed ? "w-[60px]" : "w-[240px]",
      )}
    >
      <div className={cn("flex items-center pb-3 pt-4", collapsed ? "justify-center px-2" : "justify-between px-4")}>
        {collapsed ? (
          // Collapsed: the logo IS the expand control — shows the logo, swaps to
          // a panel-open icon on hover, expands the sidebar on click.
          <button
            onClick={() => setCollapsed(false)}
            className="group relative flex h-7 w-7 items-center justify-center"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500 text-white transition-opacity group-hover:opacity-0">
              <Workflow className="h-4 w-4" />
            </span>
            <PanelLeftOpen className="absolute h-4 w-4 text-ink-muted opacity-0 transition-opacity group-hover:opacity-100" />
            <span className="pointer-events-none absolute left-full top-1/2 z-30 ml-2 flex -translate-y-1/2 items-center gap-2 whitespace-nowrap rounded-md border border-hairline bg-white px-2 py-1 text-[11px] text-ink opacity-0 shadow-pop transition-opacity group-hover:opacity-100">
              Open sidebar <kbd className="font-mono text-[10px] text-ink-faint">Ctrl .</kbd>
            </span>
          </button>
        ) : (
          <>
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500 text-white">
                <Workflow className="h-4 w-4" />
              </span>
              <span className="text-[17px] font-semibold tracking-tight text-ink">
                Galaxy.ai
              </span>
            </Link>
            <div className="group relative flex">
              <button
                onClick={() => setCollapsed(true)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-ink-faint hover:bg-ink/5"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
              <span className="pointer-events-none absolute right-0 top-full z-30 mt-2 flex items-center gap-2 whitespace-nowrap rounded-md border border-hairline bg-white px-2 py-1 text-[11px] text-ink opacity-0 shadow-pop transition-opacity group-hover:opacity-100">
                Close sidebar <kbd className="font-mono text-[10px] text-ink-faint">Ctrl .</kbd>
              </span>
            </div>
          </>
        )}
      </div>

      <div className="px-2">
        <button
          onClick={createBlank}
          disabled={creating}
          title="New Workflow"
          className={cn(
            "flex w-full items-center gap-2.5 rounded-lg py-2 text-[13px] font-medium text-ink-muted transition-colors hover:bg-ink/[0.04] hover:text-ink",
            collapsed ? "justify-center px-0" : "px-2.5",
          )}
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {!collapsed && "New Workflow"}
        </button>
      </div>

      <nav className="flex-1 px-2 py-1">
        <Link
          href="/dashboard"
          title="Flow"
          className={cn(
            "flex items-center gap-2.5 rounded-lg py-2 text-[13px] font-medium transition-colors",
            collapsed ? "justify-center px-0" : "px-2.5",
            flowActive
              ? "bg-violet-50 text-violet-700"
              : "text-ink-muted hover:bg-ink/[0.04] hover:text-ink",
          )}
        >
          <Workflow className="h-4 w-4" />
          {!collapsed && "Flow"}
        </Link>
      </nav>

      <div className="px-2 pb-2">
        {/* Collapsible drawer handle (the "^" slider above the account row) */}
        {!collapsed && drawerOpen && (
          <div className="mb-1 animate-fade-in rounded-lg border border-hairline p-1">
            {user?.primaryEmailAddress && (
              <p className="truncate px-2 py-1 text-[11px] text-ink-faint">
                {user.primaryEmailAddress.emailAddress}
              </p>
            )}
            <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] text-ink-muted hover:bg-ink/5">
              <Settings className="h-3.5 w-3.5" /> Settings
            </button>
            <button
              onClick={() => signOut(() => router.push("/sign-in"))}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        )}
        {!collapsed && (
          <button
            onClick={() => setDrawerOpen((o) => !o)}
            className="flex w-full items-center justify-center border-t border-hairline py-1 text-ink-faint hover:text-ink"
            aria-label={drawerOpen ? "Collapse" : "Expand"}
          >
            <ChevronUp className={cn("h-4 w-4 transition-transform", drawerOpen && "rotate-180")} />
          </button>
        )}
        <div className={cn("flex items-center gap-2 rounded-lg py-1.5", collapsed ? "justify-center px-0" : "px-1.5")}>
          <UserButton afterSignOutUrl="/sign-in" />
          {!collapsed && (
            <span className="truncate text-[13px] font-medium text-ink">{displayName}</span>
          )}
        </div>
      </div>
    </aside>
  );
}
