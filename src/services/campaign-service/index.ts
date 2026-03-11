import "server-only";
import { addDays } from "date-fns";
import { createHash, randomUUID } from "crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { env, requireSupabaseConfiguration } from "@/lib/supabase/env";
import { renderTemplate } from "@/lib/utils/template";
import { isWithinSendWindow } from "@/lib/utils/time";
import { getMailboxAccessTokenForAccount, sendWithMailboxProvider } from "@/services/gmail-service";

function buildUnsubscribeLink(token: string) {
  return `${env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/unsubscribes/${token}`;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function listTemplates(workspaceId: string) {
  requireSupabaseConfiguration();

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("templates")
    .select("id, name, subject_template, body_template, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data as Array<{
    id: string;
    name: string;
    subject_template: string;
    body_template: string;
    created_at: string;
  }>;
}

export async function saveTemplate(input: {
  workspaceId: string;
  userId: string;
  name: string;
  subjectTemplate: string;
  bodyTemplate: string;
}) {
  requireSupabaseConfiguration();

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("templates")
    .insert({
      workspace_id: input.workspaceId,
      owner_user_id: input.userId,
      name: input.name,
      subject_template: input.subjectTemplate,
      body_template: input.bodyTemplate,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data as { id: string };
}

export async function listCampaigns(workspaceId: string) {
  requireSupabaseConfiguration();

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select("id, name, status, daily_send_limit, timezone, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data as Array<{
    id: string;
    name: string;
    status: string;
    daily_send_limit: number;
    timezone: string;
    created_at: string;
  }>;
}

export async function getCampaignById(campaignId: string) {
  requireSupabaseConfiguration();

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select(
      "id, name, status, daily_send_limit, timezone, send_window_start, send_window_end, campaign_contacts(id, status, current_step, next_due_at, contact:contacts(email, first_name, company))",
    )
    .eq("id", campaignId)
    .single();

  if (error) {
    throw error;
  }

  return data as {
    id: string;
    name: string;
    status: string;
    daily_send_limit: number;
    timezone: string;
    send_window_start?: string | null;
    send_window_end?: string | null;
    campaign_contacts?: Array<{
      id: string;
      status: string;
      current_step: number;
      next_due_at: string | null;
      contact?: { email?: string | null; first_name?: string | null; company?: string | null } | null;
    }>;
  };
}

type DueCampaignContact = {
  id: string;
  campaign_id: string;
  contact_id: string;
  current_step: number;
  status: string;
  failed_attempts: number;
  next_due_at: string | null;
  last_thread_id?: string | null;
  contact?: {
    email?: string | null;
    first_name?: string | null;
    company?: string | null;
    website?: string | null;
    custom_fields_jsonb?: Record<string, unknown> | null;
    unsubscribed_at?: string | null;
  } | null;
  campaign?: {
    id: string;
    workspace_id: string;
    name: string;
    status: string;
    gmail_account_id: string;
    daily_send_limit: number;
    send_window_start: string;
    send_window_end: string;
    timezone: string;
    campaign_steps?: Array<{
      step_number: number;
      subject_template: string;
      body_template: string;
      wait_days?: number | null;
    }> | null;
  } | null;
  outbound_messages?: Array<{ step_number: number }> | null;
};

async function processCampaignContact(item: DueCampaignContact, options?: { ignoreSendWindow?: boolean }) {
  const supabase = createAdminSupabaseClient();
  const campaign = item.campaign;
  const contact = item.contact;

  if (!campaign || !contact || campaign.status !== "active" || contact.unsubscribed_at) {
    return { processed: false, reason: "skipped" as const };
  }

  if (
    !options?.ignoreSendWindow &&
    !isWithinSendWindow(new Date(), campaign.timezone, campaign.send_window_start, campaign.send_window_end)
  ) {
    return { processed: false, reason: "outside_window" as const };
  }

  const step = (campaign.campaign_steps ?? []).find((candidate) => candidate.step_number === item.current_step);

  if (!step || !contact.email) {
    return { processed: false, reason: "missing_step" as const };
  }

  const existingMessage = (item.outbound_messages ?? []).find(
    (message) => message.step_number === item.current_step,
  );

  if (existingMessage) {
    return { processed: false, reason: "already_sent" as const };
  }

  try {
    const mailbox = await getMailboxAccessTokenForAccount(campaign.gmail_account_id);
    const unsubscribeToken = randomUUID();
    const renderedSubject = renderTemplate(step.subject_template, contact);
    const renderedBody = renderTemplate(step.body_template, contact);
    const sendResult = await sendWithMailboxProvider({
      accessToken: mailbox.accessToken,
      fromEmail: mailbox.emailAddress,
      toEmail: contact.email,
      subject: renderedSubject,
      bodyHtml: `${renderedBody.replace(/\n/g, "<br />")}<br /><br /><a href="${buildUnsubscribeLink(unsubscribeToken)}">Unsubscribe</a>`,
      bodyText: renderedBody,
      replyThreadId: item.current_step === 2 ? item.last_thread_id : null,
    });

    const sentAt = new Date().toISOString();

    await supabase.from("outbound_messages").insert({
      campaign_contact_id: item.id,
      gmail_message_id: sendResult.messageId ?? null,
      gmail_thread_id: sendResult.threadId ?? null,
      step_number: item.current_step,
      sent_at: sentAt,
      status: "sent",
    });

    await supabase.from("message_threads").upsert({
      workspace_id: campaign.workspace_id,
      campaign_contact_id: item.id,
      gmail_thread_id: sendResult.threadId || sendResult.messageId || randomUUID(),
      subject: renderedSubject,
      snippet: renderedBody.slice(0, 120),
      latest_message_at: sentAt,
    });

    await supabase.from("unsubscribes").upsert({
      workspace_id: campaign.workspace_id,
      contact_id: item.contact_id,
      email: contact.email,
      token_hash: hashToken(unsubscribeToken),
    });

    await supabase
      .from("campaign_contacts")
      .update({
        status: item.current_step === 1 ? "followup_due" : "followup_sent",
        current_step: item.current_step === 1 ? 2 : item.current_step,
        next_due_at: item.current_step === 1 ? scheduleFollowup(sentAt) : null,
        last_thread_id: sendResult.threadId ?? null,
        last_message_id: sendResult.messageId ?? null,
        error_message: null,
      })
      .eq("id", item.id);

    return { processed: true, reason: "sent" as const };
  } catch (error) {
    await supabase
      .from("campaign_contacts")
      .update({
        status: "failed",
        failed_attempts: item.failed_attempts + 1,
        error_message: error instanceof Error ? error.message : "Unknown send error",
      })
      .eq("id", item.id);

    return { processed: false, reason: "failed" as const };
  }
}

export async function createCampaign(input: {
  workspaceId: string;
  userId: string;
  campaignName: string;
  gmailAccountId: string;
  targetContactIds: string[];
  timezone: string;
  sendWindowStart: string;
  sendWindowEnd: string;
  dailySendLimit: number;
  primarySubject: string;
  primaryBody: string;
  followupSubject: string;
  followupBody: string;
}) {
  requireSupabaseConfiguration();

  const supabase = createAdminSupabaseClient();
  const { data: rawCampaign, error } = await supabase
    .from("campaigns")
    .insert({
      workspace_id: input.workspaceId,
      owner_user_id: input.userId,
      name: input.campaignName,
      status: "active",
      gmail_account_id: input.gmailAccountId,
      daily_send_limit: input.dailySendLimit,
      send_window_start: input.sendWindowStart,
      send_window_end: input.sendWindowEnd,
      timezone: input.timezone,
      allowed_send_days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }
  const campaign = rawCampaign as { id: string };

  await supabase.from("campaign_steps").insert([
    {
      campaign_id: campaign.id,
      step_number: 1,
      step_type: "initial",
      subject_template: input.primarySubject,
      body_template: input.primaryBody,
      wait_days: 0,
    },
    {
      campaign_id: campaign.id,
      step_number: 2,
      step_type: "follow_up",
      subject_template: input.followupSubject,
      body_template: input.followupBody,
      wait_days: env.FOLLOW_UP_DELAY_DAYS,
    },
  ]);

  await supabase.from("campaign_contacts").insert(
    input.targetContactIds.map((contactId) => ({
      campaign_id: campaign.id,
      contact_id: contactId,
      status: "queued",
      current_step: 1,
      next_due_at: new Date().toISOString(),
      failed_attempts: 0,
    })),
  );

  return { id: campaign.id, launched: true };
}

export async function pauseCampaign(campaignId: string, status: "paused" | "active") {
  requireSupabaseConfiguration();

  const supabase = createAdminSupabaseClient();
  await supabase.from("campaigns").update({ status }).eq("id", campaignId);
  return { campaignId, status };
}

export async function markFailedContactForResend(campaignContactId: string) {
  requireSupabaseConfiguration();

  const supabase = createAdminSupabaseClient();
  await supabase
    .from("campaign_contacts")
    .update({
      status: "queued",
      next_due_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("id", campaignContactId);

  return { campaignContactId, status: "queued" };
}

export async function sendCampaignNow(campaignId: string, workspaceId: string) {
  requireSupabaseConfiguration();

  const supabase = createAdminSupabaseClient();
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("id")
    .eq("id", campaignId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (campaignError) {
    throw campaignError;
  }

  if (!campaign) {
    throw new Error("Campaign not found.");
  }

  const { data, error } = await supabase
    .from("campaign_contacts")
    .select(
      `
      id,
      campaign_id,
      contact_id,
      current_step,
      status,
      failed_attempts,
      next_due_at,
      last_thread_id,
      contact:contacts(email, first_name, company, website, custom_fields_jsonb, unsubscribed_at),
      campaign:campaigns(
        id,
        workspace_id,
        name,
        status,
        gmail_account_id,
        daily_send_limit,
        send_window_start,
        send_window_end,
        timezone,
        campaign_steps(step_number, subject_template, body_template, wait_days)
      ),
      outbound_messages(step_number)
    `,
    )
    .eq("campaign_id", campaignId)
    .in("status", ["queued", "followup_due"])
    .lte("next_due_at", new Date().toISOString())
    .order("next_due_at", { ascending: true });

  if (error) {
    throw error;
  }

  let processed = 0;

  for (const item of (data ?? []) as DueCampaignContact[]) {
    const result = await processCampaignContact(item, { ignoreSendWindow: true });
    if (result.processed) {
      processed += 1;
    }
  }

  return { campaignId, processed };
}

export function scheduleFollowup(sentAt: string) {
  return addDays(new Date(sentAt), env.FOLLOW_UP_DELAY_DAYS).toISOString();
}

export function canSendNow(timezone: string, sendWindowStart: string, sendWindowEnd: string) {
  return isWithinSendWindow(new Date(), timezone, sendWindowStart, sendWindowEnd);
}
