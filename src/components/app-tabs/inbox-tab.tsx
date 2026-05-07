"use client";

import { useAppTabData } from "@/components/app-data/app-data-provider";
import { TabLoading } from "@/components/app-data/tab-loading";
import { TabError } from "@/components/app-tabs/tab-error";
import { LiveRefresh } from "@/components/layout/live-refresh";
import { PageHeader } from "@/components/layout/page-header";
import { ThreadViewer } from "@/components/threads/thread-viewer";
import { productContent } from "@/content/product";

export function InboxTab() {
  const entry = useAppTabData("inbox");
  const data = entry.data;

  if (!data && entry.status === "error") {
    return <TabError message={entry.error ?? "Inbox data failed to load."} />;
  }

  if (!data) {
    return <TabLoading title="Loading inbox" />;
  }

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow={productContent.inbox.header.eyebrow}
        title={productContent.inbox.header.title}
        description={productContent.inbox.header.description}
        actions={<LiveRefresh label={productContent.inbox.header.liveRefreshLabel} syncEndpoint="/api/replies/sync" />}
      />
      <ThreadViewer
        initialHasMore={data.hasMore}
        initialSelectedThread={data.selectedThread}
        initialThreads={data.threads}
      />
    </div>
  );
}
