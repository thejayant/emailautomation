import { buildTrackingPixelResponse, recordMessageEvent, verifyTrackingPayload } from "@/services/telemetry-service";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");

  if (!token) {
    return buildTrackingPixelResponse();
  }

  try {
    const payload = await verifyTrackingPayload(token);

    await recordMessageEvent({
      workspaceId: payload.workspaceId,
      campaignContactId: payload.campaignContactId,
      eventType: "opened",
      metadata: {
        stepNumber: payload.stepNumber,
        userAgent: request.headers.get("user-agent"),
      },
    });
  } catch (error) {
    console.error("Failed to record open tracking event", error);
  }

  return buildTrackingPixelResponse();
}
