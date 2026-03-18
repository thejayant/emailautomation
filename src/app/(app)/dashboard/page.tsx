import { KpiCard } from "@/components/dashboard/kpi-card";
import { ReplyRateChart } from "@/components/dashboard/reply-rate-chart";
import { LiveRefresh } from "@/components/layout/live-refresh";
import { PageHeader } from "@/components/layout/page-header";
import { productContent } from "@/content/product";
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
        title={productContent.dashboard.title}
        description={productContent.dashboard.description}
        actions={<LiveRefresh label={productContent.dashboard.liveRefreshLabel} />}
      />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={productContent.dashboard.kpis.totalLeads} value={metrics.totalLeads} />
        <KpiCard label={productContent.dashboard.kpis.queued} value={metrics.queued} />
        <KpiCard label={productContent.dashboard.kpis.sent} value={metrics.sent} />
        <KpiCard label={productContent.dashboard.kpis.followupSent} value={metrics.followupSent} />
        <KpiCard label={productContent.dashboard.kpis.replied} value={metrics.replied} />
        <KpiCard label={productContent.dashboard.kpis.unsubscribed} value={metrics.unsubscribed} />
        <KpiCard label={productContent.dashboard.kpis.failed} value={metrics.failed} />
        <KpiCard label={productContent.dashboard.kpis.replyRate} value={metrics.replyRate} kind="percent" />
      </section>
      <ReplyRateChart data={chartData} title={productContent.dashboard.chartTitle} />
      <Card>
        <CardHeader>
          <CardTitle>{productContent.dashboard.checklistTitle}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-muted-foreground">
          {productContent.dashboard.checklist.map((item, index) => (
            <div key={item}>
              {index + 1}. {item}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
