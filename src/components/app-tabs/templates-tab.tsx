"use client";

import { useAppTabData } from "@/components/app-data/app-data-provider";
import { TabLoading } from "@/components/app-data/tab-loading";
import { TabError } from "@/components/app-tabs/tab-error";
import { TemplatesExperience } from "@/components/templates/templates-experience";

export function TemplatesTab() {
  const entry = useAppTabData("templates");
  const data = entry.data;

  if (!data && entry.status === "error") {
    return <TabError message={entry.error ?? "Templates data failed to load."} />;
  }

  if (!data) {
    return <TabLoading title="Loading templates" />;
  }

  return <TemplatesExperience templates={data.templates} />;
}
