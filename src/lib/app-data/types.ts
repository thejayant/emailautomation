import type { z } from "zod";
import type {
  campaignSummarySchema,
  dashboardMetricsSchema,
  importSummarySchema,
  projectMetricsSchema,
  replyRateSchema,
  workspaceContextSchema,
} from "@/lib/cache/schemas";
import type { ContactRecord, ContactTag } from "@/lib/types/contact";
import type { InboxThreadDetail, InboxThreadSummary } from "@/lib/inbox/threads";
import type { ProjectMailboxRegistryItem } from "@/lib/projects/shared";
import type { TemplateListItem } from "@/lib/templates/gallery";

export type AppTabKey =
  | "dashboard"
  | "analytics"
  | "campaigns"
  | "contacts"
  | "imports"
  | "templates"
  | "inbox"
  | "settings";

export type WorkspaceShellData = z.infer<typeof workspaceContextSchema>;
export type DashboardMetrics = z.infer<typeof dashboardMetricsSchema>;
export type ProjectMetrics = z.infer<typeof projectMetricsSchema>;
export type ReplyRateByCampaign = z.infer<typeof replyRateSchema>;
export type CampaignSummary = z.infer<typeof campaignSummarySchema>;
export type ImportSummary = z.infer<typeof importSummarySchema>;

export type DashboardData = {
  metrics: DashboardMetrics;
  chartData: ReplyRateByCampaign[];
  projectMetrics: ProjectMetrics[];
};

export type AnalyticsData = DashboardData & {
  requestedProjectId: string | null;
};

export type CampaignsData = {
  campaigns: CampaignSummary[];
};

export type ContactsData = {
  contacts: ContactRecord[];
  tags: ContactTag[];
};

export type ImportsData = {
  imports: ImportSummary[];
};

export type TemplatesData = {
  templates: TemplateListItem[];
};

export type InboxData = {
  threads: InboxThreadSummary[];
  selectedThread: InboxThreadDetail | null;
  hasMore: boolean;
};

export type SettingsOverviewData = {
  adminSummary: {
    members: Array<Record<string, unknown>>;
    gmailAccounts: Array<{
      id: string;
      email_address?: string | null;
      status: string;
      approval_status?: string | null;
      approval_note?: string | null;
    }>;
    crmConnections: Array<{
      id: string;
      provider: string;
      status: string;
      provider_account_label?: string | null;
      provider_account_email?: string | null;
      last_synced_at?: string | null;
      last_error?: string | null;
    }>;
  };
  projectRegistry: ProjectMailboxRegistryItem[];
};

export type AppDataMap = {
  dashboard: DashboardData;
  analytics: AnalyticsData;
  campaigns: CampaignsData;
  contacts: ContactsData;
  imports: ImportsData;
  templates: TemplatesData;
  inbox: InboxData;
  settings: SettingsOverviewData;
};

export type AppDataResponse<T> =
  | {
      data: T;
      refreshedAt: string;
    }
  | {
      error: string;
    };
