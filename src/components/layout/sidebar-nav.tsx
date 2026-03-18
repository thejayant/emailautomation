"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ContactRound,
  FolderInput,
  Inbox,
  LayoutDashboard,
  Mail,
  Settings,
  UserCircle2,
} from "lucide-react";
import { productContent } from "@/content/product";
import { cn } from "@/lib/utils";

const iconMap = {
  "/dashboard": LayoutDashboard,
  "/contacts": ContactRound,
  "/imports": FolderInput,
  "/templates": Mail,
  "/campaigns": BarChart3,
  "/inbox": Inbox,
  "/settings": Settings,
  "/profile": UserCircle2,
} as const;

export function SidebarNav({
  orientation = "vertical",
}: {
  orientation?: "vertical" | "horizontal";
}) {
  const pathname = usePathname() ?? "/dashboard";

  return (
    <nav className={cn("min-w-0", orientation === "horizontal" ? "scrollbar-none overflow-x-auto" : "")}>
      <div
        className={cn(
          orientation === "horizontal"
            ? "flex min-w-max gap-2 pb-1"
            : "sidebar-nav-list grid gap-2.5",
        )}
      >
        {productContent.shell.navigation.map(({ href, label }) => {
          const Icon = iconMap[href as keyof typeof iconMap];
          const active = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex w-full min-w-0 items-center gap-3 rounded-[1.25rem] border text-sm font-medium tracking-[-0.01em] transition-[transform,background-color,border-color,color,box-shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring motion-reduce:transform-none motion-reduce:transition-none",
                orientation === "horizontal"
                  ? "min-h-11 shrink-0 whitespace-nowrap px-4 py-2.5"
                  : "sidebar-nav-link px-4 py-3.5",
                active
                  ? "glass-control text-sidebar-foreground shadow-[0_18px_40px_rgba(17,39,63,0.12)]"
                  : "border-transparent bg-transparent text-sidebar-muted hover:-translate-y-0.5 hover:border-white/50 hover:bg-white/36 hover:text-sidebar-foreground hover:shadow-[0_12px_28px_rgba(17,39,63,0.08)]",
              )}
            >
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-[0.95rem] border transition-colors duration-200",
                  orientation === "horizontal" ? "" : "sidebar-nav-icon",
                  active
                    ? "border-white/65 bg-white/58 text-sidebar-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.88)]"
                    : "border-transparent bg-transparent text-sidebar-muted group-hover:border-white/58 group-hover:bg-white/44 group-hover:text-sidebar-foreground",
                )}
              >
                <Icon className="size-4" />
              </span>
              <span
                className={cn(
                  "min-w-0",
                  orientation === "horizontal" ? "whitespace-nowrap" : "whitespace-normal break-words leading-5",
                )}
                title={label}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
