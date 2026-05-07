"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAppData } from "@/components/app-data/app-data-provider";
import { AnalyticsTab } from "@/components/app-tabs/analytics-tab";
import { CampaignsTab } from "@/components/app-tabs/campaigns-tab";
import { ContactsTab } from "@/components/app-tabs/contacts-tab";
import { DashboardTab } from "@/components/app-tabs/dashboard-tab";
import { ImportsTab } from "@/components/app-tabs/imports-tab";
import { InboxTab } from "@/components/app-tabs/inbox-tab";
import { SettingsTab } from "@/components/app-tabs/settings-tab";
import { TemplatesTab } from "@/components/app-tabs/templates-tab";
import { getTabRouteByKey } from "@/lib/app-data/routes";
import type { AppTabKey } from "@/lib/app-data/types";

function renderTab(key: AppTabKey) {
  switch (key) {
    case "dashboard":
      return <DashboardTab />;
    case "analytics":
      return <AnalyticsTab />;
    case "campaigns":
      return <CampaignsTab />;
    case "contacts":
      return <ContactsTab />;
    case "imports":
      return <ImportsTab />;
    case "templates":
      return <TemplatesTab />;
    case "inbox":
      return <InboxTab />;
    case "settings":
      return <SettingsTab />;
    default:
      return null;
  }
}

export function InstantAppContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { optimisticTabKey } = useAppData();
  const optimisticRoute = optimisticTabKey ? getTabRouteByKey(optimisticTabKey) : null;

  if (optimisticTabKey && optimisticRoute?.href !== pathname) {
    return renderTab(optimisticTabKey);
  }

  return children;
}
