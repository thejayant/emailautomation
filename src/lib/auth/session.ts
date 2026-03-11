import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getSessionUser() {
  const supabase = await createServerSupabaseClient({ canSetCookies: false });

  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function requireSessionUser() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/sign-in");
  }

  return user;
}
