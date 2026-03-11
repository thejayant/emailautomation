import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { config } from "../shared/config.ts";
import { decryptToken, encryptToken } from "../shared/crypto.ts";
import { gmailRefreshAccessToken, gmailSend } from "../shared/gmail.ts";
import { json } from "../shared/response.ts";

const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey);

function verifyCron(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  return config.cronVerifySecret ? secret === config.cronVerifySecret : true;
}

function renderTemplate(template: string, payload: Record<string, unknown>) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_, key: string) => {
    if (key.startsWith("custom.")) {
      const custom = (payload.custom_fields_jsonb as Record<string, unknown> | undefined) ?? {};
      return String(custom[key.replace("custom.", "")] ?? "");
    }

    return String(payload[key] ?? "");
  });
}

async function hashToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function isWithinSendWindow(timezone: string, start: string, end: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .formatToParts(new Date())
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") {
        acc[part.type] = part.value;
      }
      return acc;
    }, {});
  const currentMinutes = Number(parts.hour) * 60 + Number(parts.minute);
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  return currentMinutes >= startHour * 60 + startMinute && currentMinutes <= endHour * 60 + endMinute;
}

async function resolveMailboxAccess(mailbox: {
  oauth_connection?: {
    id?: string;
    access_token_encrypted?: string | null;
    refresh_token_encrypted?: string | null;
    token_expiry?: string | null;
  } | null;
}) {
  const oauthConnection = mailbox.oauth_connection;

  if (!oauthConnection) {
    throw new Error("Missing oauth connection.");
  }

  const shouldRefresh =
    !oauthConnection.access_token_encrypted ||
    (oauthConnection.token_expiry &&
      new Date(oauthConnection.token_expiry).getTime() <= Date.now() + 60_000);

  if (!shouldRefresh && oauthConnection.access_token_encrypted) {
    return decryptToken(oauthConnection.access_token_encrypted);
  }

  if (!oauthConnection.refresh_token_encrypted) {
    throw new Error("Missing refresh token.");
  }

  const refreshed = await gmailRefreshAccessToken(
    await decryptToken(oauthConnection.refresh_token_encrypted),
  );

  await supabase
    .from("oauth_connections")
    .update({
      access_token_encrypted: await encryptToken(refreshed.access_token),
      token_expiry: refreshed.expires_in
        ? new Date(Date.now() + Number(refreshed.expires_in) * 1000).toISOString()
        : null,
    })
    .eq("id", oauthConnection.id);

  return refreshed.access_token as string;
}

Deno.serve(async (request) => {
  if (!verifyCron(request)) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: dueContacts, error } = await supabase
    .from("campaign_contacts")
    .select(`
      id,
      campaign_id,
      contact_id,
      current_step,
      status,
      failed_attempts,
      next_due_at,
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
    `)
    .in("status", ["queued", "followup_due"])
    .lte("next_due_at", new Date().toISOString())
    .order("next_due_at", { ascending: true })
    .limit(config.defaultPerMinuteThrottle);

  if (error) {
    return json({ error: error.message }, { status: 500 });
  }

  let processed = 0;

  for (const item of dueContacts ?? []) {
    const campaign = item.campaign;
    const contact = item.contact;

    if (!campaign || !contact || campaign.status !== "active" || contact.unsubscribed_at) {
      continue;
    }
    if (!isWithinSendWindow(campaign.timezone, campaign.send_window_start, campaign.send_window_end)) {
      continue;
    }

    const step = (
      item.campaign?.campaign_steps as
        | Array<{ step_number: number; subject_template: string; body_template: string }>
        | null
        | undefined
    )?.find(
      (candidate) => candidate.step_number === item.current_step,
    );

    if (!step) {
      continue;
    }

    const { data: mailbox } = await supabase
      .from("gmail_accounts")
      .select("id, email_address, oauth_connection:oauth_connections(id, access_token_encrypted, refresh_token_encrypted, token_expiry)")
      .eq("id", campaign.gmail_account_id)
      .single();

    if (!mailbox) {
      continue;
    }

    const existingMessage = (item.outbound_messages as Array<{ step_number: number }> | null)?.find(
      (message) => message.step_number === item.current_step,
    );

    if (existingMessage) {
      continue;
    }

    await supabase
      .from("campaign_contacts")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", item.id)
      .eq("status", item.status);

    try {
      const accessToken = await resolveMailboxAccess(mailbox);
      const unsubscribeToken = crypto.randomUUID();
      const unsubscribeLink = `${Deno.env.get("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000"}/api/unsubscribes/${unsubscribeToken}`;
      const html = `${renderTemplate(step.body_template, contact)}<br /><br /><a href="${unsubscribeLink}">Unsubscribe</a>`;
      const sendResult = await gmailSend({
        accessToken,
        fromEmail: mailbox.email_address,
        toEmail: contact.email,
        subject: renderTemplate(step.subject_template, contact),
        bodyHtml: html,
        threadId: item.current_step === 2 ? item.last_thread_id : null,
      });

      await supabase.from("outbound_messages").insert({
        campaign_contact_id: item.id,
        gmail_message_id: sendResult.id ?? null,
        gmail_thread_id: sendResult.threadId ?? null,
        step_number: item.current_step,
        sent_at: new Date().toISOString(),
        status: "sent",
      });

      await supabase.from("message_threads").upsert({
        workspace_id: campaign.workspace_id,
        campaign_contact_id: item.id,
        gmail_thread_id: sendResult.threadId ?? sendResult.id ?? crypto.randomUUID(),
        subject: renderTemplate(step.subject_template, contact),
        snippet: renderTemplate(step.body_template, contact).slice(0, 120),
        latest_message_at: new Date().toISOString(),
      });

      await supabase.from("unsubscribes").upsert({
        workspace_id: campaign.workspace_id,
        contact_id: item.contact_id,
        email: contact.email,
        token_hash: await hashToken(unsubscribeToken),
      });

      await supabase
        .from("campaign_contacts")
        .update({
          status: item.current_step === 1 ? "followup_due" : "followup_sent",
          current_step: item.current_step === 1 ? 2 : item.current_step,
          next_due_at:
            item.current_step === 1
              ? new Date(Date.now() + config.followUpDelayDays * 24 * 60 * 60 * 1000).toISOString()
              : null,
          last_thread_id: sendResult.threadId ?? null,
          last_message_id: sendResult.id ?? null,
        })
        .eq("id", item.id);

      processed += 1;
    } catch (sendError) {
      await supabase
        .from("campaign_contacts")
        .update({
          status: "failed",
          failed_attempts: item.failed_attempts + 1,
          error_message: sendError instanceof Error ? sendError.message : "Unknown send error",
        })
        .eq("id", item.id);
    }
  }

  return json({ processed });
});
