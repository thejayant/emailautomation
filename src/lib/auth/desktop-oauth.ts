export type DesktopOAuthStatus = "connected" | "error";

const DESKTOP_PROTOCOL = "outboundflow:";

export function parseDesktopReturnUrl(value?: string | null) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    const isSupportedLocation =
      url.hostname === "oauth-complete" || url.pathname === "/oauth-complete";

    if (url.protocol !== DESKTOP_PROTOCOL || !isSupportedLocation) {
      return null;
    }

    return `${DESKTOP_PROTOCOL}//oauth-complete`;
  } catch {
    return null;
  }
}

export function buildDesktopOAuthRedirectUrl(
  desktopReturnUrl: string | null | undefined,
  input: {
    status: DesktopOAuthStatus;
    message?: string;
  },
) {
  const targetUrl = parseDesktopReturnUrl(desktopReturnUrl);

  if (!targetUrl) {
    return null;
  }

  const url = new URL(targetUrl);
  url.searchParams.set("status", input.status);

  if (input.message) {
    url.searchParams.set("message", input.message);
  }

  return url.toString();
}
