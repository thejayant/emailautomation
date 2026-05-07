import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { requireSupabaseConfiguration } from "@/lib/supabase/env";
import { dedupeTemplates, type TemplateListItem } from "@/lib/templates/gallery";
import { isAnyMissingColumnResult } from "@/lib/utils/supabase-schema";
import { getSeedTemplateDefinitions } from "@/services/template-seed-service";

type ListedTemplateRecord = {
  id: string;
  name: string;
  subject_template: string;
  body_template: string;
  body_html_template?: string | null;
  preview_text?: string | null;
  category?: string | null;
  tags?: string[] | null;
  design_preset?: string | null;
  is_system_template?: boolean | null;
  system_key?: string | null;
  created_at: string;
};

function getSeedTemplateLookup() {
  return new Map(
    getSeedTemplateDefinitions().map((template) => [
      `${template.name}::${template.subjectTemplate}`,
      template,
    ]),
  );
}

function isLegacyIntroTemplate(template: ListedTemplateRecord) {
  return (
    template.name === "Intro Outreach" &&
    template.subject_template === "Quick idea for {{company}}" &&
    template.body_template.includes("Short, warm outreach designed to feel personal instead of automated.") &&
    template.body_template.includes("We usually help teams tighten three things first:")
  );
}

function hydrateListedTemplates(templates: ListedTemplateRecord[]) {
  const seedLookup = getSeedTemplateLookup();
  const hydrated = templates.map((template) => {
    const seedTemplate = seedLookup.get(
      `${template.name}::${template.subject_template}`,
    );

    return {
      ...template,
      body_html_template: template.body_html_template ?? seedTemplate?.bodyHtmlTemplate ?? null,
      preview_text: template.preview_text ?? seedTemplate?.previewText ?? template.body_template.slice(0, 180),
      category: template.category ?? seedTemplate?.category ?? null,
      tags: template.tags ?? seedTemplate?.tags ?? [],
      design_preset: template.design_preset ?? seedTemplate?.designPreset ?? null,
      is_system_template: Boolean(template.is_system_template ?? seedTemplate),
      system_key: template.system_key ?? null,
    };
  });

  const hasShelterScoreTemplate = hydrated.some(
    (template) => template.name === "Shelter Score Launch Template",
  );

  if (!hasShelterScoreTemplate) {
    return hydrated;
  }

  return hydrated.filter((template) => !isLegacyIntroTemplate(template));
}

function isCampaignSchemaCacheError(error: { message?: string | null; details?: string | null; hint?: string | null } | null | undefined) {
  const parts = [error?.message, error?.details, error?.hint].filter(Boolean).join(" ").toLowerCase();
  const knownLaunchColumns = [
    "body_html_template",
    "preview_text",
    "workflow_definition_jsonb",
    "reply_disposition",
    "meeting_booked_at",
    "exit_reason",
    "current_node_key",
    "branch_history_jsonb",
  ];

  return (
    parts.includes("schema cache") ||
    parts.includes("could not find the column") ||
    knownLaunchColumns.some((column) => parts.includes(column)) ||
    /column\s+[a-z0-9_]+(?:_[0-9]+)?\.[a-z0-9_]+\s+does not exist/.test(parts)
  );
}

function isCampaignSchemaResult(
  result: {
    error?: { message?: string | null; details?: string | null; hint?: string | null } | null;
    status?: number | null;
    data?: unknown;
  } | null | undefined,
) {
  return (
    isCampaignSchemaCacheError(result?.error) ||
    isAnyMissingColumnResult(result, [
      { table: "campaigns", column: "workflow_definition_jsonb" },
      { table: "campaign_steps", column: "body_html_template" },
      { table: "templates", column: "body_html_template" },
      { table: "templates", column: "preview_text" },
      { table: "campaign_contacts", column: "current_node_key" },
      { table: "campaign_contacts", column: "branch_history_jsonb" },
      { table: "campaign_contacts", column: "reply_disposition" },
      { table: "campaign_contacts", column: "meeting_booked_at" },
      { table: "campaign_contacts", column: "exit_reason" },
    ])
  );
}

export async function listTemplates(workspaceId: string, projectId: string) {
  requireSupabaseConfiguration();

  const supabase = createAdminSupabaseClient();
  let result = await supabase
    .from("templates")
    .select("id, name, subject_template, body_template, body_html_template, preview_text, category, tags, design_preset, is_system_template, system_key, created_at")
    .eq("workspace_id", workspaceId)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (isCampaignSchemaResult(result)) {
    result = await supabase
      .from("templates")
      .select("id, name, subject_template, body_template, created_at")
      .eq("workspace_id", workspaceId)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
  }

  if (result.error) {
    throw result.error;
  }

  return dedupeTemplates(
    hydrateListedTemplates((result.data ?? []) as ListedTemplateRecord[]) as TemplateListItem[],
  );
}

export async function listCampaigns(workspaceId: string, projectId: string) {
  requireSupabaseConfiguration();

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select("id, name, status, daily_send_limit, timezone, created_at")
    .eq("workspace_id", workspaceId)
    .eq("project_id", projectId)
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
