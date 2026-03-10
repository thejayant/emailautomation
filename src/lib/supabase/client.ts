"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/db/database.types";
import { env, supabaseBrowserKey } from "@/lib/supabase/env";

let clientSingleton: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !supabaseBrowserKey) {
    throw new Error("Supabase browser env is not configured.");
  }

  if (!clientSingleton) {
    clientSingleton = createBrowserClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseBrowserKey,
    );
  }

  return clientSingleton as unknown as ReturnType<typeof createBrowserClient<Database>>;
}
