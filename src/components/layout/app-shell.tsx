import Link from "next/link";
import { LogOut, Sparkles } from "lucide-react";
import { headers } from "next/headers";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Button } from "@/components/ui/button";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") ?? "/dashboard";

  return (
    <div className="page-gradient min-h-screen p-4 md:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-7xl gap-4 rounded-[32px] border border-border/70 bg-card/90 p-3 card-shadow md:grid-cols-[280px_1fr] md:p-4">
        <aside className="rounded-[28px] bg-sidebar p-5 text-sidebar-foreground">
          <div className="flex h-full flex-col">
            <div className="mb-8 flex items-center justify-between">
              <Link href="/dashboard" className="space-y-1">
                <p className="font-mono text-xs uppercase tracking-[0.3em] text-sidebar-muted">
                  OutboundFlow
                </p>
                <p className="text-xl font-semibold">Workspace Console</p>
              </Link>
              <Sparkles className="size-5 text-secondary" />
            </div>
            <SidebarNav pathname={pathname} />
            <div className="mt-auto rounded-3xl border border-white/10 bg-white/8 p-4">
              <p className="text-sm font-semibold">Production MVP defaults</p>
              <p className="mt-2 text-sm leading-6 text-sidebar-muted">
                Gmail only, one follow-up after two days, workspace-safe sending caps.
              </p>
              <form action="/api/auth/sign-out" method="post" className="mt-4">
                <Button type="submit" variant="secondary" className="w-full justify-center">
                  <LogOut className="size-4" />
                  Sign out
                </Button>
              </form>
            </div>
          </div>
        </aside>
        <div className="rounded-[28px] bg-background/75 p-4 md:p-6">{children}</div>
      </div>
    </div>
  );
}
