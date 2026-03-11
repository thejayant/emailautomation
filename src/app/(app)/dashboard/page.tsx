import { KpiCard } from "@/components/dashboard/kpi-card";
import { ReplyRateChart } from "@/components/dashboard/reply-rate-chart";
import { LiveRefresh } from "@/components/layout/live-refresh";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getWorkspaceContext } from "@/lib/db/workspace";
import { getDashboardMetrics, getReplyRateByCampaign } from "@/services/analytics-service";
import { syncWorkspaceReplies } from "@/services/gmail-service";

export default async function DashboardPage() {
  const workspace = await getWorkspaceContext();
  try {
    await syncWorkspaceReplies(workspace.workspaceId);
  } catch (error) {
    console.error("Dashboard sync failed", error);
  }
  const metrics = (await getDashboardMetrics(workspace.workspaceId)) as {
    totalLeads: number;
    queued: number;
    sent: number;
    followupSent: number;
    replied: number;
    unsubscribed: number;
    failed: number;
    replyRate: number;
  };
  const chartData = (await getReplyRateByCampaign(workspace.workspaceId)) as Array<{
    name: string;
    replyRate: number;
  }>;

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow={workspace.workspaceName}
        title="Dashboard"
        description="Live workspace metrics, campaign health, and onboarding guidance for the cold email system."
        actions={<LiveRefresh label="Live sync every 15s" />}
      />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total leads" value={metrics.totalLeads} />
        <KpiCard label="Queued" value={metrics.queued} />
        <KpiCard label="Sent" value={metrics.sent} />
        <KpiCard label="Follow-up sent" value={metrics.followupSent} />
        <KpiCard label="Replied" value={metrics.replied} />
        <KpiCard label="Unsubscribed" value={metrics.unsubscribed} />
        <KpiCard label="Failed" value={metrics.failed} />
        <KpiCard label="Reply rate" value={metrics.replyRate} kind="percent" />
      </section>
      <ReplyRateChart data={chartData} />
      <Card className="border-border/60 bg-card/90">
        <CardHeader>
          <CardTitle>Onboarding checklist</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-muted-foreground">
          <div>1. Connect a Gmail mailbox from Profile.</div>
          <div>2. Upload a CSV/XLSX file or import a public Google Sheet.</div>
          <div>3. Save a reusable template with merge variables.</div>
          <div>4. Launch a campaign and keep this page open to auto-sync sends and replies.</div>
        </CardContent>
      </Card>
    </div>
  );
}
