import { AppShell } from "@/components/layout/app-shell";
import { getWorkspaceContext } from "@/lib/db/workspace";
import { requireSessionUser } from "@/lib/auth/session";
import { requireSupabaseConfiguration } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export default async function ProtectedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  requireSupabaseConfiguration();
  await requireSessionUser();
  const workspace = await getWorkspaceContext();

  return <AppShell brandSubtitle={workspace.workspaceLabel}>{children}</AppShell>;
}
