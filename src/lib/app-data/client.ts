import type { AppTabKey } from "@/lib/app-data/types";

export const APP_DATA_INVALIDATE_EVENT = "outboundflow:app-data-invalidate";
export const APP_DATA_CLEAR_EVENT = "outboundflow:app-data-clear";

export function invalidateAppData(kind: string | AppTabKey[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(APP_DATA_INVALIDATE_EVENT, {
      detail: { kind },
    }),
  );
}

export function clearAppDataCache() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(APP_DATA_CLEAR_EVENT));
}
