import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  mapInboxThreadDetail,
  mapInboxThreadSummary,
  type InboxCampaignSummary,
  type InboxContactHistoryItem,
  type InboxContactSummary,
  type InboxThreadMessage,
  type InboxThreadState,
} from "@/lib/inbox/threads";
import { requireSupabaseConfiguration } from "@/lib/supabase/env";
import { isMissingColumnResult, isMissingTableResult } from "@/lib/utils/supabase-schema";
import { listWorkspaceProjects } from "@/services/project-service";

export type ProjectMetricsSummary = {
  projectId: string;
  totalLeads: number;
  queued: number;
  sent: number;
  followupSent: number;
  replied: number;
  unsubscribed: number;
  failed: number;
  replyRate: number;
};

function normalizeMetricValue(value: number | string | null | undefined) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function getDashboardMetrics(workspaceId: string, options?: { projectId?: string }) {
  requireSupabaseConfiguration();

  const supabase = createAdminSupabaseClient();
  const workspaceCampaignContacts = () => {
    let query = supabase
      .from("campaign_contacts")
      .select("id, campaign:campaigns!inner(workspace_id, project_id)", { count: "exact", head: true })
      .eq("campaign.workspace_id", workspaceId);

    if (options?.projectId) {
      query = query.eq("campaign.project_id", options.projectId);
    }

    return query;
  };
  const workspaceOutboundMessages = () => {
    let query = supabase
      .from("outbound_messages")
      .select(
        "id, campaign_contact:campaign_contacts!inner(campaign:campaigns!inner(workspace_id, project_id))",
        { count: "exact", head: true },
      )
      .eq("campaign_contact.campaign.workspace_id", workspaceId)
      .eq("status", "sent");

    if (options?.projectId) {
      query = query.eq("campaign_contact.campaign.project_id", options.projectId);
    }

    return query;
  };
  const contactsQuery = supabase
    .from("contacts")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);
  const unsubscribedQuery = supabase
    .from("contacts")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .not("unsubscribed_at", "is", null);

  if (options?.projectId) {
    contactsQuery.eq("project_id", options.projectId);
    unsubscribedQuery.eq("project_id", options.projectId);
  }

  const [
    { count: totalLeads },
    { count: queued },
    { count: sent },
    { count: followupSent },
    { count: replied },
    { count: unsubscribed },
    { count: failed },
  ] = await Promise.all([
    contactsQuery,
    workspaceCampaignContacts().eq("status", "queued"),
    workspaceOutboundMessages().eq("step_number", 1),
    workspaceOutboundMessages().eq("step_number", 2),
    workspaceCampaignContacts().eq("status", "replied"),
    unsubscribedQuery,
    workspaceCampaignContacts().eq("status", "failed"),
  ]);

  const sentCount = sent ?? 0;
  const repliedCount = replied ?? 0;

  return {
    totalLeads: totalLeads ?? 0,
    queued: queued ?? 0,
    sent: sentCount,
    followupSent: followupSent ?? 0,
    replied: repliedCount,
    unsubscribed: unsubscribed ?? 0,
    failed: failed ?? 0,
    replyRate: sentCount ? Number(((repliedCount / sentCount) * 100).toFixed(1)) : 0,
  };
}

export async function getReplyRateByCampaign(workspaceId: string, options?: { projectId?: string }) {
  requireSupabaseConfiguration();

  const supabase = createAdminSupabaseClient();
  let query = supabase
    .from("campaigns")
    .select("id, name, campaign_contacts(status, outbound_messages(step_number, status))")
    .eq("workspace_id", workspaceId);

  if (options?.projectId) {
    query = query.eq("project_id", options.projectId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return ((data ?? []) as Array<{
    name: string;
    campaign_contacts:
      | Array<{
          status: string;
          outbound_messages?: Array<{ step_number: number; status: string }> | null;
        }>
      | null;
  }>).map((campaign) => {
    const contacts = campaign.campaign_contacts ?? [];
    const sent = contacts.filter((contact) =>
      (contact.outbound_messages ?? []).some(
        (message) => message.step_number === 1 && message.status === "sent",
      ),
    ).length;
    const replied = contacts.filter((contact) => contact.status === "replied").length;

    return {
      name: campaign.name,
      replyRate: sent ? Number(((replied / sent) * 100).toFixed(1)) : 0,
    };
  });
}

export async function listWorkspaceProjectMetrics(workspaceId: string): Promise<ProjectMetricsSummary[]> {
  requireSupabaseConfiguration();

  const supabase = createAdminSupabaseClient() as unknown as {
    rpc: (
      fn: string,
      args?: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message?: string | null } | null }>;
  };
  const { data, error } = await supabase.rpc("get_workspace_project_metrics", {
    p_workspace_id: workspaceId,
  });

  if (!error) {
    return ((data ?? []) as Array<{
      project_id: string;
      total_leads?: number | string | null;
      queued?: number | string | null;
      sent?: number | string | null;
      followup_sent?: number | string | null;
      replied?: number | string | null;
      unsubscribed?: number | string | null;
      failed?: number | string | null;
      reply_rate?: number | string | null;
    }>).map((row) => ({
      projectId: row.project_id,
      totalLeads: normalizeMetricValue(row.total_leads),
      queued: normalizeMetricValue(row.queued),
      sent: normalizeMetricValue(row.sent),
      followupSent: normalizeMetricValue(row.followup_sent),
      replied: normalizeMetricValue(row.replied),
      unsubscribed: normalizeMetricValue(row.unsubscribed),
      failed: normalizeMetricValue(row.failed),
      replyRate: normalizeMetricValue(row.reply_rate),
    }));
  }

  const projects = await listWorkspaceProjects(workspaceId);

  return Promise.all(
    projects.map(async (project) => ({
      projectId: project.id,
      ...(await getDashboardMetrics(workspaceId, { projectId: project.id })),
    })),
  );
}

export async function listThreads(workspaceId: string, options?: { projectId?: string }) {
  requireSupabaseConfiguration();

  const supabase = createAdminSupabaseClient();
  let baseQuery = supabase
    .from("message_threads")
    .select(
      "id, gmail_thread_id, subject, snippet, latest_message_at, campaign_contact_id, campaign_contact:campaign_contacts(status, reply_disposition), thread_messages(id, direction, from_email, to_emails, subject, body_text, body_html, sent_at)",
    )
    .eq("workspace_id", workspaceId);

  if (options?.projectId) {
    baseQuery = baseQuery.eq("project_id", options.projectId);
  }

  let result = await baseQuery.order("latest_message_at", { ascending: false }).limit(20);

  if (isMissingColumnResult(result, "campaign_contacts", "reply_disposition")) {
    let fallbackQuery = supabase
      .from("message_threads")
      .select(
        "id, gmail_thread_id, subject, snippet, latest_message_at, campaign_contact_id, campaign_contact:campaign_contacts(status), thread_messages(id, direction, from_email, to_emails, subject, body_text, body_html, sent_at)",
      )
      .eq("workspace_id", workspaceId);

    if (options?.projectId) {
      fallbackQuery = fallbackQuery.eq("project_id", options.projectId);
    }

    result = await fallbackQuery.order("latest_message_at", { ascending: false }).limit(20);
  }

  const { data, error } = result;

  if (error) {
    throw error;
  }

  return ((data ?? []) as Array<{
    id: string;
    subject: string | null;
    snippet: string | null;
    latest_message_at: string | null;
    campaign_contact_id?: string | null;
    campaign_contact?: { status?: string | null; reply_disposition?: string | null } | null;
      thread_messages: Array<{
        id: string;
        direction: string;
        from_email: string | null;
        to_emails: string[] | null;
        subject: string | null;
        body_text: string | null;
        body_html: string | null;
        sent_at: string;
      }> | null;
  }>).map((thread) => ({
    id: thread.id,
    subject: thread.subject,
    snippet: thread.snippet,
    latest_message_at: thread.latest_message_at,
    campaign_contact_id: thread.campaign_contact_id ?? null,
    campaign_status: thread.campaign_contact?.status ?? null,
    reply_disposition: thread.campaign_contact?.reply_disposition ?? null,
    messages:
      ((thread.thread_messages as Array<{
        id: string;
        direction: string;
        from_email: string | null;
        to_emails: string[] | null;
        subject: string | null;
        body_text: string | null;
        body_html: string | null;
        sent_at: string;
      }> | null) ?? []) || [],
  }));
}

type RawInboxThreadRecord = {
  id: string;
  gmail_thread_id?: string | null;
  subject: string | null;
  snippet?: string | null;
  latest_message_at: string | null;
  campaign_contact_id?: string | null;
  campaign_contact?: {
    status?: string | null;
    reply_disposition?: string | null;
    replied_at?: string | null;
    contact?: {
      id?: string | null;
      email?: string | null;
      first_name?: string | null;
      last_name?: string | null;
      company?: string | null;
      job_title?: string | null;
      website?: string | null;
    } | null;
    campaign?: {
      id?: string | null;
      name?: string | null;
      status?: string | null;
      created_at?: string | null;
    } | null;
  } | null;
  thread_messages: Array<{
    id: string;
    direction: string;
    from_email: string | null;
    to_emails: string[] | null;
    subject: string | null;
    snippet?: string | null;
    body_text: string | null;
    body_html: string | null;
    sent_at: string;
  }> | null;
};

type InboxQueryError = {
  message?: string | null;
  code?: string | null;
  details?: string | null;
  hint?: string | null;
} | null;

type InboxSingleResult = Promise<{ data: unknown; error: InboxQueryError; status?: number | null }>;

type InboxThreadDetailQuery = {
  eq: (column: string, value: string) => InboxThreadDetailQuery;
  maybeSingle: () => InboxSingleResult;
};

const inboxThreadsSelect =
  "id, gmail_thread_id, subject, snippet, latest_message_at, campaign_contact_id, campaign_contact:campaign_contacts(status, reply_disposition, replied_at, contact:contacts(id, email, first_name, last_name, company, job_title, website), campaign:campaigns(id, name, status, created_at)), thread_messages(id, direction, from_email, to_emails, subject, snippet, body_text, body_html, sent_at)";

const inboxThreadsFallbackSelect =
  "id, gmail_thread_id, subject, snippet, latest_message_at, campaign_contact_id, campaign_contact:campaign_contacts(status, contact:contacts(id, email, first_name, last_name, company, job_title, website), campaign:campaigns(id, name, status, created_at)), thread_messages(id, direction, from_email, to_emails, subject, snippet, body_text, body_html, sent_at)";

function createInboxThreadDetailQuery(workspaceId: string, threadId: string, projectId?: string) {
  let query = createAdminSupabaseClient()
    .from("message_threads")
    .select(inboxThreadsSelect)
    .eq("workspace_id", workspaceId)
    .eq("id", threadId) as unknown as InboxThreadDetailQuery;

  if (projectId) {
    query = query.eq("project_id", projectId);
  }

  return query;
}

function createInboxThreadListQuery(workspaceId: string, projectId?: string, fallback = false) {
  let query = createAdminSupabaseClient()
    .from("message_threads")
    .select(fallback ? inboxThreadsFallbackSelect : inboxThreadsSelect)
    .eq("workspace_id", workspaceId);

  if (projectId) {
    query = query.eq("project_id", projectId);
  }

  return query;
}

function mapRawInboxThread(thread: RawInboxThreadRecord) {
  const contact = thread.campaign_contact?.contact
    ? {
        id: thread.campaign_contact.contact.id ?? null,
        email: thread.campaign_contact.contact.email ?? null,
        firstName: thread.campaign_contact.contact.first_name ?? null,
        lastName: thread.campaign_contact.contact.last_name ?? null,
        company: thread.campaign_contact.contact.company ?? null,
        jobTitle: thread.campaign_contact.contact.job_title ?? null,
        website: thread.campaign_contact.contact.website ?? null,
      }
    : null;
  const campaign = thread.campaign_contact?.campaign
    ? {
        id: thread.campaign_contact.campaign.id ?? null,
        name: thread.campaign_contact.campaign.name ?? null,
        status: thread.campaign_contact.campaign.status ?? null,
        createdAt: thread.campaign_contact.campaign.created_at ?? null,
        audienceCount: null,
      }
    : null;

  return {
    id: thread.id,
    subject: thread.subject,
    snippet: thread.snippet ?? null,
    latest_message_at: thread.latest_message_at,
    campaign_contact_id: thread.campaign_contact_id ?? null,
    campaign_status: thread.campaign_contact?.status ?? null,
    reply_disposition: thread.campaign_contact?.reply_disposition ?? null,
    contact,
    campaign,
    messages:
      ((thread.thread_messages as InboxThreadMessage[] | null) ?? []).map((message) => ({
        ...message,
        snippet: message.snippet ?? null,
        body_html: message.body_html ?? null,
      })),
  };
}

async function getInboxThreadStateMap(
  workspaceId: string,
  projectId: string | undefined,
  threadIds: string[],
) {
  if (!projectId || !threadIds.length) {
    return new Map<string, InboxThreadState>();
  }

  const result = await createAdminSupabaseClient()
    .from("inbox_thread_states")
    .select("thread_id, last_read_at, starred_at, updated_by_user_id")
    .eq("workspace_id", workspaceId)
    .eq("project_id", projectId)
    .in("thread_id", threadIds);

  if (result.error) {
    if (isMissingTableResult(result, "inbox_thread_states")) {
      return new Map<string, InboxThreadState>();
    }

    throw result.error;
  }

  return new Map(
    ((result.data ?? []) as Array<{
      thread_id: string;
      last_read_at: string | null;
      starred_at: string | null;
      updated_by_user_id?: string | null;
    }>).map((state) => [
      state.thread_id,
      {
        lastReadAt: state.last_read_at ?? null,
        starredAt: state.starred_at ?? null,
        updatedByUserId: state.updated_by_user_id ?? null,
      },
    ]),
  );
}

function normalizeInboxFilter(value: string | null | undefined) {
  return ["unread", "replied", "starred"].includes(value ?? "") ? value : "all";
}

function matchesInboxSearch(summary: ReturnType<typeof mapInboxThreadSummary>, query: string) {
  if (!query) {
    return true;
  }

  const haystack = [
    summary.subject,
    summary.senderEmail,
    summary.snippet,
    summary.replyDisposition,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query.toLowerCase());
}

export async function listInboxThreadSummaries(
  workspaceId: string,
  options?: { projectId?: string; limit?: number; offset?: number; query?: string; filter?: string },
) {
  requireSupabaseConfiguration();

  const limit = Math.max(1, Math.min(options?.limit ?? 10, 50));
  const offset = Math.max(0, options?.offset ?? 0);
  const fetchWindow = Math.min(180, Math.max(offset + limit + 1, offset + limit * 4 + 20));
  let result = await createInboxThreadListQuery(workspaceId, options?.projectId)
    .order("latest_message_at", { ascending: false })
    .range(0, fetchWindow - 1);

  const { error } = result;

  if (error && isMissingColumnResult(result, "campaign_contacts", "reply_disposition")) {
    result = await createInboxThreadListQuery(workspaceId, options?.projectId, true)
      .order("latest_message_at", { ascending: false })
      .range(0, fetchWindow - 1);
  } else if (error) {
    throw error;
  }

  if (result.error) {
    throw result.error;
  }

  const summaryRows = (result.data ?? []) as RawInboxThreadRecord[];
  const states = await getInboxThreadStateMap(
    workspaceId,
    options?.projectId,
    summaryRows.map((thread) => thread.id),
  );
  const searchQuery = options?.query?.trim() ?? "";
  const filter = normalizeInboxFilter(options?.filter);
  const threads = summaryRows
    .map((thread) => mapInboxThreadSummary(mapRawInboxThread(thread), states.get(thread.id)))
    .filter((thread) => matchesInboxSearch(thread, searchQuery))
    .filter((thread) => {
      if (filter === "unread") {
        return !thread.isRead;
      }

      if (filter === "replied") {
        return thread.hasReplied;
      }

      if (filter === "starred") {
        return thread.isStarred;
      }

      return true;
    });

  return {
    threads: threads.slice(offset, offset + limit),
    hasMore: threads.length > offset + limit,
  };
}

function historyLabel(eventType: string) {
  switch (eventType) {
    case "opened":
      return "Opened email";
    case "clicked":
      return "Clicked link";
    case "replied":
      return "Replied";
    case "meeting_booked":
      return "Booked meeting";
    case "unsubscribed":
      return "Unsubscribed";
    case "sent":
      return "Sent email";
    case "bounced":
      return "Bounced";
    default:
      return eventType.replace(/_/g, " ");
  }
}

async function getInboxContactHistory(workspaceId: string, campaignContactId: string | null) {
  if (!campaignContactId) {
    return [] as InboxContactHistoryItem[];
  }

  const result = await createAdminSupabaseClient()
    .from("message_events")
    .select("id, event_type, occurred_at")
    .eq("workspace_id", workspaceId)
    .eq("campaign_contact_id", campaignContactId)
    .order("occurred_at", { ascending: false })
    .limit(8);

  if (result.error) {
    if (isMissingTableResult(result, "message_events")) {
      return [];
    }

    throw result.error;
  }

  return ((result.data ?? []) as Array<{
    id: string;
    event_type: string;
    occurred_at: string;
  }>).map((event) => ({
    id: event.id,
    eventType: event.event_type,
    label: historyLabel(event.event_type),
    occurredAt: event.occurred_at,
  }));
}

async function getCampaignAudienceCount(campaign: InboxCampaignSummary | null) {
  if (!campaign?.id) {
    return null;
  }

  const result = await createAdminSupabaseClient()
    .from("campaign_contacts")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaign.id);

  if (result.error) {
    return null;
  }

  return result.count ?? null;
}

export async function getInboxThreadDetail(
  workspaceId: string,
  threadId: string,
  options?: { projectId?: string },
) {
  requireSupabaseConfiguration();

  let result = await createInboxThreadDetailQuery(workspaceId, threadId, options?.projectId).maybeSingle();

  if (isMissingColumnResult(result, "campaign_contacts", "reply_disposition")) {
    let fallbackQuery = createAdminSupabaseClient()
      .from("message_threads")
      .select(inboxThreadsFallbackSelect)
      .eq("workspace_id", workspaceId)
      .eq("id", threadId) as unknown as InboxThreadDetailQuery;

    if (options?.projectId) {
      fallbackQuery = fallbackQuery.eq("project_id", options.projectId);
    }

    result = await fallbackQuery.maybeSingle();
  }

  const { data, error } = result;

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const rawThread = data as RawInboxThreadRecord;
  const [states, history] = await Promise.all([
    getInboxThreadStateMap(workspaceId, options?.projectId, [rawThread.id]),
    getInboxContactHistory(workspaceId, rawThread.campaign_contact_id ?? null),
  ]);
  const mappedThread = mapRawInboxThread(rawThread);
  const audienceCount = await getCampaignAudienceCount(mappedThread.campaign);

  return mapInboxThreadDetail(
    {
      ...mappedThread,
      campaign: mappedThread.campaign
        ? {
            ...mappedThread.campaign,
            audienceCount,
          }
        : null,
      history,
    },
    states.get(rawThread.id),
  );
}

export async function updateInboxThreadState(input: {
  workspaceId: string;
  projectId: string;
  userId: string;
  threadId: string;
  read?: boolean;
  starred?: boolean;
}) {
  requireSupabaseConfiguration();

  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const existingResult = await supabase
    .from("inbox_thread_states")
    .select("last_read_at, starred_at")
    .eq("workspace_id", input.workspaceId)
    .eq("project_id", input.projectId)
    .eq("thread_id", input.threadId)
    .maybeSingle();

  if (existingResult.error && !isMissingTableResult(existingResult, "inbox_thread_states")) {
    throw existingResult.error;
  }

  const existing = (existingResult.data ?? {}) as {
    last_read_at?: string | null;
    starred_at?: string | null;
  };
  const row = {
    workspace_id: input.workspaceId,
    project_id: input.projectId,
    thread_id: input.threadId,
    last_read_at:
      typeof input.read === "boolean"
        ? input.read
          ? now
          : null
        : existing.last_read_at ?? null,
    starred_at:
      typeof input.starred === "boolean"
        ? input.starred
          ? now
          : null
        : existing.starred_at ?? null,
    updated_by_user_id: input.userId,
  };
  const result = await supabase
    .from("inbox_thread_states")
    .upsert(row, { onConflict: "workspace_id,project_id,thread_id" })
    .select("last_read_at, starred_at, updated_by_user_id")
    .single();

  if (result.error) {
    throw result.error;
  }

  const state = result.data as {
    last_read_at?: string | null;
    starred_at?: string | null;
    updated_by_user_id?: string | null;
  };

  return {
    lastReadAt: state.last_read_at ?? null,
    starredAt: state.starred_at ?? null,
    updatedByUserId: state.updated_by_user_id ?? null,
  } satisfies InboxThreadState;
}
