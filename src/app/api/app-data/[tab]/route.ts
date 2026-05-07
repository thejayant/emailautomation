import { NextResponse } from "next/server";
import { loadAppTabData } from "@/lib/app-data/loaders";
import type { AppTabKey } from "@/lib/app-data/types";
import { getWorkspaceContext } from "@/lib/db/workspace";

const APP_DATA_TABS = new Set<string>([
  "dashboard",
  "analytics",
  "campaigns",
  "contacts",
  "imports",
  "templates",
  "inbox",
  "settings",
]);

type RouteContext = {
  params: Promise<{
    tab: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { tab } = await context.params;

    if (!APP_DATA_TABS.has(tab)) {
      return NextResponse.json({ error: "Unknown app-data tab." }, { status: 404 });
    }

    const workspace = await getWorkspaceContext();
    const data = await loadAppTabData(
      tab as AppTabKey,
      workspace,
      new URL(request.url).searchParams,
    );

    return NextResponse.json({
      data,
      refreshedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load app data.",
      },
      { status: 500 },
    );
  }
}
