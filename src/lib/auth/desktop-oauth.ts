export type DesktopOAuthStatus = "connected" | "error";

export function parseDesktopCallbackUrl(value?: string | null) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    const isLoopbackHost = url.hostname === "127.0.0.1" || url.hostname === "localhost";

    if (url.protocol !== "http:" || !isLoopbackHost) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

export async function notifyDesktopOAuthResult(
  desktopCallbackUrl: string | null | undefined,
  input: {
    status: DesktopOAuthStatus;
    message?: string;
  },
) {
  const targetUrl = parseDesktopCallbackUrl(desktopCallbackUrl);

  if (!targetUrl) {
    return;
  }

  const url = new URL(targetUrl);
  url.searchParams.set("status", input.status);

  if (input.message) {
    url.searchParams.set("message", input.message);
  }

  try {
    await fetch(url, {
      cache: "no-store",
      method: "GET",
    });
  } catch (error) {
    console.error("Failed to notify the desktop shell about Gmail OAuth.", error);
  }
}
