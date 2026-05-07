import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { requireSupabaseConfiguration } from "@/lib/supabase/env";
import type { ContactRecord, ContactTag } from "@/lib/types/contact";

const CONTACT_SELECT =
  "id, email, first_name, last_name, company, website, job_title, source, unsubscribed_at, custom_fields_jsonb, contact_tag_members(contact_tags(id, name))";
const CONTACT_SELECT_FALLBACK =
  "id, email, first_name, last_name, company, website, job_title, source, unsubscribed_at, custom_fields_jsonb";

type NestedContactTagMember =
  | {
      contact_tags?:
        | {
            id: string;
            name: string;
          }
        | Array<{
            id: string;
            name: string;
          }>
        | null;
    }
  | null;

function mapNestedTags(members: NestedContactTagMember[] | null | undefined): ContactTag[] {
  return (members ?? []).flatMap((member) => {
    const tagValue = member?.contact_tags;

    if (!tagValue) {
      return [];
    }

    return Array.isArray(tagValue) ? tagValue : [tagValue];
  });
}

function mapContactRecord(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    email: String(row.email),
    first_name: (row.first_name as string | null | undefined) ?? null,
    last_name: (row.last_name as string | null | undefined) ?? null,
    company: (row.company as string | null | undefined) ?? null,
    website: (row.website as string | null | undefined) ?? null,
    job_title: (row.job_title as string | null | undefined) ?? null,
    source: (row.source as string | null | undefined) ?? null,
    unsubscribed_at: (row.unsubscribed_at as string | null | undefined) ?? null,
    custom_fields_jsonb: (row.custom_fields_jsonb as Record<string, unknown> | null | undefined) ?? null,
    tags: mapNestedTags(row.contact_tag_members as NestedContactTagMember[] | null | undefined),
  } satisfies ContactRecord;
}

function isSchemaCacheError(error: { message?: string | null; details?: string | null; hint?: string | null } | null | undefined) {
  const parts = [error?.message, error?.details, error?.hint].filter(Boolean).join(" ").toLowerCase();
  return (
    parts.includes("schema cache") ||
    parts.includes("could not find the table") ||
    parts.includes("could not find the relation") ||
    parts.includes("could not find the column") ||
    parts.includes("contact_tags") ||
    parts.includes("contact_tag_members")
  );
}

async function selectContactsWithTags(input: {
  workspaceId?: string;
  projectId?: string;
  contactIds?: string[];
}) {
  const supabase = createAdminSupabaseClient();
  let query = supabase.from("contacts").select(CONTACT_SELECT);

  if (input.workspaceId) {
    query = query.eq("workspace_id", input.workspaceId);
  }

  if (input.projectId) {
    query = query.eq("project_id", input.projectId);
  }

  if (input.contactIds?.length) {
    query = query.in("id", input.contactIds);
  }

  query = query.order("created_at", { ascending: false });

  let { data, error } = await query;

  if (error && isSchemaCacheError(error)) {
    let fallbackQuery = supabase.from("contacts").select(CONTACT_SELECT_FALLBACK);

    if (input.workspaceId) {
      fallbackQuery = fallbackQuery.eq("workspace_id", input.workspaceId);
    }

    if (input.projectId) {
      fallbackQuery = fallbackQuery.eq("project_id", input.projectId);
    }

    if (input.contactIds?.length) {
      fallbackQuery = fallbackQuery.in("id", input.contactIds);
    }

    fallbackQuery = fallbackQuery.order("created_at", { ascending: false });

    const fallbackResult = await fallbackQuery;
    data = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (error) {
    throw error;
  }

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    ...mapContactRecord(row),
    tags: Array.isArray(row.contact_tag_members) ? mapNestedTags(row.contact_tag_members as NestedContactTagMember[]) : [],
  }));
}

export async function listContacts(workspaceId: string, projectId: string) {
  requireSupabaseConfiguration();
  return selectContactsWithTags({ workspaceId, projectId });
}

export async function listWorkspaceContactTags(workspaceId: string, projectId: string) {
  requireSupabaseConfiguration();

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("contact_tags")
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .eq("project_id", projectId)
    .order("name", { ascending: true });

  if (error) {
    if (isSchemaCacheError(error)) {
      return [];
    }
    throw error;
  }

  return (data ?? []) as ContactTag[];
}

export async function listImports(workspaceId: string, projectId: string) {
  requireSupabaseConfiguration();

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("imports")
    .select("id, file_name, source_type, status, imported_count, created_at")
    .eq("workspace_id", workspaceId)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data as Array<{
    id: string;
    file_name: string | null;
    source_type: string;
    status: string;
    imported_count: number;
    created_at?: string;
  }>;
}
