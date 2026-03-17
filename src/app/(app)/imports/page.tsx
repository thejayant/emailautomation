import { PageHeader } from "@/components/layout/page-header";
import { ImportPanel } from "@/components/imports/import-panel";
import { ImportMapper } from "@/components/imports/import-mapper";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getWorkspaceContext } from "@/lib/db/workspace";
import { listImports } from "@/services/import-service";

type ImportsPageProps = {
  searchParams?: Promise<{
    status?: string;
    error?: string;
    count?: string;
  }>;
};

function getImportBanner(status?: string, error?: string, count?: string) {
  if (error) {
    return {
      tone: "error" as const,
      text: decodeURIComponent(error),
    };
  }

  if (status === "uploaded") {
    return {
      tone: "success" as const,
      text: `File import completed. ${count ?? "0"} contact(s) were processed.`,
    };
  }

  if (status === "sheets-imported") {
    return {
      tone: "success" as const,
      text: `Google Sheet import completed. ${count ?? "0"} contact(s) were processed.`,
    };
  }

  return null;
}

export default async function ImportsPage({ searchParams }: ImportsPageProps) {
  const params = (await searchParams) ?? {};
  const workspace = await getWorkspaceContext();
  const imports = (await listImports(workspace.workspaceId)) as Array<{
    id: string;
    file_name: string | null;
    source_type: string;
    status: string;
    imported_count: number;
  }>;
  const banner = getImportBanner(params.status, params.error, params.count);

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Imports"
        title="Lead ingestion"
        description="Upload CSV/XLSX files, import public Google Sheets, and preserve raw rows for debugging."
      />
      {banner ? (
        <div
          className={
            banner.tone === "error"
              ? "rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"
              : "rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700"
          }
        >
          {banner.text}
        </div>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <Card className="border-border/60 bg-card/90">
          <CardHeader>
            <CardTitle>Upload lead file</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <ImportPanel />
            <div className="rounded-2xl border border-border/60 bg-background/60 px-4 py-3 text-sm text-muted-foreground">
              Use a public Google Sheet link. Private sheets and non-exportable links will be rejected.
            </div>
          </CardContent>
        </Card>
        <ImportMapper headers={["Email", "First Name", "Company", "Website", "Job Title"]} />
      </div>
      <Card className="border-border/60 bg-card/90">
        <CardHeader>
          <CardTitle>Import history</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {imports.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-3xl border border-border/60 bg-background/65 px-4 py-3 text-sm"
            >
              <div>
                <p className="font-medium">{item.file_name ?? "Untitled import"}</p>
                <p className="text-muted-foreground">{item.source_type}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={item.status === "processed" ? "success" : item.status === "failed" ? "danger" : "neutral"}>
                  {item.status}
                </Badge>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {item.imported_count}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
