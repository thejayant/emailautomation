import { TemplateForm } from "@/components/forms/template-form";
import { PageHeader } from "@/components/layout/page-header";
import { SimpleDataTable } from "@/components/data-table/simple-data-table";
import { productContent } from "@/content/product";
import { getWorkspaceContext } from "@/lib/db/workspace";
import { listTemplates } from "@/services/campaign-service";

export default async function TemplatesPage() {
  const workspace = await getWorkspaceContext();
  const templates = (await listTemplates(workspace.workspaceId)) as Array<{
    id: string;
    name: string;
    subject_template: string;
    body_template: string;
    body_html_template?: string | null;
  }>;

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow={productContent.templates.header.eyebrow}
        title={productContent.templates.header.title}
        description={productContent.templates.header.description}
      />
      <TemplateForm />
      <SimpleDataTable
        title={productContent.templates.table.title}
        rows={templates}
        emptyLabel={productContent.templates.table.emptyLabel}
        columns={[
          { key: "name", header: "Name" },
          {
            key: "mode",
            header: "Mode",
            render: (row) =>
              (row.body_html_template as string | null | undefined)
                ? productContent.templates.table.htmlModeLabel
                : productContent.templates.table.textModeLabel,
          },
          { key: "subject_template", header: "Subject" },
          {
            key: "body_preview",
            header: "Preview",
            render: (row) =>
              ((row.body_html_template as string | null | undefined)
                ? productContent.templates.table.htmlPreviewLabel
                : String(row.body_template ?? "").slice(0, 120)),
          },
        ]}
      />
    </div>
  );
}
