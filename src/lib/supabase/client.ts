"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/db/database.types";
import { env, supabaseBrowserKey } from "@/lib/supabase/env";

let clientSingleton: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient(options?: { isSingleton?: boolean }) {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !supabaseBrowserKey) {
    throw new Error("Supabase browser env is not configured.");
  }

  const shouldUseSingleton = options?.isSingleton !== false;

  if (shouldUseSingleton && clientSingleton) {
    return clientSingleton as unknown as ReturnType<typeof createBrowserClient<Database>>;
  }

  const client = createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseBrowserKey,
    shouldUseSingleton ? undefined : { isSingleton: false },
  );

  if (shouldUseSingleton) {
    clientSingleton = client;
  }

  return client as unknown as ReturnType<typeof createBrowserClient<Database>>;
}
