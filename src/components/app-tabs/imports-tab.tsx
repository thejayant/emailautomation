"use client";

import { useSearchParams } from "next/navigation";
import { useAppTabData } from "@/components/app-data/app-data-provider";
import { TabLoading } from "@/components/app-data/tab-loading";
import { TabError } from "@/components/app-tabs/tab-error";
import { ImportMapper } from "@/components/imports/import-mapper";
import { ImportPanel } from "@/components/imports/import-panel";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { productContent } from "@/content/product";

function getImportBanner(status?: string | null, error?: string | null, count?: string | null) {
  if (error) {
    return {
      tone: "error" as const,
      text: decodeURIComponent(error),
    };
  }

  if (status === "uploaded") {
    return {
      tone: "success" as const,
      text: productContent.imports.banners.fileUploaded(count ?? undefined),
    };
  }

  if (status === "sheets-imported") {
    return {
      tone: "success" as const,
      text: productContent.imports.banners.sheetImported(count ?? undefined),
    };
  }

  return null;
}

export function ImportsTab() {
  const searchParams = useSearchParams();
  const entry = useAppTabData("imports");
  const data = entry.data;
  const banner = getImportBanner(
    searchParams?.get("status"),
    searchParams?.get("error"),
    searchParams?.get("count"),
  );

  if (!data && entry.status === "error") {
    return <TabError message={entry.error ?? "Imports data failed to load."} />;
  }

  if (!data) {
    return <TabLoading title="Loading imports" />;
  }

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow={productContent.imports.header.eyebrow}
        title={productContent.imports.header.title}
        description={productContent.imports.header.description}
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
        <Card>
          <CardHeader>
            <CardTitle>{productContent.imports.uploadCardTitle}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <ImportPanel />
            <div className="glass-control rounded-[1.35rem] px-4 py-3 text-sm text-muted-foreground">
              {productContent.imports.uploadHelper}
            </div>
          </CardContent>
        </Card>
        <ImportMapper headers={["Email", "First Name", "Company", "Website", "Job Title"]} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{productContent.imports.history.title}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {data.imports.map((item) => (
            <div
              key={item.id}
              className="glass-control flex items-center justify-between rounded-[1.5rem] px-4 py-3 text-sm"
            >
              <div>
                <p className="font-medium">{item.file_name ?? productContent.imports.history.untitledLabel}</p>
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
