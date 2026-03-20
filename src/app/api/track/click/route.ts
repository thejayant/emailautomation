import { NextResponse } from "next/server";
import { recordMessageEvent, verifyTrackingPayload } from "@/services/telemetry-service";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  try {
    const payload = await verifyTrackingPayload(token);

    await recordMessageEvent({
      workspaceId: payload.workspaceId,
      campaignContactId: payload.campaignContactId,
      eventType: "clicked",
      metadata: {
        stepNumber: payload.stepNumber,
        targetUrl: payload.targetUrl ?? null,
      },
    });

    if (payload.targetUrl) {
      return NextResponse.redirect(payload.targetUrl);
    }
  } catch (error) {
    console.error("Failed to record click tracking event", error);
  }

  return NextResponse.redirect(new URL("/", request.url));
}
