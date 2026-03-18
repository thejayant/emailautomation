import { CampaignWizard } from "@/components/campaigns/campaign-wizard";
import { PageHeader } from "@/components/layout/page-header";
import { productContent } from "@/content/product";
import { getWorkspaceContext } from "@/lib/db/workspace";
import { listTemplates } from "@/services/campaign-service";
import { getWorkspaceGmailAccounts } from "@/services/gmail-service";
import { listContacts } from "@/services/import-service";

export default async function NewCampaignPage() {
  const workspace = await getWorkspaceContext();
  const [rawGmailAccounts, rawContacts, rawTemplates] = await Promise.all([
    getWorkspaceGmailAccounts(workspace.workspaceId),
    listContacts(workspace.workspaceId),
    listTemplates(workspace.workspaceId),
  ]);
  const gmailAccounts = rawGmailAccounts as Array<{ id: string; email_address: string }>;
  const contacts = rawContacts;
  const templates = rawTemplates as Array<{
    id: string;
    name: string;
    subject_template: string;
    body_template: string;
    body_html_template?: string | null;
  }>;

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow={productContent.campaigns.newCampaign.eyebrow}
        title={productContent.campaigns.newCampaign.title}
        description={productContent.campaigns.newCampaign.description}
      />
      <CampaignWizard gmailAccounts={gmailAccounts} contacts={contacts} templates={templates} />
    </div>
  );
}
