"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bold,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Inbox,
  Italic,
  Link as LinkIcon,
  List,
  Mail,
  MailOpen,
  MoreVertical,
  MousePointerClick,
  Paperclip,
  Reply,
  Search,
  Send,
  SlidersHorizontal,
  Smile,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { productContent } from "@/content/product";
import { SafeHtmlContent } from "@/components/shared/safe-html-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { invalidateAppData } from "@/lib/app-data/client";
import type { InboxThreadDetail, InboxThreadSummary } from "@/lib/inbox/threads";
import { cn } from "@/lib/utils";

type InboxFilter = "all" | "unread" | "replied" | "starred";

const FILTERS: Array<{ id: InboxFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "replied", label: "Replied" },
  { id: "starred", label: "Starred" },
];

function formatThreadDate(value: string | null | undefined) {
  if (!value) {
    return "No date";
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(parsed));
}

function formatThreadTime(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(parsed));
}

function formatThreadDateTime(value: string | null | undefined) {
  if (!value) {
    return "No date";
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(parsed));
}

function displayNameFromEmail(email: string | null | undefined) {
  if (!email) {
    return "Unknown sender";
  }

  const localPart = email.split("@")[0] ?? email;
  return localPart
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getInitials(value: string | null | undefined) {
  const source = value?.trim() || "Unknown";
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

function contactName(thread: InboxThreadDetail | null) {
  const contact = thread?.contact;
  const name = [contact?.firstName, contact?.lastName].filter(Boolean).join(" ").trim();
  return name || displayNameFromEmail(contact?.email ?? thread?.renderedMessage?.from_email);
}

function eventIcon(eventType: string) {
  if (eventType === "opened") {
    return <MailOpen className="size-4" />;
  }

  if (eventType === "clicked") {
    return <MousePointerClick className="size-4" />;
  }

  if (eventType === "replied") {
    return <Reply className="size-4" />;
  }

  return <CheckCircle2 className="size-4" />;
}

function statusBadge(thread: InboxThreadSummary | InboxThreadDetail | null) {
  if (!thread) {
    return null;
  }

  if ("hasReplied" in thread && thread.hasReplied) {
    return <Badge className="bg-[#e3f2ff] text-[#357ac0]">Replied</Badge>;
  }

  if (!thread.isRead) {
    return <Badge variant="warning">Unread</Badge>;
  }

  return <Badge variant="neutral">Read</Badge>;
}

export function ThreadViewer({
  initialThreads,
  initialSelectedThread,
  initialHasMore,
}: {
  initialThreads: InboxThreadSummary[];
  initialSelectedThread: InboxThreadDetail | null;
  initialHasMore: boolean;
}) {
  const router = useRouter();
  const [threads, setThreads] = useState(initialThreads);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(
    initialSelectedThread?.id ?? initialThreads[0]?.id ?? null,
  );
  const [threadCache, setThreadCache] = useState<Record<string, InboxThreadDetail>>(
    initialSelectedThread ? { [initialSelectedThread.id]: initialSelectedThread } : {},
  );
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [search, setSearch] = useState("");
  const [draftText, setDraftText] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isListLoading, setIsListLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const composerRef = useRef<HTMLDivElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const viewerCopy = productContent.inbox.viewer;
  const selectedSummary = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) ?? threads[0] ?? null,
    [selectedThreadId, threads],
  );
  const selectedThread = useMemo(
    () => (selectedThreadId ? threadCache[selectedThreadId] ?? null : null),
    [selectedThreadId, threadCache],
  );
  const firstMessage = selectedThread?.messages[0] ?? null;
  const lastMessage = selectedThread?.messages.at(-1) ?? selectedThread?.renderedMessage ?? null;

  useEffect(() => {
    const nextSelectedThreadId = selectedThreadId ?? threads[0]?.id ?? null;

    if (!nextSelectedThreadId || threadCache[nextSelectedThreadId]) {
      return;
    }

    let cancelled = false;
    setIsDetailLoading(true);

    fetch(`/api/inbox/threads/${nextSelectedThreadId}`)
      .then(async (response) => {
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.error ?? "Failed to load the selected thread.");
        }

        return payload as InboxThreadDetail;
      })
      .then((payload) => {
        if (cancelled) {
          return;
        }

        setThreadCache((current) => ({
          ...current,
          [payload.id]: payload,
        }));
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Failed to load the selected thread.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsDetailLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedThreadId, threadCache, threads]);

  function patchThreadState(threadId: string, updates: { read?: boolean; starred?: boolean }) {
    setThreads((current) =>
      current.map((thread) =>
        thread.id === threadId
          ? {
              ...thread,
              isRead: typeof updates.read === "boolean" ? updates.read : thread.isRead,
              isStarred: typeof updates.starred === "boolean" ? updates.starred : thread.isStarred,
            }
          : thread,
      ),
    );
    setThreadCache((current) => {
      const thread = current[threadId];

      if (!thread) {
        return current;
      }

      return {
        ...current,
        [threadId]: {
          ...thread,
          isRead: typeof updates.read === "boolean" ? updates.read : thread.isRead,
          isStarred: typeof updates.starred === "boolean" ? updates.starred : thread.isStarred,
          state: {
            ...thread.state,
            lastReadAt:
              typeof updates.read === "boolean"
                ? updates.read
                  ? new Date().toISOString()
                  : null
                : thread.state.lastReadAt,
            starredAt:
              typeof updates.starred === "boolean"
                ? updates.starred
                  ? new Date().toISOString()
                  : null
                : thread.state.starredAt,
          },
        },
      };
    });

    fetch(`/api/inbox/threads/${threadId}/state`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    }).catch(() => {
      toast.error("Failed to update inbox state.");
      invalidateAppData("inbox");
      router.refresh();
    });
  }

  function selectThread(thread: InboxThreadSummary) {
    setSelectedThreadId(thread.id);

    if (!thread.isRead) {
      patchThreadState(thread.id, { read: true });
    }
  }

  function loadThreads(input?: { reset?: boolean; nextFilter?: InboxFilter; nextSearch?: string }) {
    const nextFilter = input?.nextFilter ?? filter;
    const nextSearch = input?.nextSearch ?? search;
    const offset = input?.reset ? 0 : threads.length;
    setIsListLoading(true);

    fetch(
      `/api/inbox/threads?limit=10&offset=${offset}&filter=${encodeURIComponent(nextFilter)}&q=${encodeURIComponent(nextSearch)}`,
    )
      .then(async (response) => {
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.error ?? "Failed to load inbox threads.");
        }

        return payload as { threads: InboxThreadSummary[]; hasMore: boolean };
      })
      .then((payload) => {
        setThreads((current) => (input?.reset ? payload.threads : [...current, ...payload.threads]));
        setHasMore(payload.hasMore);

        if (input?.reset) {
          const nextSelected = payload.threads[0]?.id ?? null;
          setSelectedThreadId(nextSelected);
          setThreadCache((current) =>
            nextSelected && current[nextSelected] ? { [nextSelected]: current[nextSelected] } : {},
          );
        }
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Failed to load inbox threads.");
      })
      .finally(() => {
        setIsListLoading(false);
      });
  }

  function runComposerCommand(command: string, value?: string) {
    composerRef.current?.focus();
    document.execCommand(command, false, value);
    setDraftText(composerRef.current?.innerText.trim() ?? "");
  }

  async function sendReply() {
    if (!selectedThread || isSendingReply) {
      return;
    }

    const bodyText = composerRef.current?.innerText.trim() ?? "";
    const bodyHtml = composerRef.current?.innerHTML.trim() ?? "";

    if (bodyText.length < 3) {
      toast.error("Write at least 3 characters before sending.");
      return;
    }

    setIsSendingReply(true);
    const formData = new FormData();
    formData.set("threadRecordId", selectedThread.id);
    formData.set("body", bodyText);
    formData.set("bodyHtml", bodyHtml);
    attachments.forEach((file) => formData.append("attachments", file, file.name));

    const response = await fetch("/api/inbox/reply", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      toast.error(error?.error ?? viewerCopy.sendReplyError);
      setIsSendingReply(false);
      return;
    }

    if (composerRef.current) {
      composerRef.current.innerHTML = "";
    }

    setDraftText("");
    setAttachments([]);
    patchThreadState(selectedThread.id, { read: true });
    invalidateAppData(["inbox", "dashboard", "analytics"]);
    startTransition(() => router.refresh());
    toast.success(viewerCopy.sendReplySuccess);
    setIsSendingReply(false);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(21rem,24rem)_minmax(0,1fr)_minmax(18rem,20rem)]">
      <section className="solid-content overflow-hidden rounded-[24px]">
        <div className="border-b border-border/70 p-4">
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              loadThreads({ reset: true, nextSearch: search });
            }}
          >
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search threads..."
                className="h-11 pl-10"
              />
            </div>
            <Button type="submit" variant="outline" size="sm" aria-label="Search threads">
              <SlidersHorizontal className="size-4" />
            </Button>
          </form>
          <div className="mt-4 flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setFilter(item.id);
                  loadThreads({ reset: true, nextFilter: item.id });
                }}
                className={cn(
                  "rounded-[0.85rem] border px-3 py-2 text-sm font-semibold transition",
                  filter === item.id
                    ? "border-[rgba(123,63,242,0.22)] bg-accent text-accent-foreground shadow-[0_12px_24px_rgba(123,63,242,0.1)]"
                    : "border-border bg-white/72 text-muted-foreground hover:bg-white hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-[min(44rem,calc(100vh-16rem))] overflow-y-auto">
          {threads.length ? (
            <div className="divide-y divide-border/70">
              {threads.map((thread) => {
                const senderName = displayNameFromEmail(thread.senderEmail);
                const selected = selectedThreadId === thread.id;

                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => selectThread(thread)}
                    className={cn(
                      "group relative flex w-full gap-3 px-4 py-4 text-left transition hover:bg-white",
                      selected ? "bg-[linear-gradient(90deg,rgba(240,233,255,0.86),rgba(255,255,255,0.96))]" : "bg-white/38",
                    )}
                  >
                    {selected ? <span className="absolute bottom-0 right-0 top-0 w-1 bg-[#d8258f]" /> : null}
                    <span className="mt-1 size-4 rounded-[0.35rem] border border-border bg-white" />
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#efe7ff,#dcd0ff)] text-xs font-bold text-accent-foreground">
                      {getInitials(senderName)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-3">
                        <span className={cn("truncate text-sm", thread.isRead ? "font-semibold" : "font-bold")}>
                          {senderName}
                        </span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {formatThreadTime(thread.receivedAt) || formatThreadDate(thread.receivedAt)}
                        </span>
                      </span>
                      <span className={cn("mt-1 block truncate text-sm text-foreground", thread.isRead ? "font-medium" : "font-bold")}>
                        {thread.subject ?? viewerCopy.untitledThreadLabel}
                      </span>
                      <span className="mt-1 line-clamp-1 text-xs leading-5 text-muted-foreground">
                        {thread.snippet ?? "No preview available."}
                      </span>
                      <span className="mt-2 flex items-center justify-between gap-2">
                        {statusBadge(thread)}
                        <span
                          role="button"
                          tabIndex={0}
                          aria-label={thread.isStarred ? "Unstar thread" : "Star thread"}
                          onClick={(event) => {
                            event.stopPropagation();
                            patchThreadState(thread.id, { starred: !thread.isStarred });
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              event.stopPropagation();
                              patchThreadState(thread.id, { starred: !thread.isStarred });
                            }
                          }}
                          className={cn(
                            "rounded-full p-1 transition hover:bg-accent",
                            thread.isStarred ? "text-[#7b3ff2]" : "text-muted-foreground",
                          )}
                        >
                          <Star className={cn("size-4", thread.isStarred ? "fill-current" : "")} />
                        </span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-5">
              <div className="rounded-[1rem] border border-border bg-white/72 p-5">
                <p className="font-semibold text-foreground">{viewerCopy.emptyListTitle}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{viewerCopy.emptyListDescription}</p>
              </div>
            </div>
          )}
        </div>
        <div className="border-t border-border/70 p-4 text-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isListLoading || !hasMore}
            onClick={() => loadThreads()}
            className="text-accent-foreground"
          >
            {isListLoading ? "Loading..." : hasMore ? "Load more threads" : "No more threads"}
          </Button>
        </div>
      </section>

      <section className="solid-content flex min-h-[42rem] min-w-0 flex-col overflow-hidden rounded-[24px]">
        <div className="border-b border-border/70 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-xl font-semibold tracking-[-0.035em] text-foreground">
                  {selectedSummary?.subject ?? selectedThread?.subject ?? viewerCopy.emptyThreadTitle}
                </h2>
                <Badge variant="neutral" className="normal-case tracking-normal">
                  <Inbox className="mr-1 size-3.5" />
                  Inbox
                </Badge>
              </div>
              <div className="mt-5 grid gap-4 text-xs text-muted-foreground sm:grid-cols-3">
                <div>
                  <p className="font-mono uppercase tracking-[0.18em]">From</p>
                  <p className="mt-1 font-semibold text-foreground">
                    {contactName(selectedThread)}
                  </p>
                  <p className="truncate">{selectedThread?.contact?.email ?? selectedThread?.renderedMessage?.from_email ?? "Unknown"}</p>
                </div>
                <div>
                  <p className="font-mono uppercase tracking-[0.18em]">To</p>
                  <p className="mt-1 font-semibold text-foreground">Workspace team</p>
                  <p className="truncate">{firstMessage?.to_emails?.join(", ") ?? "Shared mailbox"}</p>
                </div>
                <div>
                  <p className="font-mono uppercase tracking-[0.18em]">Received</p>
                  <p className="mt-1 font-semibold text-foreground">{formatThreadDateTime(lastMessage?.sent_at ?? selectedThread?.latestMessageAt)}</p>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {selectedThread ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label={selectedThread.isStarred ? "Unstar thread" : "Star thread"}
                    onClick={() => patchThreadState(selectedThread.id, { starred: !selectedThread.isStarred })}
                  >
                    <Star className={cn("size-4", selectedThread.isStarred ? "fill-current text-accent-foreground" : "")} />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label={selectedThread.isRead ? "Mark as unread" : "Mark as read"}
                    onClick={() => patchThreadState(selectedThread.id, { read: !selectedThread.isRead })}
                  >
                    {selectedThread.isRead ? <Mail className="size-4" /> : <MailOpen className="size-4" />}
                  </Button>
                  <Button type="button" variant="outline" size="sm" aria-label="More actions">
                    <MoreVertical className="size-4" />
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,rgba(255,255,255,0.66),rgba(249,251,255,0.8))] p-5">
          {isDetailLoading && !selectedThread ? (
            <div className="rounded-[1rem] border border-border bg-white p-5 text-sm text-muted-foreground">
              Loading thread...
            </div>
          ) : selectedThread?.messages.length ? (
            <div className="grid gap-5">
              {selectedThread.messages.map((message) => {
                const outbound = message.direction === "outbound";
                const name = outbound ? "ShelterScore Team" : displayNameFromEmail(message.from_email);

                return (
                  <article key={message.id} className="rounded-[1.1rem] border border-border bg-white p-4 shadow-[0_16px_34px_rgba(44,55,91,0.06)]">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <span
                          className={cn(
                            "flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                            outbound
                              ? "bg-[linear-gradient(135deg,#ffe7f5,#f0e9ff)] text-[#c51f80]"
                              : "bg-[linear-gradient(135deg,#efe7ff,#dcd0ff)] text-accent-foreground",
                          )}
                        >
                          {getInitials(name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">{name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {outbound ? `to ${message.to_emails?.join(", ") || "recipient"}` : `to ${message.to_emails?.join(", ") || "workspace"}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                        <span>{formatThreadDateTime(message.sent_at)}</span>
                        <MoreVertical className="size-4" />
                      </div>
                    </div>
                    {message.body_html ? (
                      <SafeHtmlContent
                        html={message.body_html}
                        className="prose prose-sm max-w-none text-sm leading-7 text-foreground prose-p:my-2 prose-a:text-accent-foreground"
                      />
                    ) : (
                      <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">
                        {message.body_text ?? productContent.shared.noBodyLabel}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[1rem] border border-border bg-white p-5">
              <p className="font-semibold text-foreground">{viewerCopy.emptyThreadTitle}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{viewerCopy.emptyThreadDescription}</p>
            </div>
          )}
        </div>

        {selectedThread ? (
          <div className="border-t border-border/70 bg-white/86 p-4">
            <div className="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              <span>New reply</span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <div className="overflow-hidden rounded-[1rem] border border-border bg-white">
              <div
                ref={composerRef}
                contentEditable
                role="textbox"
                aria-label="Reply body"
                data-placeholder={viewerCopy.replyPlaceholder}
                suppressContentEditableWarning
                onInput={(event) => setDraftText(event.currentTarget.innerText.trim())}
                className="min-h-28 px-4 py-4 text-sm leading-7 text-foreground outline-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]"
              />
              {attachments.length ? (
                <div className="flex flex-wrap gap-2 border-t border-border px-3 py-2">
                  {attachments.map((file) => (
                    <span key={`${file.name}-${file.size}`} className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs text-foreground">
                      <Paperclip className="size-3.5" />
                      {file.name}
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-danger"
                        onClick={() => setAttachments((current) => current.filter((item) => item !== file))}
                      >
                        x
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-3 py-2">
                <div className="flex flex-wrap items-center gap-1">
                  <button type="button" className="rounded-[0.7rem] p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground" onClick={() => attachmentInputRef.current?.click()}>
                    <Paperclip className="size-4" />
                  </button>
                  <button type="button" className="rounded-[0.7rem] p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground" onClick={() => runComposerCommand("insertText", "🙂")}>
                    <Smile className="size-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded-[0.7rem] p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    onClick={() => {
                      const url = window.prompt("Paste a URL");
                      if (url) {
                        runComposerCommand("createLink", url);
                      }
                    }}
                  >
                    <LinkIcon className="size-4" />
                  </button>
                  <button type="button" className="rounded-[0.7rem] p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground" onClick={() => runComposerCommand("bold")}>
                    <Bold className="size-4" />
                  </button>
                  <button type="button" className="rounded-[0.7rem] p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground" onClick={() => runComposerCommand("italic")}>
                    <Italic className="size-4" />
                  </button>
                  <button type="button" className="rounded-[0.7rem] p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground" onClick={() => runComposerCommand("insertUnorderedList")}>
                    <List className="size-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    ref={attachmentInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(event) => {
                      const selectedFiles = Array.from(event.target.files ?? []);
                      setAttachments((current) => [...current, ...selectedFiles].slice(0, 5));
                      event.currentTarget.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label="Clear draft"
                    onClick={() => {
                      if (composerRef.current) {
                        composerRef.current.innerHTML = "";
                      }
                      setDraftText("");
                      setAttachments([]);
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                  <Button type="button" size="sm" disabled={isSendingReply || isPending || draftText.length < 3} onClick={() => void sendReply()}>
                    <Send className="size-4" />
                    {isSendingReply || isPending ? viewerCopy.sendingReplyLabel : viewerCopy.sendReplyLabel}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <aside className="grid content-start gap-4">
        <section className="solid-content rounded-[24px] p-5">
          <h3 className="text-lg font-semibold tracking-[-0.025em]">Thread summary</h3>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Messages</p>
              <p className="mt-2 text-xl font-semibold text-foreground">{selectedThread?.messages.length ?? selectedSummary?.messageCount ?? 0}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">First message</p>
              <p className="mt-2 font-semibold text-foreground">{formatThreadDate(firstMessage?.sent_at)}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Last message</p>
              <p className="mt-2 font-semibold text-foreground">{formatThreadDate(lastMessage?.sent_at ?? selectedSummary?.receivedAt)}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Status</p>
              <div className="mt-2">{statusBadge(selectedSummary ?? selectedThread)}</div>
            </div>
          </div>
        </section>

        <section className="solid-content rounded-[24px] p-5">
          <h3 className="text-lg font-semibold tracking-[-0.025em]">Contact details</h3>
          <div className="mt-5 flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Mail className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">{contactName(selectedThread)}</p>
              <p className="truncate text-xs text-muted-foreground">{selectedThread?.contact?.email ?? selectedThread?.renderedMessage?.from_email ?? "No email"}</p>
            </div>
          </div>
          {selectedThread?.contact?.company || selectedThread?.contact?.jobTitle ? (
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              {[selectedThread.contact.jobTitle, selectedThread.contact.company].filter(Boolean).join(" at ")}
            </p>
          ) : null}
        </section>

        <section className="solid-content rounded-[24px] p-5">
          <h3 className="text-lg font-semibold tracking-[-0.025em]">Contact history</h3>
          <div className="mt-5 grid gap-3">
            {selectedThread?.history.length ? (
              selectedThread.history.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-[1rem] border border-border bg-white/78 px-3 py-2.5">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                      {eventIcon(item.eventType)}
                    </span>
                    <span className="truncate text-sm font-semibold text-foreground">{item.label}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatThreadDate(item.occurredAt)}</span>
                </div>
              ))
            ) : (
              <div className="rounded-[1rem] border border-border bg-white/78 px-3 py-3 text-sm text-muted-foreground">
                No tracked activity yet.
              </div>
            )}
          </div>
        </section>

        <section className="solid-content rounded-[24px] p-5">
          <h3 className="text-lg font-semibold tracking-[-0.025em]">Related campaign</h3>
          {selectedThread?.campaign?.id ? (
            <div className="mt-5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{selectedThread.campaign.name ?? "Campaign"}</p>
                  <div className="mt-1">
                    <Badge variant={selectedThread.campaign.status === "active" ? "success" : "neutral"}>
                      {selectedThread.campaign.status ?? "Campaign"}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Started</p>
                  <p className="mt-1 font-semibold">{formatThreadDate(selectedThread.campaign.createdAt)}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Audience</p>
                  <p className="mt-1 font-semibold">
                    {typeof selectedThread.campaign.audienceCount === "number"
                      ? `${selectedThread.campaign.audienceCount.toLocaleString()} contacts`
                      : "Unknown"}
                  </p>
                </div>
              </div>
              <Button asChild type="button" variant="outline" className="mt-5 w-full">
                <Link href={`/campaigns/${selectedThread.campaign.id}`}>
                  View campaign
                  <ExternalLink className="size-4" />
                </Link>
              </Button>
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              This thread is not linked to a campaign yet.
            </p>
          )}
        </section>
      </aside>
    </div>
  );
}
