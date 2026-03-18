"use client";

import { env } from "@/lib/supabase/env";

export const STALE_BROWSER_SESSION_MESSAGE = "Your saved session expired. Please sign in again.";

function getProjectRef(supabaseUrl?: string) {
  if (!supabaseUrl) {
    return null;
  }

  try {
    return new URL(supabaseUrl).hostname.split(".")[0] ?? null;
  } catch {
    return null;
  }
}

export function getSupabaseAuthStorageKey() {
  const projectRef = getProjectRef(env.NEXT_PUBLIC_SUPABASE_URL);
  return projectRef ? `sb-${projectRef}-auth-token` : null;
}

export function isStaleSupabaseSessionError(error: unknown) {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";

  return /invalid refresh token/i.test(message) || /refresh token not found/i.test(message);
}

function clearStorageKey(storage: Storage | undefined, key: string) {
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(key);
  } catch {
    // Ignore browser storage failures.
  }
}

function shouldRemoveCookie(cookieName: string, baseKey: string) {
  return cookieName === baseKey || cookieName.startsWith(`${baseKey}.`);
}

export function clearBrowserSupabaseAuthState(options?: { preserveCodeVerifier?: boolean }) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const storageKey = getSupabaseAuthStorageKey();
  if (!storageKey) {
    return;
  }

  const removableKeys = [storageKey, `${storageKey}-user`];

  if (!options?.preserveCodeVerifier) {
    removableKeys.push(`${storageKey}-code-verifier`);
  }

  removableKeys.forEach((key) => {
    clearStorageKey(window.localStorage, key);
    clearStorageKey(window.sessionStorage, key);
  });

  const cookieNames = document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => entry.split("=")[0] ?? "");

  cookieNames.forEach((cookieName) => {
    if (!removableKeys.some((key) => shouldRemoveCookie(cookieName, key))) {
      return;
    }

    document.cookie = `${cookieName}=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
  });
}

type RecoverableSupabaseClient = {
  auth?: {
    signOut: (options?: { scope?: "global" | "local" | "others" }) => Promise<unknown>;
  };
} | null;

export async function recoverFromStaleBrowserSession(
  supabase: RecoverableSupabaseClient,
  error: unknown,
  options?: { preserveCodeVerifier?: boolean },
) {
  if (!isStaleSupabaseSessionError(error)) {
    return false;
  }

  try {
    await supabase?.auth?.signOut({ scope: "local" });
  } catch {
    // Fall back to manual cleanup below.
  }

  clearBrowserSupabaseAuthState(options);
  return true;
}
