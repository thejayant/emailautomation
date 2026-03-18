import { cache } from "react";
import { getSessionUser } from "@/lib/auth/session";
import { buildWorkspaceShellLabel, getWorkspaceOwnerFirstName } from "@/lib/db/workspace-label";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { requireSupabaseConfiguration } from "@/lib/supabase/env";

export type WorkspaceContext = {
  userId: string;
  workspaceId: string;
  workspaceName: string;
  workspaceLabel: string;
  userFirstName: string | null;
};

function buildWorkspaceName(email?: string | null, fullName?: string | null) {
  if (fullName?.trim()) {
    return `${fullName.trim()} Workspace`;
  }

  const emailPrefix = email?.split("@")[0]?.trim();
  if (emailPrefix) {
    return `${emailPrefix} Workspace`;
  }

  return "Workspace";
}

function buildWorkspaceSlug(userId: string, email?: string | null, fullName?: string | null) {
  const base = (fullName?.trim() || email?.split("@")[0]?.trim() || "workspace")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return `${base || "workspace"}-${userId.slice(0, 8)}`;
}

function toWorkspaceBootstrapError(step: string, message: string) {
  const normalizedMessage = message.trim();

  if (
    /Could not find the table ['"]public\./i.test(normalizedMessage) ||
    /relation ["']public\..+["'] does not exist/i.test(normalizedMessage)
  ) {
    return new Error(
      `Failed to bootstrap workspace during ${step}: ${normalizedMessage}. ` +
        "The configured Supabase project is missing the required OutboundFlow tables. " +
        "Apply supabase/migrations/20260310235900_init_outboundflow.sql and all later migrations to the same project, then reload the app.",
    );
  }

  return new Error(`Failed to bootstrap workspace during ${step}: ${normalizedMessage}`);
}

async function ensureWorkspaceMembership(user: {
  id: string;
  email?: string | null;
  user_metadata?: { full_name?: string | null } | null;
}) {
  const supabase = createAdminSupabaseClient();

  const { data: rawMembership, error: membershipLookupError } = await supabase
    .from("workspace_members")
    .select("workspace_id, workspaces(name)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membershipLookupError) {
    throw toWorkspaceBootstrapError("membership lookup", membershipLookupError.message);
  }

  const membership = rawMembership as
    | { workspace_id: string; workspaces?: { name?: string } | null }
    | null;

  if (membership) {
    return {
      workspaceId: membership.workspace_id,
      workspaceName:
        ((membership.workspaces as { name?: string } | null)?.name as string | undefined) ??
        "Workspace",
    };
  }

  const { data: rawProfile, error: profileLookupError } = await supabase
    .from("profiles")
    .select("primary_workspace_id, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profileLookupError) {
    throw toWorkspaceBootstrapError("profile lookup", profileLookupError.message);
  }

  const profile = rawProfile as
    | { primary_workspace_id?: string | null; full_name?: string | null }
    | null;

  let workspaceId = profile?.primary_workspace_id ?? null;
  let workspaceName = buildWorkspaceName(user.email, profile?.full_name ?? user.user_metadata?.full_name);

  if (workspaceId) {
    const { data: rawWorkspace, error: workspaceLookupError } = await supabase
      .from("workspaces")
      .select("id, name")
      .eq("id", workspaceId)
      .maybeSingle();

    if (workspaceLookupError) {
      throw toWorkspaceBootstrapError("workspace lookup", workspaceLookupError.message);
    }

    const workspace = rawWorkspace as { id: string; name?: string | null } | null;
    if (workspace) {
      workspaceName = workspace.name ?? workspaceName;
    } else {
      workspaceId = null;
    }
  }

  if (!workspaceId) {
    const { data: insertedWorkspace, error: workspaceError } = await (
      supabase.from("workspaces") as unknown as {
        insert: (value: Record<string, unknown>) => {
          select: (columns: string) => { single: () => Promise<{ data: unknown; error: { message: string } | null }> };
        };
      }
    )
      .insert({
        name: workspaceName,
        slug: buildWorkspaceSlug(user.id, user.email, profile?.full_name ?? user.user_metadata?.full_name),
      })
      .select("id, name")
      .single();

    if (workspaceError) {
      throw toWorkspaceBootstrapError("workspace creation", workspaceError.message);
    }

    const workspace = insertedWorkspace as { id: string; name?: string | null };
    workspaceId = workspace.id;
    workspaceName = workspace.name ?? workspaceName;
  }

  const { error: profileError } = await (
    supabase.from("profiles") as unknown as {
      upsert: (
        value: Record<string, unknown>,
        options?: Record<string, unknown>,
      ) => Promise<{ error: { message: string } | null }>;
    }
  ).upsert(
    {
      id: user.id,
      full_name: profile?.full_name ?? user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "User",
      primary_workspace_id: workspaceId,
    },
    { onConflict: "id" },
  );

  if (profileError) {
    throw new Error(`Failed to bootstrap profile: ${profileError.message}`);
  }

  const { error: membershipError } = await (
    supabase.from("workspace_members") as unknown as {
      upsert: (
        value: Record<string, unknown>,
        options?: Record<string, unknown>,
      ) => Promise<{ error: { message: string } | null }>;
    }
  ).upsert(
    {
      workspace_id: workspaceId,
      user_id: user.id,
      role: "owner",
    },
    { onConflict: "workspace_id,user_id" },
  );

  if (membershipError) {
    throw new Error(`Failed to bootstrap workspace membership: ${membershipError.message}`);
  }

  const { error: usageError } = await (
    supabase.from("workspace_usage_counters") as unknown as {
      upsert: (
        value: Record<string, unknown>,
        options?: Record<string, unknown>,
      ) => Promise<{ error: { message: string } | null }>;
    }
  ).upsert(
    {
      workspace_id: workspaceId,
      seats_used: 1,
    },
    { onConflict: "workspace_id,period_start" },
  );

  if (usageError) {
    throw new Error(`Failed to bootstrap workspace usage counters: ${usageError.message}`);
  }

  return {
    workspaceId,
    workspaceName,
  };
}

export const getWorkspaceContext = cache(async (): Promise<WorkspaceContext> => {
  requireSupabaseConfiguration();
  const user = await getSessionUser();

  if (!user) {
    throw new Error("No authenticated user session.");
  }

  const workspace = await ensureWorkspaceMembership({
    id: user.id,
    email: user.email,
    user_metadata: user.user_metadata as { full_name?: string | null } | null,
  });

  const supabase = createAdminSupabaseClient();
  const { data: rawProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const profile = rawProfile as { full_name?: string | null } | null;
  const fullName = profile?.full_name ?? user.user_metadata?.full_name ?? null;
  const userFirstName = getWorkspaceOwnerFirstName({
    fullName,
    workspaceName: workspace.workspaceName,
    email: user.email,
  });

  return {
    userId: user.id,
    workspaceId: workspace.workspaceId,
    workspaceName: workspace.workspaceName,
    workspaceLabel: buildWorkspaceShellLabel({
      fullName,
      workspaceName: workspace.workspaceName,
      email: user.email,
    }),
    userFirstName,
  };
});
