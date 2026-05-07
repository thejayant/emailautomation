import type { AppTabKey } from "@/lib/app-data/types";

export const APP_TAB_ROUTES = [
  { key: "dashboard", href: "/dashboard", endpoint: "/api/app-data/dashboard" },
  { key: "campaigns", href: "/campaigns", endpoint: "/api/app-data/campaigns" },
  { key: "contacts", href: "/contacts", endpoint: "/api/app-data/contacts" },
  { key: "imports", href: "/imports", endpoint: "/api/app-data/imports" },
  { key: "templates", href: "/templates", endpoint: "/api/app-data/templates" },
  { key: "analytics", href: "/analytics", endpoint: "/api/app-data/analytics" },
  { key: "inbox", href: "/inbox", endpoint: "/api/app-data/inbox" },
  { key: "settings", href: "/settings", endpoint: "/api/app-data/settings" },
] as const satisfies Array<{
  key: AppTabKey;
  href: string;
  endpoint: string;
}>;

const routeByHref = new Map<string, (typeof APP_TAB_ROUTES)[number]>(
  APP_TAB_ROUTES.map((route) => [route.href, route]),
);
const routeByKey = new Map(APP_TAB_ROUTES.map((route) => [route.key, route]));

export function getTabRouteByHref(href: string) {
  return routeByHref.get(href);
}

export function getTabRouteByKey(key: AppTabKey) {
  return routeByKey.get(key);
}

export function getTabKeyFromPathname(pathname: string): AppTabKey | null {
  const normalizedPathname = pathname === "/" ? "/dashboard" : pathname;
  const match = APP_TAB_ROUTES.find(
    (route) => normalizedPathname === route.href || normalizedPathname.startsWith(`${route.href}/`),
  );

  return match?.key ?? null;
}

export function buildAppDataCacheKey(input: {
  key: AppTabKey;
  workspaceId: string;
  projectId: string;
  search?: string;
}) {
  return [
    input.workspaceId,
    input.projectId,
    input.key,
    input.search?.replace(/^\?/, "") ?? "",
  ].join("::");
}

export function appDataInvalidationKeysForMutation(kind: string) {
  switch (kind) {
    case "contacts":
      return new Set<AppTabKey>(["contacts", "dashboard", "analytics"]);
    case "imports":
      return new Set<AppTabKey>(["imports", "contacts", "dashboard", "analytics"]);
    case "campaigns":
      return new Set<AppTabKey>(["campaigns", "dashboard", "analytics", "inbox"]);
    case "templates":
      return new Set<AppTabKey>(["templates"]);
    case "project":
      return new Set<AppTabKey>(APP_TAB_ROUTES.map((route) => route.key));
    case "settings":
      return new Set<AppTabKey>(["settings"]);
    default:
      return new Set<AppTabKey>();
  }
}
