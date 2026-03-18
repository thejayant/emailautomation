import Link from "next/link";
import { ArrowUpRight, LogOut, Sparkles } from "lucide-react";
import { GmailMark } from "@/components/icons/gmail-mark";
import { productContent } from "@/content/product";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Button } from "@/components/ui/button";

export function AppShell({
  children,
  brandSubtitle = productContent.shell.brand.subtitle,
}: {
  children: React.ReactNode;
  brandSubtitle?: string;
}) {
  return (
    <div className="page-gradient min-h-screen px-3 py-3 sm:px-4 sm:py-4">
      <div className="relative mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-[1800px] flex-col gap-3 xl:grid xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="pointer-events-none absolute inset-x-12 top-0 h-72 rounded-full bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.88),transparent_64%)]" />

        <div className="glass-nav relative z-10 rounded-[32px] p-4 text-sidebar-foreground shadow-[0_24px_56px_rgba(17,39,63,0.12)] xl:hidden">
          <div className="flex items-start justify-between gap-4">
            <Link href="/dashboard" className="min-w-0 space-y-1">
              <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-sidebar-muted">
                {productContent.shell.brand.name}
              </p>
              <p className="text-lg font-semibold tracking-[-0.05em] text-sidebar-foreground">
                {brandSubtitle}
              </p>
            </Link>
            <form action="/api/auth/sign-out" method="post">
              <Button type="submit" size="sm" variant="outline" className="justify-center">
                <LogOut className="size-4" />
                {productContent.shell.signOutLabel}
              </Button>
            </form>
          </div>

          <div className="mt-4">
            <SidebarNav orientation="horizontal" />
          </div>
        </div>

        <aside className="hidden xl:block">
          <div className="sidebar-shell glass-nav scrollbar-none sticky top-4 flex h-[calc(100vh-2rem)] min-h-0 flex-col overflow-y-auto rounded-[34px] p-6 text-sidebar-foreground shadow-[0_26px_68px_rgba(17,39,63,0.14)]">
            <div className="sidebar-brand-row mb-8 flex items-start justify-between gap-4">
              <Link href="/dashboard" className="min-w-0 space-y-2">
                <p className="sidebar-brand-kicker font-mono text-[11px] uppercase tracking-[0.34em] text-sidebar-muted">
                  {productContent.shell.brand.name}
                </p>
                <p className="sidebar-brand-title text-[32px] font-semibold tracking-[-0.06em] text-sidebar-foreground">
                  {brandSubtitle}
                </p>
              </Link>
              <span className="sidebar-sparkle glass-chip flex size-11 items-center justify-center rounded-[1.35rem]">
                <Sparkles className="size-5 text-primary" />
              </span>
            </div>

            <SidebarNav />

            <div className="sidebar-helper glass-control mt-auto min-h-fit shrink-0 overflow-hidden rounded-[30px] p-5 xl:p-6">
              <p className="sidebar-helper-title text-sm font-semibold tracking-[-0.02em] text-sidebar-foreground">
                {productContent.shell.helper.title}
              </p>
              <p className="sidebar-helper-copy mt-2 text-sm leading-6 text-sidebar-muted">
                {productContent.shell.helper.description}
              </p>
              <div className="sidebar-helper-actions">
                <Link href="/profile" className="sidebar-helper-link group mt-4 w-full">
                  <span className="sidebar-helper-link-icon">
                    <GmailMark className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="sidebar-helper-link-kicker block font-mono text-[10px] uppercase tracking-[0.24em] text-sidebar-muted">
                      Gmail setup
                    </span>
                    <span className="sidebar-helper-link-label mt-1 block truncate text-sm font-semibold tracking-[-0.02em] text-sidebar-foreground">
                      {productContent.profile.gmailCard.connectLabel}
                    </span>
                  </span>
                  <span className="sidebar-helper-link-arrow">
                    <ArrowUpRight className="size-4 shrink-0" />
                  </span>
                </Link>
                <form action="/api/auth/sign-out" method="post" className="sidebar-helper-form mt-5">
                  <Button type="submit" variant="outline" className="sidebar-helper-button w-full justify-center">
                    <LogOut className="size-4" />
                    {productContent.shell.signOutLabel}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </aside>

        <main className="solid-content relative min-w-0 overflow-hidden rounded-[34px] p-4 sm:p-6 xl:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
