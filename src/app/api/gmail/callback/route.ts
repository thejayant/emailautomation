import { jwtVerify } from "jose";
import { NextResponse } from "next/server";
import { notifyDesktopOAuthResult } from "@/lib/auth/desktop-oauth";
import { exchangeGoogleCode, storeGmailConnection } from "@/services/gmail-service";
import { env } from "@/lib/supabase/env";
import { logActivity } from "@/services/activity-log-service";

function getStateSecret() {
  if (!env.TOKEN_ENCRYPTION_KEY) {
    throw new Error("Missing TOKEN_ENCRYPTION_KEY");
  }

  return new TextEncoder().encode(env.TOKEN_ENCRYPTION_KEY);
}

export async function GET(request: Request) {
  let payload:
    | {
        desktopCallbackUrl?: string | null;
        workspaceId: string;
        userId: string;
      }
    | null = null;

  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/profile?gmail=missing-code", env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
      );
    }

    const verified = await jwtVerify(state, getStateSecret());
    payload = verified.payload as {
      desktopCallbackUrl?: string | null;
      workspaceId: string;
      userId: string;
    };
    const tokens = await exchangeGoogleCode(code);
    const account = await storeGmailConnection({
      workspaceId: payload.workspaceId,
      userId: payload.userId,
      ...tokens,
    });

    await logActivity({
      workspaceId: payload.workspaceId,
      actorUserId: payload.userId,
      action: "gmail.connected",
      targetType: "gmail_account",
      targetId: (account as { id?: string }).id ?? null,
      metadata: { emailAddress: tokens.emailAddress },
    });
    await notifyDesktopOAuthResult(payload.desktopCallbackUrl, { status: "connected" });

    return NextResponse.redirect(
      new URL("/profile?gmail=connected", env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
    );
  } catch (error) {
    const message =
      error instanceof Error ? encodeURIComponent(error.message.slice(0, 160)) : "unknown-error";

    console.error("Gmail callback failed", error);
    await notifyDesktopOAuthResult(payload?.desktopCallbackUrl, {
      message,
      status: "error",
    });

    return NextResponse.redirect(
      new URL(
        `/profile?gmail=error&message=${message}`,
        env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      ),
    );
  }
}
