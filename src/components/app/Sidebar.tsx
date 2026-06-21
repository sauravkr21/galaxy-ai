"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { UserButton, useUser, useClerk } from "@clerk/nextjs";
import {
  Plus,
  Search,
  MessageSquare,
  FolderClosed,
  Library,
  Workflow,
  Boxes,
  BookOpen,
  Sparkles,
  ChevronUp,
  LogOut,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Visual nav mirrors the reference. Only "Flow" routes (the in-scope dashboard);
// the rest are presentational placeholders so the layout matches Magica.
const NAV: { label: string; icon: React.ReactNode; href?: string }[] = [
  { label: "New task", icon: <Plus className="h-[18px] w-[18px]" /> },
  { label: "Search Task", icon: <Search className="h-[18px] w-[18px]" /> },
  { label: "Task", icon: <MessageSquare className="h-[18px] w-[18px]" /> },
  { label: "Projects", icon: <FolderClosed className="h-[18px] w-[18px]" /> },
  { label: "Library", icon: <Library className="h-[18px] w-[18px]" /> },
  { label: "Flow", icon: <Workflow className="h-[18px] w-[18px]" />, href: "/dashboard" },
  { label: "Tools", icon: <Boxes className="h-[18px] w-[18px]" /> },
  { label: "API / MCP", icon: <BookOpen className="h-[18px] w-[18px]" /> },
];

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const displayName =
    user?.fullName || user?.primaryEmailAddress?.emailAddress || "Account";

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

  const isFlowActive = (href?: string) =>
    href === "/dashboard" &&
    (pathname === "/dashboard" || pathname.startsWith("/workflow"));

  return (
    <aside
      className={cn(
        "flex h-screen shrink-0 flex-col border-r border-hairline bg-white transition-[width]",
        collapsed ? "w-[64px]" : "w-[248px]",
      )}
    >
      {/* Brand */}
      <div className={cn("flex items-center pb-3 pt-4", collapsed ? "justify-center px-2" : "justify-between px-4")}>
        {collapsed ? (
          <button
            onClick={() => setCollapsed(false)}
            className="group relative flex h-8 w-8 items-center justify-center"
          >
            <Sparkles className="h-5 w-5 text-ink transition-opacity group-hover:opacity-0" />
            <PanelLeftOpen className="absolute h-4 w-4 text-ink-muted opacity-0 transition-opacity group-hover:opacity-100" />
            <span className="pointer-events-none absolute left-full top-1/2 z-30 ml-2 flex -translate-y-1/2 items-center gap-2 whitespace-nowrap rounded-md border border-hairline bg-white px-2 py-1 text-[11px] text-ink opacity-0 shadow-pop transition-opacity group-hover:opacity-100">
              Open sidebar <kbd className="font-mono text-[10px] text-ink-faint">Ctrl .</kbd>
            </span>
          </button>
        ) : (
          <>
            <Link href="/dashboard" className="flex items-center gap-1.5">
              <Sparkles className="h-5 w-5 text-ink" />
              <span className="text-[20px] font-bold tracking-tight text-ink">Magica</span>
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

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-1">
        {NAV.map((item) => {
          const active = isFlowActive(item.href);
          const className = cn(
            "flex items-center rounded-lg text-[14px] font-medium transition-colors",
            collapsed ? "justify-center px-0 py-2" : "gap-3 px-2.5 py-2",
            active
              ? "bg-ink/[0.07] text-ink"
              : "text-ink hover:bg-ink/[0.04]",
          );
          const inner = (
            <>
              {item.icon}
              {!collapsed && item.label}
            </>
          );
          return item.href ? (
            <Link key={item.label} href={item.href} title={item.label} className={className}>
              {inner}
            </Link>
          ) : (
            <button
              key={item.label}
              title={item.label}
              className={cn(className, "w-full text-left")}
            >
              {inner}
            </button>
          );
        })}
        {!collapsed && (
          <p className="px-2.5 pt-6 text-center text-[12px] text-ink-faint">No tasks yet</p>
        )}
      </nav>

      {/* Footer */}
      <div className="px-2 pb-2">
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
