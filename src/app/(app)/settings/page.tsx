import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { productContent } from "@/content/product";
import { getWorkspaceContext } from "@/lib/db/workspace";

export default async function SettingsPage() {
  const workspace = await getWorkspaceContext();

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow={productContent.settings.header.eyebrow}
        title={workspace.workspaceName}
        description={productContent.settings.header.description}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{productContent.settings.members.title}</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>{productContent.settings.members.firstParagraph}</p>
            <p>{productContent.settings.members.secondParagraph}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{productContent.settings.limits.title}</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>{productContent.settings.limits.firstParagraph}</p>
            <p>{productContent.settings.limits.secondParagraph}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
