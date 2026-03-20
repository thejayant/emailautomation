import "server-only";
import { listWorkspaceMembers } from "@/lib/db/workspace";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { env, isGoogleConfigured, isSupabaseConfigured, requireSupabaseConfiguration } from "@/lib/supabase/env";
import { isAnyMissingColumnResult, isMissingTableResult } from "@/lib/utils/supabase-schema";
import { getWorkspaceGmailAccounts } from "@/services/gmail-service";

export async function getWorkspaceAdminSummary(workspaceId: string) {
  requireSupabaseConfiguration();

  const supabase = createAdminSupabaseClient();
  const [members, gmailAccounts, usageCounter] = await Promise.all([
    listWorkspaceMembers(workspaceId),
    getWorkspaceGmailAccounts(workspaceId),
    supabase
      .from("workspace_usage_counters")
      .select("daily_sends_used, active_campaigns_count, connected_mailboxes_count, seats_used, period_start")
      .eq("workspace_id", workspaceId)
      .order("period_start", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  let billingAccount = await supabase
    .from("workspace_billing_accounts")
    .select("id, provider, provider_customer_id, status, plan_key, assigned_at, renewal_at, usage_snapshot_jsonb")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (
    isAnyMissingColumnResult(billingAccount, [
      { table: "workspace_billing_accounts", column: "plan_key" },
      { table: "workspace_billing_accounts", column: "assigned_at" },
      { table: "workspace_billing_accounts", column: "renewal_at" },
      { table: "workspace_billing_accounts", column: "usage_snapshot_jsonb" },
    ])
  ) {
    billingAccount = await supabase
      .from("workspace_billing_accounts")
      .select("id, provider, provider_customer_id, status")
      .eq("workspace_id", workspaceId)
      .maybeSingle();
  }

  let crmConnections = await supabase
    .from("crm_connections")
    .select("id, provider, status, provider_account_label, last_synced_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (
    isAnyMissingColumnResult(crmConnections, [
      { table: "crm_connections", column: "provider_account_label" },
      { table: "crm_connections", column: "last_synced_at" },
    ])
  ) {
    crmConnections = await supabase
      .from("crm_connections")
      .select("id, provider, status")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
  }

  let seedInboxes = await supabase
    .from("seed_inboxes")
    .select("id, provider, email_address, status, last_checked_at, last_error")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (isMissingTableResult(seedInboxes, "seed_inboxes")) {
    seedInboxes = { data: [], error: null } as typeof seedInboxes;
  }

  return {
    members,
    gmailAccounts,
    billingAccount: billingAccount.data as
      | {
          id: string;
          provider?: string | null;
          provider_customer_id?: string | null;
          status: string;
          plan_key?: string | null;
          assigned_at?: string | null;
          renewal_at?: string | null;
          usage_snapshot_jsonb?: Record<string, unknown> | null;
        }
      | null,
    usageCounter: usageCounter.data as
      | {
          daily_sends_used: number;
          active_campaigns_count: number;
          connected_mailboxes_count: number;
          seats_used: number;
          period_start: string;
        }
      | null,
    crmConnections: ((crmConnections.data ?? []) as Array<{
      id: string;
      provider: string;
      status: string;
      provider_account_label?: string | null;
      last_synced_at?: string | null;
    }>) ?? [],
    seedInboxes: ((seedInboxes.data ?? []) as Array<{
      id: string;
      provider: string;
      email_address: string;
      status: string;
      last_checked_at?: string | null;
      last_error?: string | null;
    }>) ?? [],
  };
}

export function getWorkspaceHealthSummary() {
  return [
    {
      key: "supabase",
      label: "Supabase",
      status: isSupabaseConfigured ? "healthy" : "error",
      summary: isSupabaseConfigured ? "Configured and ready." : "Supabase keys are missing or placeholders.",
    },
    {
      key: "google",
      label: "Google OAuth",
      status: isGoogleConfigured ? "healthy" : "warning",
      summary: isGoogleConfigured ? "Mailbox OAuth is configured." : "Mailbox OAuth is not fully configured yet.",
    },
    {
      key: "shared-workspace",
      label: "Shared workspace",
      status: env.SHARED_WORKSPACE_SLUG ? "healthy" : "warning",
      summary: env.SHARED_WORKSPACE_SLUG
        ? `Auto-join is enabled for ${env.SHARED_WORKSPACE_SLUG}.`
        : "Shared workspace auto-join is not configured.",
    },
    {
      key: "cron",
      label: "Cron secret",
      status: env.SUPABASE_CRON_VERIFY_SECRET ? "healthy" : "warning",
      summary: env.SUPABASE_CRON_VERIFY_SECRET
        ? "Scheduled jobs can verify cron calls."
        : "Cron verification secret is missing.",
    },
  ] as const;
}
