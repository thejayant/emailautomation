import { NextResponse } from "next/server";
import { invalidateProjectReadModels } from "@/lib/cache/invalidation";
import { getWorkspaceContext } from "@/lib/db/workspace";
import { updateInboxThreadState } from "@/services/analytics-service";

type RouteParams = {
  params: Promise<{ threadId: string }>;
};

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { threadId } = await params;
    const workspace = await getWorkspaceContext();
    const payload = await request.json().catch(() => null);
    const state = await updateInboxThreadState({
      workspaceId: workspace.workspaceId,
      projectId: workspace.activeProjectId,
      userId: workspace.userId,
      threadId,
      read: typeof payload?.read === "boolean" ? payload.read : undefined,
      starred: typeof payload?.starred === "boolean" ? payload.starred : undefined,
    });

    await invalidateProjectReadModels(
      {
        userId: workspace.userId,
        workspaceId: workspace.workspaceId,
        projectId: workspace.activeProjectId,
      },
      {
        includeInbox: true,
        threadId,
      },
    );

    return NextResponse.json(state);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update inbox state." },
      { status: 500 },
    );
  }
}
