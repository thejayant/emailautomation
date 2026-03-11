"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type Thread = {
  id: string;
  gmail_thread_id?: string;
  subject: string | null;
  snippet: string | null;
  latest_message_at: string | null;
  messages: Array<{
    id: string;
    direction: string;
    from_email: string | null;
    to_emails?: string[] | null;
    subject: string | null;
    body_text: string | null;
    sent_at: string;
  }>;
};

export function ThreadViewer({ threads }: { threads: Thread[] }) {
  const router = useRouter();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(threads[0]?.id ?? null);
  const [draft, setDraft] = useState("");
  const [isPending, startTransition] = useTransition();
  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) ?? threads[0],
    [selectedThreadId, threads],
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Card className="card-shadow border-border/60 bg-card/90">
        <CardHeader>
          <CardTitle>Recent threads</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {threads.map((thread) => (
            <button
              key={thread.id}
              type="button"
              onClick={() => setSelectedThreadId(thread.id)}
              className="rounded-3xl border border-border/60 bg-background/70 p-4 text-left transition hover:border-primary/40"
            >
              <p className="font-medium">{thread.subject ?? "Untitled thread"}</p>
              <p className="mt-2 text-sm text-muted-foreground">{thread.snippet}</p>
            </button>
          ))}
        </CardContent>
      </Card>
      <Card className="card-shadow border-border/60 bg-card/90">
        <CardHeader>
          <CardTitle>{selectedThread?.subject ?? "Thread history"}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {(selectedThread?.messages ?? []).map((message) => (
            <div
              key={message.id}
              className="rounded-3xl border border-border/60 bg-background/70 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{message.from_email}</p>
                  <p className="text-sm text-muted-foreground">{message.subject}</p>
                </div>
                <Badge variant={message.direction === "inbound" ? "success" : "neutral"}>
                  {message.direction}
                </Badge>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                {message.body_text}
              </p>
            </div>
          ))}
          {selectedThread ? (
            <form
              className="grid gap-3 rounded-3xl border border-border/60 bg-background/70 p-4"
              onSubmit={(event) => {
                event.preventDefault();
                startTransition(async () => {
                  const response = await fetch("/api/inbox/reply", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      threadRecordId: selectedThread.id,
                      body: draft,
                    }),
                  });

                  if (!response.ok) {
                    const error = await response.json().catch(() => null);
                    toast.error(error?.error ?? "Failed to send reply");
                    return;
                  }

                  setDraft("");
                  router.refresh();
                  toast.success("Reply sent");
                });
              }}
            >
              <div className="space-y-1">
                <p className="font-medium">Reply from app</p>
                <p className="text-sm text-muted-foreground">
                  Sends into the same Gmail thread using the connected mailbox.
                </p>
              </div>
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Type your reply..."
              />
              <Button type="submit" disabled={isPending || !draft.trim()}>
                {isPending ? "Sending..." : "Send reply"}
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
