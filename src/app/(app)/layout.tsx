import { redirect } from "next/navigation";
import { AppDataProvider } from "@/components/app-data/app-data-provider";
import { InstantAppContent } from "@/components/app-data/instant-app-content";
import { AppShell } from "@/components/layout/app-shell";
import { WalkthroughProvider } from "@/components/walkthrough/walkthrough-provider";
import { getWorkspaceContext } from "@/lib/db/workspace";
import { requireSupabaseConfiguration } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export default async function ProtectedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  requireSupabaseConfiguration();
  let workspace: Awaited<ReturnType<typeof getWorkspaceContext>>;

  try {
    workspace = await getWorkspaceContext();
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : error && typeof error === "object" && "message" in error && typeof error.message === "string"
          ? error.message
          : "Failed to load the protected app.";

    if (message === "No authenticated user session.") {
      redirect("/sign-in");
    }

    throw new Error(message);
  }

  return (
    <AppDataProvider workspace={workspace}>
      <WalkthroughProvider initialProductTourVersion={null}>
        <AppShell
          activeProjectId={workspace.activeProjectId}
          projects={workspace.availableProjects}
          shellTitle={workspace.workspaceLabel}
          workspaceName={workspace.workspaceName}
        >
          <InstantAppContent>{children}</InstantAppContent>
        </AppShell>
      </WalkthroughProvider>
    </AppDataProvider>
  );
}
