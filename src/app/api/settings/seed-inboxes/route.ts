import { NextResponse } from "next/server";
import { getWorkspaceContext } from "@/lib/db/workspace";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const workspace = await getWorkspaceContext();

  if (!["owner", "admin"].includes(workspace.workspaceRole)) {
    return NextResponse.json({ error: "Only workspace admins can manage seed inboxes." }, { status: 403 });
  }

  const formData = await request.formData();
  const inboxId = String(formData.get("seedInboxId") ?? "").trim();
  const provider = String(formData.get("provider") ?? "").trim();
  const emailAddress = String(formData.get("emailAddress") ?? "").trim().toLowerCase();
  const status = String(formData.get("status") ?? "active").trim() || "active";
  const supabase = createAdminSupabaseClient();

  if (inboxId) {
    const { error } = await supabase
      .from("seed_inboxes")
      .update({ status })
      .eq("workspace_id", workspace.workspaceId)
      .eq("id", inboxId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.redirect(new URL("/settings", request.url), { status: 303 });
  }

  if (!provider || !emailAddress) {
    return NextResponse.json({ error: "Provider and email address are required." }, { status: 400 });
  }

  const { error } = await supabase.from("seed_inboxes").insert({
    workspace_id: workspace.workspaceId,
    provider,
    email_address: emailAddress,
    status,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.redirect(new URL("/settings", request.url), { status: 303 });
}
