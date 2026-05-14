import { NextResponse } from "next/server";
import { invalidateProjectReadModels } from "@/lib/cache/invalidation";
import { getWorkspaceContext } from "@/lib/db/workspace";
import { inboxReplySchema } from "@/lib/zod/schemas";
import { escapeHtml, stripHtmlToText } from "@/lib/utils/html";
import { sendReplyToThread } from "@/services/gmail-service";
import { logActivity } from "@/services/activity-log-service";

const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_SIZE_BYTES = 3 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;

async function parseMultipartReply(request: Request) {
  const formData = await request.formData();
  const threadRecordId = String(formData.get("threadRecordId") ?? "");
  const bodyHtml = String(formData.get("bodyHtml") ?? "").trim();
  const bodyText = String(formData.get("body") ?? formData.get("bodyText") ?? "").trim();
  const body = bodyText || stripHtmlToText(bodyHtml);
  const files = formData.getAll("attachments").filter((value): value is File => value instanceof File && value.size > 0);

  if (files.length > MAX_ATTACHMENTS) {
    throw new Error(`You can attach up to ${MAX_ATTACHMENTS} files.`);
  }

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  if (totalSize > MAX_TOTAL_ATTACHMENT_SIZE_BYTES) {
    throw new Error("Attachments must be 10 MB or less in total.");
  }

  const attachments = await Promise.all(
    files.map(async (file) => {
      if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
        throw new Error(`${file.name} is larger than the 3 MB attachment limit.`);
      }

      return {
        filename: file.name || "attachment",
        contentType: file.type || "application/octet-stream",
        contentBase64: Buffer.from(await file.arrayBuffer()).toString("base64"),
        size: file.size,
      };
    }),
  );

  return {
    threadRecordId,
    body,
    bodyHtml: bodyHtml || `<div>${escapeHtml(body).replace(/\n/g, "<br />")}</div>`,
    attachments,
  };
}

export async function POST(request: Request) {
  const isMultipart = request.headers.get("content-type")?.toLowerCase().includes("multipart/form-data");
  const rawPayload = isMultipart ? await parseMultipartReply(request) : await request.json();
  const payload = inboxReplySchema.safeParse(rawPayload);

  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const workspace = await getWorkspaceContext();
  const attachments =
    rawPayload && typeof rawPayload === "object" && "attachments" in rawPayload
      ? rawPayload.attachments
      : undefined;
  const result = await sendReplyToThread({
    ...payload.data,
    attachments,
  });

  await logActivity({
    workspaceId: workspace.workspaceId,
    actorUserId: workspace.userId,
    action: "thread.reply_sent",
    targetType: "message_thread",
    targetId: payload.data.threadRecordId,
    metadata: { gmailMessageId: result.gmailMessageId, recipientEmail: result.recipientEmail },
  });
  await invalidateProjectReadModels(
    {
      userId: workspace.userId,
      workspaceId: workspace.workspaceId,
      projectId: workspace.activeProjectId,
    },
    {
      includeWorkspace: true,
      includeInbox: true,
      threadId: payload.data.threadRecordId,
    },
  );

  return NextResponse.json(result);
}
