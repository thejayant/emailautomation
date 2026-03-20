export type ReplyDisposition = "negative" | "booked" | "positive" | "question" | "other";

const NEGATIVE_PATTERNS = [
  /\bstop emailing\b/i,
  /\bunsubscribe\b/i,
  /\bremove me\b/i,
  /\bnot interested\b/i,
  /\bno thanks\b/i,
  /\bdo not contact\b/i,
  /\bquit reaching out\b/i,
];

const BOOKED_PATTERNS = [
  /\bbooked\b/i,
  /\bcalendar invite\b/i,
  /\bmeeting (?:is )?(?:booked|scheduled|confirmed)\b/i,
  /\bsee you (?:on|at)\b/i,
  /\bconfirmed for\b/i,
  /\bworks for me\b/i,
];

const POSITIVE_PATTERNS = [
  /\bsounds good\b/i,
  /\byes\b/i,
  /\binterested\b/i,
  /\blet'?s talk\b/i,
  /\bopen to\b/i,
];

export function classifyReplyDisposition(text?: string | null) {
  const normalized = text?.trim() ?? "";

  if (!normalized) {
    return "other" as ReplyDisposition;
  }

  if (NEGATIVE_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return "negative" as ReplyDisposition;
  }

  if (BOOKED_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return "booked" as ReplyDisposition;
  }

  if (normalized.includes("?")) {
    return "question" as ReplyDisposition;
  }

  if (POSITIVE_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return "positive" as ReplyDisposition;
  }

  return "other" as ReplyDisposition;
}
