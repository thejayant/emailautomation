import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { requireSupabaseConfiguration } from "@/lib/supabase/env";
import { isMissingColumnResult } from "@/lib/utils/supabase-schema";

async function getWorkspacePlanLimits(workspaceId: string) {
  const supabase = createAdminSupabaseClient();
  const { data: billingAccount } = await supabase
    .from("workspace_billing_accounts")
    .select("plan_key")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  const planKey = ((billingAccount as { plan_key?: string | null } | null)?.plan_key ?? "internal_mvp") as string;
  const { data: planLimits, error } = await supabase
    .from("plan_limits")
    .select("plan_key, connected_mailboxes_limit, active_campaigns_limit, seats_limit")
    .eq("plan_key", planKey)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (
    (planLimits as {
      plan_key: string;
      connected_mailboxes_limit: number;
      active_campaigns_limit: number;
      seats_limit: number;
    } | null) ?? {
      plan_key: "internal_mvp",
      connected_mailboxes_limit: 5,
      active_campaigns_limit: 25,
      seats_limit: 15,
    }
  );
}

async function countActiveApprovedMailboxes(workspaceId: string) {
  const supabase = createAdminSupabaseClient();
  let result = await supabase
    .from("gmail_accounts")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("approval_status", "approved")
    .eq("status", "active");

  if (isMissingColumnResult(result, "gmail_accounts", "approval_status")) {
    result = await supabase
      .from("gmail_accounts")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "active");
  }

  if (result.error) {
    throw result.error;
  }

  return result.count ?? 0;
}

export async function refreshWorkspaceUsageCounters(workspaceId: string) {
  requireSupabaseConfiguration();
  const supabase = createAdminSupabaseClient();
  const [{ count: seatCount }, senderCount, { count: activeCampaignCount }] = await Promise.all([
    supabase.from("workspace_members").select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId),
    countActiveApprovedMailboxes(workspaceId),
    supabase
      .from("campaigns")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "active"),
  ]);

  const { error } = await (
    supabase.from("workspace_usage_counters") as unknown as {
      upsert: (
        value: Record<string, unknown>,
        options?: Record<string, unknown>,
      ) => Promise<{ error: { message: string } | null }>;
    }
  ).upsert(
    {
      workspace_id: workspaceId,
      seats_used: seatCount ?? 0,
      connected_mailboxes_count: senderCount,
      active_campaigns_count: activeCampaignCount ?? 0,
    },
    { onConflict: "workspace_id,period_start" },
  );

  if (error) {
    throw error;
  }
}

export async function assertWorkspaceCanConnectMailbox(workspaceId: string) {
  requireSupabaseConfiguration();
  await refreshWorkspaceUsageCounters(workspaceId);

  const limits = await getWorkspacePlanLimits(workspaceId);
  const count = await countActiveApprovedMailboxes(workspaceId);

  if (count >= limits.connected_mailboxes_limit) {
    throw new Error("Your current plan has reached the approved mailbox limit.");
  }
}

export async function assertWorkspaceCanCreateCampaign(workspaceId: string) {
  requireSupabaseConfiguration();
  await refreshWorkspaceUsageCounters(workspaceId);

  const supabase = createAdminSupabaseClient();
  const limits = await getWorkspacePlanLimits(workspaceId);
  const { count } = await supabase
    .from("campaigns")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("status", "active");

  if ((count ?? 0) >= limits.active_campaigns_limit) {
    throw new Error("Your current plan has reached the active campaign limit.");
  }
}
