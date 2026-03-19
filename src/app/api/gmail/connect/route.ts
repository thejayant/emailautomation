import { SignJWT } from "jose";
import { NextResponse } from "next/server";
import { getWorkspaceContext } from "@/lib/db/workspace";
import { parseDesktopCallbackUrl } from "@/lib/auth/desktop-oauth";
import { createGoogleConnectUrl } from "@/services/gmail-service";
import { env, requireGoogleConfiguration } from "@/lib/supabase/env";

function getStateSecret() {
  if (!env.TOKEN_ENCRYPTION_KEY) {
    throw new Error("Missing TOKEN_ENCRYPTION_KEY");
  }

  return new TextEncoder().encode(env.TOKEN_ENCRYPTION_KEY);
}

export async function GET(request: Request) {
  requireGoogleConfiguration();

  const workspace = await getWorkspaceContext();
  const desktopCallbackUrl = parseDesktopCallbackUrl(
    new URL(request.url).searchParams.get("desktopCallbackUrl"),
  );
  const state = await new SignJWT({
    desktopCallbackUrl,
    workspaceId: workspace.workspaceId,
    userId: workspace.userId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(getStateSecret());

  return NextResponse.redirect(createGoogleConnectUrl(state));
}
