import { randomUUID } from "crypto";
import { env } from "@/lib/supabase/env";
import { normalizeEmailHtmlDocument } from "@/lib/utils/html";
import {
  type MailboxProvider,
  type ProviderTokenState,
  type ReplyDetectionResult,
  type SendMessageInput,
  type SyncResult,
  type SyncThreadsInput,
} from "@/services/mailbox-providers/types";

async function createGmailClient(accessToken: string) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new Error("Google OAuth is not configured.");
  }

  const { google } = await import("googleapis");
  const auth = new google.auth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET);
  auth.setCredentials({ access_token: accessToken });

  return google.gmail({ version: "v1", auth });
}

function decodeBody(data?: string | null) {
  if (!data) {
    return null;
  }

  return Buffer.from(data, "base64url").toString("utf8");
}

function foldBase64(value: string) {
  return value.match(/.{1,76}/g)?.join("\r\n") ?? value;
}

function sanitizeMimeFilename(value: string) {
  return value.replace(/[\r\n"]/g, "_").slice(0, 140) || "attachment";
}

function buildMimeMessage(input: SendMessageInput) {
  const alternativeBoundary = `alternative_${randomUUID()}`;
  const mixedBoundary = `mixed_${randomUUID()}`;
  const encodedText = Buffer.from(input.bodyText, "utf8").toString("base64");
  const encodedHtml = Buffer.from(normalizeEmailHtmlDocument(input.bodyHtml), "utf8").toString("base64");
  const alternativePart = [
    `--${alternativeBoundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "",
    foldBase64(encodedText),
    "",
    `--${alternativeBoundary}`,
    "Content-Type: text/html; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "",
    foldBase64(encodedHtml),
    "",
    `--${alternativeBoundary}--`,
  ];
  const hasAttachments = Boolean(input.attachments?.length);
  const lines = [
    `From: ${input.fromEmail}`,
    `To: ${input.toEmail}`,
    "MIME-Version: 1.0",
    `Subject: ${input.subject}`,
    hasAttachments
      ? `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`
      : `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`,
    "",
  ];

  if (hasAttachments) {
    lines.push(
      `--${mixedBoundary}`,
      `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`,
      "",
      ...alternativePart,
      "",
    );

    for (const attachment of input.attachments ?? []) {
      const filename = sanitizeMimeFilename(attachment.filename);
      lines.push(
        `--${mixedBoundary}`,
        `Content-Type: ${attachment.contentType || "application/octet-stream"}; name="${filename}"`,
        "Content-Transfer-Encoding: base64",
        `Content-Disposition: attachment; filename="${filename}"`,
        "",
        foldBase64(attachment.contentBase64),
        "",
      );
    }

    lines.push(`--${mixedBoundary}--`);
  } else {
    lines.push(...alternativePart);
  }

  return Buffer.from(lines.join("\r\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export class GmailMailboxProvider implements MailboxProvider {
  async sendMessage(input: SendMessageInput) {
    const gmail = await createGmailClient(input.accessToken);
    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: buildMimeMessage(input),
        threadId: input.replyThreadId ?? undefined,
      },
    });

    return {
      messageId: response.data.id ?? "",
      threadId: response.data.threadId ?? input.replyThreadId ?? "",
      internalDate: new Date().toISOString(),
    };
  }

  async refreshToken(): Promise<ProviderTokenState> {
    throw new Error("Use gmail-service.refreshMailboxToken() to refresh Gmail tokens.");
  }

  async syncThreads(input: SyncThreadsInput): Promise<SyncResult> {
    const gmail = await createGmailClient(input.accessToken);
    const listResponse = await gmail.users.threads.list({
      userId: "me",
      q: "newer_than:7d",
      maxResults: 20,
    });

    const threads = await Promise.all(
      (listResponse.data.threads ?? []).map(async (thread) => {
        const detail = await gmail.users.threads.get({
          userId: "me",
          id: thread.id ?? undefined,
          format: "full",
        });

        return {
          providerThreadId: detail.data.id ?? "",
          messages: (detail.data.messages ?? []).map((message) => {
            const headers = Object.fromEntries(
              (message.payload?.headers ?? []).map((header) => [
                header.name ?? "",
                header.value ?? "",
              ]),
            );
            const fromEmail = headers.From ?? null;
            const toEmails = headers.To ? headers.To.split(",").map((value) => value.trim()) : [];
            const bodyText =
              decodeBody(message.payload?.body?.data) ??
              decodeBody(message.payload?.parts?.find((part) => part.mimeType === "text/plain")?.body?.data);
            const bodyHtml =
              decodeBody(message.payload?.parts?.find((part) => part.mimeType === "text/html")?.body?.data) ??
              decodeBody(message.payload?.body?.data);

            return {
              providerMessageId: message.id ?? "",
              direction: fromEmail?.includes(input.userEmail)
                ? ("outbound" as const)
                : ("inbound" as const),
              fromEmail: fromEmail ?? null,
              toEmails,
              subject: headers.Subject ?? null,
              snippet: message.snippet ?? null,
              bodyText,
              bodyHtml,
              sentAt: new Date(Number(message.internalDate ?? Date.now())).toISOString(),
              headers,
            };
          }),
        };
      }),
    );

    return {
      syncCursor: listResponse.data.resultSizeEstimate?.toString() ?? input.syncCursor ?? null,
      threads,
    };
  }

  async detectReplies(input: SyncResult): Promise<ReplyDetectionResult[]> {
    return input.threads.flatMap((thread) =>
      thread.messages
        .filter((message) => message.direction === "inbound")
        .map((message) => ({
          providerThreadId: thread.providerThreadId,
          providerMessageId: message.providerMessageId,
          sentAt: message.sentAt,
          fromEmail: message.fromEmail,
        })),
    );
  }
}
