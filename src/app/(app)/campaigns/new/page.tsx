import { CampaignWizard } from "@/components/campaigns/campaign-wizard";
import { PageHeader } from "@/components/layout/page-header";
import { getWorkspaceContext } from "@/lib/db/workspace";
import { getWorkspaceGmailAccounts } from "@/services/gmail-service";
import { listContacts } from "@/services/import-service";

export default async function NewCampaignPage() {
  const workspace = await getWorkspaceContext();
  const [rawGmailAccounts, rawContacts] = await Promise.all([
    getWorkspaceGmailAccounts(workspace.workspaceId),
    listContacts(workspace.workspaceId),
  ]);
  const gmailAccounts = rawGmailAccounts as Array<{ id: string; email_address: string }>;
  const contacts = rawContacts;

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Campaign builder"
        title="Launch a campaign"
        description="Choose a mailbox, audience, and two-step copy sequence with a fixed 2-day follow-up."
      />
      <CampaignWizard gmailAccounts={gmailAccounts} contacts={contacts} />
    </div>
  );
}
