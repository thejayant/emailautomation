import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { requireSupabaseConfiguration } from "@/lib/supabase/env";
import type { ContactRecord } from "@/lib/types/contact";
import { googleSheetsUrlToCsvUrl, parseImportFile, type ParsedImportRow } from "@/lib/utils/imports";

export function mapImportRow(row: ParsedImportRow) {
  const entries = Object.entries(row);
  const email = entries.find(([key]) => key.toLowerCase().includes("email"))?.[1] ?? null;

  if (!email) {
    return null;
  }

  const firstName =
    entries.find(([key]) => key.toLowerCase().includes("first"))?.[1] ??
    entries.find(([key]) => key.toLowerCase() === "name")?.[1] ??
    null;

  return {
    email,
    first_name: firstName,
    last_name: entries.find(([key]) => key.toLowerCase().includes("last"))?.[1] ?? null,
    company: entries.find(([key]) => key.toLowerCase().includes("company"))?.[1] ?? null,
    website: entries.find(([key]) => key.toLowerCase().includes("website"))?.[1] ?? null,
    job_title: entries.find(([key]) => key.toLowerCase().includes("title"))?.[1] ?? null,
    custom_fields_jsonb: Object.fromEntries(
      entries.filter(([key]) => {
        const lower = key.toLowerCase();
        return !["email", "first_name", "last_name", "company", "website", "title"].includes(
          lower,
        );
      }),
    ),
  };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

type ImportContactPayload = {
  workspace_id: string;
  owner_user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  website: string | null;
  job_title: string | null;
  source: "csv" | "xlsx" | "google_sheets";
  custom_fields_jsonb: Record<string, string | null>;
};

export async function listContacts(workspaceId: string) {
  requireSupabaseConfiguration();

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("id, email, first_name, last_name, company, source, unsubscribed_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    throw error;
  }

  return data as ContactRecord[];
}

export async function createManualContact(input: {
  workspaceId: string;
  userId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  website?: string | null;
  jobTitle?: string | null;
}) {
  requireSupabaseConfiguration();

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("contacts")
    .insert({
      workspace_id: input.workspaceId,
      owner_user_id: input.userId,
      email: normalizeEmail(input.email),
      first_name: input.firstName?.trim() || null,
      last_name: input.lastName?.trim() || null,
      company: input.company?.trim() || null,
      website: input.website?.trim() || null,
      job_title: input.jobTitle?.trim() || null,
      source: "manual",
    })
    .select("id, email, first_name, last_name, company, source, unsubscribed_at")
    .single();

  if (error) {
    if (/duplicate key value/i.test(error.message)) {
      throw new Error("Contact already exists in this workspace.");
    }

    throw error;
  }

  return data as ContactRecord;
}

export async function listImports(workspaceId: string) {
  requireSupabaseConfiguration();

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("imports")
    .select("id, file_name, source_type, status, imported_count, created_at")
    .eq("workspace_id", workspaceId)
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

export async function processImportFile(input: {
  workspaceId: string;
  userId: string;
  fileName: string;
  fileBuffer: ArrayBuffer;
  storagePath?: string | null;
  sourceType: "csv" | "xlsx" | "google_sheets";
}) {
  const rows = await parseImportFile(input.fileName, input.fileBuffer);

  if (!rows.length) {
    throw new Error("No rows found in the import file.");
  }

  requireSupabaseConfiguration();

  const supabase = createAdminSupabaseClient();
  const { data: rawImportRecord, error } = await supabase
    .from("imports")
    .insert({
      workspace_id: input.workspaceId,
      owner_user_id: input.userId,
      file_name: input.fileName,
      source_type: input.sourceType,
      status: "uploaded",
      imported_count: 0,
      storage_path: input.storagePath ?? null,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }
  const importRecord = rawImportRecord as { id: string };

  const rowInserts = rows.map((row, index) => ({
    import_id: importRecord.id,
    row_number: index + 1,
    raw_payload: row,
    mapped_payload: mapImportRow(row),
    status: mapImportRow(row) ? "imported" : "failed",
    error_message: mapImportRow(row) ? null : "Missing email column",
  }));

  await supabase.from("import_rows").insert(rowInserts);

  const mappedRows = rows
    .map(mapImportRow)
    .filter((row): row is NonNullable<ReturnType<typeof mapImportRow>> => Boolean(row));

  const dedupedContacts = Array.from(
    mappedRows.reduce((accumulator, row) => {
      accumulator.set(normalizeEmail(String(row.email)), {
        workspace_id: input.workspaceId,
        owner_user_id: input.userId,
        email: normalizeEmail(String(row.email)),
        first_name: row.first_name,
        last_name: row.last_name,
        company: row.company,
        website: row.website,
        job_title: row.job_title,
        source: input.sourceType,
        custom_fields_jsonb: row.custom_fields_jsonb,
      });
      return accumulator;
    }, new Map<string, ImportContactPayload>()),
  ).map(([, value]) => value);

  if (dedupedContacts.length) {
    const emails = dedupedContacts.map((contact) => contact.email);
    const { data: existingContacts, error: existingContactsError } = await supabase
      .from("contacts")
      .select("id, email")
      .eq("workspace_id", input.workspaceId)
      .in("email", emails);

    if (existingContactsError) {
      throw existingContactsError;
    }

    const existingByEmail = new Map(
      ((existingContacts as Array<{ id: string; email: string }> | null) ?? []).map((contact) => [
        normalizeEmail(contact.email),
        contact.id,
      ]),
    );

    const contactsToInsert = dedupedContacts.filter((contact) => !existingByEmail.has(contact.email));
    const contactsToUpdate = dedupedContacts.filter((contact) => existingByEmail.has(contact.email));

    if (contactsToInsert.length) {
      const { error: insertError } = await supabase.from("contacts").insert(contactsToInsert);

      if (insertError) {
        throw insertError;
      }
    }

    for (const contact of contactsToUpdate) {
      const existingContactId = existingByEmail.get(contact.email);

      if (!existingContactId) {
        continue;
      }

      const { error: updateError } = await supabase
        .from("contacts")
        .update({
          first_name: contact.first_name,
          last_name: contact.last_name,
          company: contact.company,
          website: contact.website,
          job_title: contact.job_title,
          source: contact.source,
          custom_fields_jsonb: contact.custom_fields_jsonb,
        })
        .eq("id", existingContactId);

      if (updateError) {
        throw updateError;
      }
    }
  }

  await supabase
    .from("imports")
    .update({
      status: "processed",
      imported_count: dedupedContacts.length,
    })
    .eq("id", importRecord.id);

  return {
    importId: importRecord.id,
    headers: Object.keys(rows[0] ?? {}),
    totalRows: rows.length,
    importedCount: dedupedContacts.length,
  };
}

export async function importFromGoogleSheet(input: {
  workspaceId: string;
  userId: string;
  url: string;
}) {
  const csvUrl = googleSheetsUrlToCsvUrl(input.url);
  const response = await fetch(csvUrl);

  if (!response.ok) {
    throw new Error("Failed to fetch Google Sheet as CSV.");
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("text/html")) {
    throw new Error("Google Sheet is not public or could not be exported as CSV.");
  }

  const buffer = await response.arrayBuffer();

  return processImportFile({
    workspaceId: input.workspaceId,
    userId: input.userId,
    fileName: "google-sheet.csv",
    fileBuffer: buffer,
    sourceType: "google_sheets",
  });
}
