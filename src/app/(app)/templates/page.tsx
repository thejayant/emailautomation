import { TemplateForm } from "@/components/forms/template-form";
import { PageHeader } from "@/components/layout/page-header";
import { SafeHtmlContent } from "@/components/shared/safe-html-content";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    preview_text?: string | null;
  }>;

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow={productContent.templates.header.eyebrow}
        title={productContent.templates.header.title}
        description={productContent.templates.header.description}
      />
      <TemplateForm />

      <section className="grid gap-4 xl:grid-cols-2">
        {templates.length ? (
          templates.map((template) => (
            <Card key={template.id} className="overflow-hidden">
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle>{template.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{template.subject_template}</p>
                </div>
                <Badge variant={template.body_html_template ? "success" : "neutral"}>
                  {template.body_html_template
                    ? productContent.templates.table.htmlModeLabel
                    : productContent.templates.table.textModeLabel}
                </Badge>
              </CardHeader>
              <CardContent className="grid gap-4">
                {template.body_html_template ? (
                  <div className="overflow-hidden rounded-[1.5rem] border border-white/65 bg-white p-4 text-sm leading-6 text-slate-700">
                    <SafeHtmlContent html={template.body_html_template} />
                  </div>
                ) : (
                  <div className="rounded-[1.5rem] border border-white/60 bg-white/54 p-4 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                    {template.body_template}
                  </div>
                )}
                <div className="rounded-[1.25rem] border border-dashed border-border/70 bg-background/70 px-4 py-3 text-sm text-muted-foreground">
                  {(template.preview_text ?? template.body_template.slice(0, 180)) || productContent.shared.noBodyLabel}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="px-6 py-10 text-sm text-muted-foreground">
              {productContent.templates.table.emptyLabel}
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
