import "server-only";
import {
  getCachedCampaigns,
  getCachedContacts,
  getCachedDashboardMetrics,
  getCachedImports,
  getCachedInboxThreadSummaries,
  getCachedReplyRateByCampaign,
  getCachedTemplates,
  getCachedWorkspaceContactTags,
  getCachedWorkspaceProjectMetrics,
} from "@/lib/cache/read-models";
import type { AppDataMap, AppTabKey, WorkspaceShellData } from "@/lib/app-data/types";
import { getInboxThreadDetail } from "@/services/analytics-service";
import { getWorkspaceAdminSummary } from "@/services/admin-service";
import { listWorkspaceProjectMailboxRegistry } from "@/services/project-service";

export async function loadAppTabData<K extends AppTabKey>(
  key: K,
  workspace: WorkspaceShellData,
  searchParams: URLSearchParams,
): Promise<AppDataMap[K]> {
  switch (key) {
    case "dashboard": {
      const [metrics, chartData, projectMetrics] = await Promise.all([
        getCachedDashboardMetrics(workspace.userId, workspace.workspaceId),
        getCachedReplyRateByCampaign(workspace.userId, workspace.workspaceId),
        getCachedWorkspaceProjectMetrics(workspace.userId, workspace.workspaceId),
      ]);

      return { metrics, chartData, projectMetrics } as AppDataMap[K];
    }

    case "analytics": {
      const requestedProjectId = searchParams.get("projectId");
      const isAllProjects = requestedProjectId === "all";
      const selectedProject =
        workspace.availableProjects.find((project) => project.id === requestedProjectId) ??
        workspace.activeProject;
      const activeFilterProjectId = isAllProjects ? undefined : selectedProject.id;
      const [metrics, chartData, projectMetrics] = await Promise.all([
        getCachedDashboardMetrics(workspace.userId, workspace.workspaceId, activeFilterProjectId),
        getCachedReplyRateByCampaign(workspace.userId, workspace.workspaceId, activeFilterProjectId),
        getCachedWorkspaceProjectMetrics(workspace.userId, workspace.workspaceId),
      ]);

      return {
        requestedProjectId,
        metrics,
        chartData,
        projectMetrics,
      } as unknown as AppDataMap[K];
    }

    case "campaigns": {
      const campaigns = await getCachedCampaigns(
        workspace.userId,
        workspace.workspaceId,
        workspace.activeProjectId,
      );

      return { campaigns } as AppDataMap[K];
    }

    case "contacts": {
      const [contacts, tags] = await Promise.all([
        getCachedContacts(workspace.userId, workspace.workspaceId, workspace.activeProjectId),
        getCachedWorkspaceContactTags(workspace.userId, workspace.workspaceId, workspace.activeProjectId),
      ]);

      return { contacts, tags } as AppDataMap[K];
    }

    case "imports": {
      const imports = await getCachedImports(
        workspace.userId,
        workspace.workspaceId,
        workspace.activeProjectId,
      );

      return { imports } as AppDataMap[K];
    }

    case "templates": {
      const templates = await getCachedTemplates(
        workspace.userId,
        workspace.workspaceId,
        workspace.activeProjectId,
      );

      return { templates } as AppDataMap[K];
    }

    case "inbox": {
      const initialThreadBatch = await getCachedInboxThreadSummaries({
        userId: workspace.userId,
        workspaceId: workspace.workspaceId,
        projectId: workspace.activeProjectId,
        limit: 10,
        offset: 0,
      });
      const selectedThread =
        initialThreadBatch.threads[0]
          ? await getInboxThreadDetail(workspace.workspaceId, initialThreadBatch.threads[0].id, {
              projectId: workspace.activeProjectId,
            })
          : null;

      return {
        threads: initialThreadBatch.threads,
        selectedThread,
        hasMore: initialThreadBatch.hasMore,
      } as unknown as AppDataMap[K];
    }

    case "settings": {
      const [adminSummary, projectRegistry] = await Promise.all([
        getWorkspaceAdminSummary(workspace.workspaceId),
        listWorkspaceProjectMailboxRegistry(workspace.workspaceId),
      ]);

      return {
        adminSummary: {
          members: adminSummary.members as Array<Record<string, unknown>>,
          gmailAccounts: adminSummary.gmailAccounts,
          crmConnections: adminSummary.crmConnections,
        },
        projectRegistry,
      } as unknown as AppDataMap[K];
    }

    default:
      throw new Error(`Unsupported app-data tab: ${String(key)}`);
  }
}
