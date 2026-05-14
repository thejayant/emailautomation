export type InboxThreadMessage = {
  id: string;
  direction: string;
  from_email: string | null;
  to_emails?: string[] | null;
  subject: string | null;
  snippet?: string | null;
  body_text: string | null;
  body_html?: string | null;
  sent_at: string;
};

export type InboxThreadState = {
  lastReadAt: string | null;
  starredAt: string | null;
  updatedByUserId?: string | null;
};

export type InboxContactSummary = {
  id: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  jobTitle: string | null;
  website: string | null;
};

export type InboxCampaignSummary = {
  id: string | null;
  name: string | null;
  status: string | null;
  createdAt: string | null;
  audienceCount?: number | null;
};

export type InboxContactHistoryItem = {
  id: string;
  eventType: string;
  label: string;
  occurredAt: string;
};

export type InboxThreadSummary = {
  id: string;
  subject: string | null;
  senderEmail: string | null;
  receivedAt: string | null;
  snippet: string | null;
  messageCount: number;
  isRead: boolean;
  isStarred: boolean;
  hasReplied: boolean;
  latestDirection: string | null;
  replyDisposition: string | null;
};

export type InboxThreadDetail = {
  id: string;
  subject: string | null;
  latestMessageAt: string | null;
  campaignContactId: string | null;
  campaignStatus: string | null;
  replyDisposition: string | null;
  renderedMessage: InboxThreadMessage | null;
  messages: InboxThreadMessage[];
  state: InboxThreadState;
  contact: InboxContactSummary | null;
  campaign: InboxCampaignSummary | null;
  history: InboxContactHistoryItem[];
  isRead: boolean;
  isStarred: boolean;
};

type InboxThreadRecord = {
  id: string;
  subject: string | null;
  snippet?: string | null;
  latest_message_at: string | null;
  campaign_contact_id?: string | null;
  campaign_status?: string | null;
  reply_disposition?: string | null;
  messages?: InboxThreadMessage[] | null;
  contact?: InboxContactSummary | null;
  campaign?: InboxCampaignSummary | null;
  history?: InboxContactHistoryItem[] | null;
};

function sortMessagesNewestFirst(messages: InboxThreadMessage[]) {
  return [...messages].sort((left, right) => {
    const rightTimestamp = Date.parse(right.sent_at);
    const leftTimestamp = Date.parse(left.sent_at);
    return rightTimestamp - leftTimestamp;
  });
}

export function sortMessagesOldestFirst(messages: InboxThreadMessage[]) {
  return [...messages].sort((left, right) => {
    const rightTimestamp = Date.parse(right.sent_at);
    const leftTimestamp = Date.parse(left.sent_at);
    return leftTimestamp - rightTimestamp;
  });
}

function getLatestInboundMessage(messages: InboxThreadMessage[]) {
  return sortMessagesNewestFirst(messages).find((message) => message.direction === "inbound") ?? null;
}

function getLatestMessage(messages: InboxThreadMessage[]) {
  return sortMessagesNewestFirst(messages)[0] ?? null;
}

export function selectInboxDisplayMessage(messages: InboxThreadMessage[] | null | undefined) {
  const sortedMessages = sortMessagesNewestFirst(messages ?? []);
  const latestInboundMessage = sortedMessages.find((message) => message.direction === "inbound");
  return latestInboundMessage ?? sortedMessages[0] ?? null;
}

function hasWorkspaceReplyAfterInbound(messages: InboxThreadMessage[]) {
  const latestInbound = getLatestInboundMessage(messages);

  if (!latestInbound) {
    return false;
  }

  const latestInboundTimestamp = Date.parse(latestInbound.sent_at);
  return messages.some(
    (message) =>
      message.direction === "outbound" &&
      Date.parse(message.sent_at) > latestInboundTimestamp,
  );
}

export function isThreadRead(messages: InboxThreadMessage[], state?: InboxThreadState | null) {
  const latestInbound = getLatestInboundMessage(messages);

  if (!latestInbound) {
    return true;
  }

  if (!state?.lastReadAt) {
    return false;
  }

  return Date.parse(state.lastReadAt) >= Date.parse(latestInbound.sent_at);
}

export function mapInboxThreadSummary(
  thread: InboxThreadRecord,
  state: InboxThreadState = { lastReadAt: null, starredAt: null },
): InboxThreadSummary {
  const messages = thread.messages ?? [];
  const displayMessage = selectInboxDisplayMessage(messages);
  const latestMessage = getLatestMessage(messages);

  return {
    id: thread.id,
    subject: thread.subject ?? displayMessage?.subject ?? null,
    senderEmail: displayMessage?.from_email ?? null,
    receivedAt: displayMessage?.sent_at ?? thread.latest_message_at ?? null,
    snippet: displayMessage?.snippet ?? displayMessage?.body_text ?? thread.snippet ?? null,
    messageCount: messages.length,
    isRead: isThreadRead(messages, state),
    isStarred: Boolean(state.starredAt),
    hasReplied: hasWorkspaceReplyAfterInbound(messages) || Boolean(thread.reply_disposition),
    latestDirection: latestMessage?.direction ?? null,
    replyDisposition: thread.reply_disposition ?? null,
  };
}

export function mapInboxThreadDetail(
  thread: InboxThreadRecord,
  state: InboxThreadState = { lastReadAt: null, starredAt: null },
): InboxThreadDetail {
  const messages = sortMessagesOldestFirst(thread.messages ?? []);
  const renderedMessage = selectInboxDisplayMessage(messages);

  return {
    id: thread.id,
    subject: thread.subject ?? renderedMessage?.subject ?? null,
    latestMessageAt: thread.latest_message_at ?? renderedMessage?.sent_at ?? null,
    campaignContactId: thread.campaign_contact_id ?? null,
    campaignStatus: thread.campaign_status ?? null,
    replyDisposition: thread.reply_disposition ?? null,
    renderedMessage,
    messages,
    state,
    contact: thread.contact ?? null,
    campaign: thread.campaign ?? null,
    history: thread.history ?? [],
    isRead: isThreadRead(messages, state),
    isStarred: Boolean(state.starredAt),
  };
}
