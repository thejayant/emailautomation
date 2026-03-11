import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/db/database.types";
import { env, supabaseBrowserKey } from "@/lib/supabase/env";

export async function createServerSupabaseClient(options?: { canSetCookies?: boolean }) {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !supabaseBrowserKey) {
    return null;
  }

  const cookieStore = await cookies();
  const canSetCookies = options?.canSetCookies ?? false;

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseBrowserKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          if (!canSetCookies) {
            return;
          }

          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  ) as unknown as ReturnType<typeof createServerClient<Database>>;
}
