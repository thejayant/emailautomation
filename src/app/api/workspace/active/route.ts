import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { setActiveWorkspace } from "@/lib/db/workspace";

export async function POST(request: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "No authenticated session found." }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  const body =
    contentType.includes("application/json")
      ? await request.json()
      : Object.fromEntries((await request.formData()).entries());
  const workspaceId = String(body.workspaceId ?? "");

  if (!workspaceId) {
    return NextResponse.json({ error: "Workspace ID is required." }, { status: 400 });
  }

  try {
    const result = await setActiveWorkspace(user.id, workspaceId);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to switch workspace.";
    return NextResponse.json({ error: message }, { status: /denied/i.test(message) ? 403 : 500 });
  }
}
