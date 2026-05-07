"use client";

import Link from "next/link";
import { useAppTabData } from "@/components/app-data/app-data-provider";
import { TabLoading } from "@/components/app-data/tab-loading";
import { TabError } from "@/components/app-tabs/tab-error";
import { DeleteCampaignButton } from "@/components/campaigns/delete-campaign-button";
import { SendNowButton } from "@/components/campaigns/send-now-button";
import { SimpleDataTable } from "@/components/data-table/simple-data-table";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { productContent } from "@/content/product";

export function CampaignsTab() {
  const entry = useAppTabData("campaigns");
  const data = entry.data;

  if (!data && entry.status === "error") {
    return <TabError message={entry.error ?? "Campaigns data failed to load."} />;
  }

  if (!data) {
    return <TabLoading title="Loading campaigns" />;
  }

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow={productContent.campaigns.header.eyebrow}
        title={productContent.campaigns.header.title}
        description={productContent.campaigns.header.description}
        actions={
          <Button asChild data-tour="campaigns-new-button">
            <Link href="/campaigns/new">{productContent.campaigns.header.ctaLabel}</Link>
          </Button>
        }
      />
      <SimpleDataTable
        title={productContent.campaigns.header.title}
        rows={data.campaigns}
        columns={[
          {
            key: "name",
            header: "Campaign",
            render: (row) => (
              <Link href={`/campaigns/${row.id}`} className="font-medium text-primary">
                {row.name}
              </Link>
            ),
          },
          {
            key: "status",
            header: "Status",
            render: (row) => <Badge variant={row.status === "active" ? "success" : "neutral"}>{row.status}</Badge>,
          },
          { key: "daily_send_limit", header: "Daily cap" },
          { key: "timezone", header: "Timezone" },
          {
            key: "actions",
            header: "Actions",
            render: (row) => (
              <div className="flex items-center gap-2">
                <SendNowButton campaignId={row.id} size="sm" disabled={row.status !== "active"} />
                <Button asChild size="sm" variant="outline">
                  <Link href={`/campaigns/${row.id}/edit`}>{productContent.campaigns.detail.editLabel}</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/campaigns/${row.id}`}>{productContent.campaigns.detail.openLabel}</Link>
                </Button>
                <DeleteCampaignButton campaignId={row.id} size="sm" />
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
