import { beforeEach, describe, expect, it, vi } from "vitest";

type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

function createStorage() {
  const store = new Map<string, string>();

  const storage: StorageLike = {
    getItem(key) {
      return store.get(key) ?? null;
    },
    setItem(key, value) {
      store.set(key, value);
    },
    removeItem(key) {
      store.delete(key);
    },
  };

  return { storage, store };
}

function createCookieDocument(initialCookies: Record<string, string>) {
  const cookies = new Map(Object.entries(initialCookies));

  return {
    get cookie() {
      return Array.from(cookies.entries())
        .map(([name, value]) => `${name}=${value}`)
        .join("; ");
    },
    set cookie(value: string) {
      const [rawName = "", rawCookieValue = ""] = value.split(";", 2)[0]?.split("=") ?? [];
      const cookieName = rawName.trim();

      if (!cookieName) {
        return;
      }

      if (/max-age=0/i.test(value) || /expires=thu,\s*01 jan 1970/i.test(value)) {
        cookies.delete(cookieName);
        return;
      }

      cookies.set(cookieName, rawCookieValue);
    },
    cookies,
  };
}

describe("browser auth recovery", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://dbsmydauvhbnlqgezscl.supabase.co";
  });

  it("clears stale session keys while preserving the code verifier when requested", async () => {
    const local = createStorage();
    const session = createStorage();
    const documentMock = createCookieDocument({
      "sb-dbsmydauvhbnlqgezscl-auth-token": "session",
      "sb-dbsmydauvhbnlqgezscl-auth-token.0": "session-chunk",
      "sb-dbsmydauvhbnlqgezscl-auth-token-user": "user",
      "sb-dbsmydauvhbnlqgezscl-auth-token-code-verifier": "verifier",
      "sb-dbsmydauvhbnlqgezscl-auth-token-code-verifier.0": "verifier-chunk",
      other_cookie: "keep",
    });

    globalThis.window = {
      localStorage: local.storage,
      sessionStorage: session.storage,
    } as typeof window;
    globalThis.document = documentMock as unknown as Document;

    local.storage.setItem("sb-dbsmydauvhbnlqgezscl-auth-token", "session");
    local.storage.setItem("sb-dbsmydauvhbnlqgezscl-auth-token-user", "user");
    local.storage.setItem("sb-dbsmydauvhbnlqgezscl-auth-token-code-verifier", "verifier");

    const { clearBrowserSupabaseAuthState } = await import("@/lib/supabase/browser-auth");

    clearBrowserSupabaseAuthState({ preserveCodeVerifier: true });

    expect(local.storage.getItem("sb-dbsmydauvhbnlqgezscl-auth-token")).toBeNull();
    expect(local.storage.getItem("sb-dbsmydauvhbnlqgezscl-auth-token-user")).toBeNull();
    expect(local.storage.getItem("sb-dbsmydauvhbnlqgezscl-auth-token-code-verifier")).toBe(
      "verifier",
    );
    expect(documentMock.cookies.has("sb-dbsmydauvhbnlqgezscl-auth-token")).toBe(false);
    expect(documentMock.cookies.has("sb-dbsmydauvhbnlqgezscl-auth-token.0")).toBe(false);
    expect(documentMock.cookies.has("sb-dbsmydauvhbnlqgezscl-auth-token-user")).toBe(false);
    expect(documentMock.cookies.has("sb-dbsmydauvhbnlqgezscl-auth-token-code-verifier")).toBe(
      true,
    );
    expect(
      documentMock.cookies.has("sb-dbsmydauvhbnlqgezscl-auth-token-code-verifier.0"),
    ).toBe(true);
    expect(documentMock.cookies.get("other_cookie")).toBe("keep");
  });

  it("detects stale refresh token errors", async () => {
    const { isStaleSupabaseSessionError } = await import("@/lib/supabase/browser-auth");

    expect(
      isStaleSupabaseSessionError(new Error("Invalid Refresh Token: Refresh Token Not Found")),
    ).toBe(true);
    expect(isStaleSupabaseSessionError(new Error("Unsupported provider"))).toBe(false);
  });
});
