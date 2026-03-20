import { NextResponse } from "next/server";
import { getWorkspaceContext } from "@/lib/db/workspace";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const workspace = await getWorkspaceContext();

  if (!["owner", "admin"].includes(workspace.workspaceRole)) {
    return NextResponse.json({ error: "Only workspace admins can update billing settings." }, { status: 403 });
  }

  const formData = await request.formData();
  const planKey = String(formData.get("planKey") ?? "").trim();
  const status = String(formData.get("status") ?? "active").trim() || "active";

  if (!planKey) {
    return NextResponse.json({ error: "Plan key is required." }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  const { error } = await (supabase.from("workspace_billing_accounts") as unknown as {
    upsert: (
      value: Record<string, unknown>,
      options?: Record<string, unknown>,
    ) => Promise<{ error: { message: string } | null }>;
  }).upsert(
    {
      workspace_id: workspace.workspaceId,
      provider: "internal",
      status,
      plan_key: planKey,
      assigned_by_user_id: workspace.userId,
      assigned_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.redirect(new URL("/settings", request.url), { status: 303 });
}
