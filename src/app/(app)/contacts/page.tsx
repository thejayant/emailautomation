import { PageHeader } from "@/components/layout/page-header";
import { ManualContactForm } from "@/components/forms/manual-contact-form";
import { SimpleDataTable } from "@/components/data-table/simple-data-table";
import { Badge } from "@/components/ui/badge";
import { getWorkspaceContext } from "@/lib/db/workspace";
import { listContacts } from "@/services/import-service";

export default async function ContactsPage() {
  const workspace = await getWorkspaceContext();
  const contacts = (await listContacts(workspace.workspaceId)) as Array<{
    id: string;
    email: string;
    first_name?: string | null;
    last_name?: string | null;
    company?: string | null;
    source?: string | null;
    unsubscribed_at?: string | null;
  }>;

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Contacts"
        title="Unified leads table"
        description="Workspace-scoped contacts from manual entry, CSV/XLSX, Sheets, and future CRM adapters."
      />
      <ManualContactForm refreshOnSuccess />
      <SimpleDataTable
        title="Contacts"
        rows={contacts}
        emptyLabel="No contacts yet. Add one manually or import a file."
        columns={[
          { key: "email", header: "Email" },
          {
            key: "first_name",
            header: "Name",
            render: (row) => `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim() || "Unknown",
          },
          { key: "company", header: "Company" },
          { key: "source", header: "Source" },
          {
            key: "unsubscribed_at",
            header: "Status",
            render: (row) =>
              row.unsubscribed_at ? <Badge variant="danger">unsubscribed</Badge> : <Badge variant="success">active</Badge>,
          },
        ]}
      />
    </div>
  );
}
