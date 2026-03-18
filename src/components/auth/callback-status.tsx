"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertCircle, LoaderCircle } from "lucide-react";
import { productContent } from "@/content/product";
import {
  clearBrowserSupabaseAuthState,
  recoverFromStaleBrowserSession,
  STALE_BROWSER_SESSION_MESSAGE,
} from "@/lib/supabase/browser-auth";
import { createClient } from "@/lib/supabase/client";
import { getBrowserPostAuthRedirectPath } from "@/lib/auth/redirects";
import { Button } from "@/components/ui/button";

function decodeMessage(value?: string | null) {
  if (!value) {
    return null;
  }

  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return value;
  }
}

export function CallbackStatus() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function finishAuthentication() {
      const supabase = createClient({ isSingleton: false });

      try {
        const search = new URLSearchParams(window.location.search);
        const hash = new URLSearchParams(window.location.hash.slice(1));
        const type = search.get("type") ?? hash.get("type");
        const errorMessage =
          decodeMessage(search.get("error_description")) ??
          decodeMessage(hash.get("error_description")) ??
          decodeMessage(search.get("error")) ??
          decodeMessage(hash.get("error"));

        if (errorMessage) {
          throw new Error(errorMessage);
        }

        if (type === "recovery") {
          const recoveryQuery = new URLSearchParams(window.location.search);
          recoveryQuery.set("mode", "update");
          const hashSuffix = window.location.hash || "";
          window.location.replace(`/forgot-password?${recoveryQuery.toString()}${hashSuffix}`);
          return;
        }

        clearBrowserSupabaseAuthState({ preserveCodeVerifier: true });

        const code = search.get("code");
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            throw exchangeError;
          }
        }

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          throw new Error("Authentication could not be completed. Please try again.");
        }

        const nextPath = await getBrowserPostAuthRedirectPath(supabase, user.id);
        window.location.replace(nextPath);
      } catch (caughtError) {
        if (!isActive) {
          return;
        }

        const message =
          (await recoverFromStaleBrowserSession(supabase, caughtError, {
            preserveCodeVerifier: true,
          }))
            ? STALE_BROWSER_SESSION_MESSAGE
            : caughtError instanceof Error
              ? caughtError.message
              : productContent.auth.callback.genericError;
        setError(message);
      }
    }

    void finishAuthentication();

    return () => {
      isActive = false;
    };
  }, []);

  if (error) {
    return (
      <div className="grid gap-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-danger/10 text-danger">
          <AlertCircle className="size-6" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-[-0.04em] text-foreground">
            {productContent.auth.callback.errorTitle}
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">{error}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild className="h-11 flex-1 rounded-[1.15rem]">
            <Link href="/sign-in">{productContent.auth.callback.backToSignIn}</Link>
          </Button>
          <Button asChild variant="outline" className="h-11 flex-1 rounded-[1.15rem]">
            <Link href="/sign-up">{productContent.auth.callback.createAccount}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 text-center">
      <div className="glass-control mx-auto flex h-14 w-14 items-center justify-center rounded-[1.2rem] text-foreground">
        <LoaderCircle className="size-6 animate-spin" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-foreground">
          {productContent.auth.callback.pendingTitle}
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">
          {productContent.auth.callback.pendingDescription}
        </p>
      </div>
    </div>
  );
}
