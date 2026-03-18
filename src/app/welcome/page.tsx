import { redirect } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { productContent } from "@/content/product";
import { AuthShell } from "@/components/auth/auth-shell";
import { WelcomeForm } from "@/components/forms/welcome-form";
import { getServerPostAuthRedirectPath } from "@/lib/auth/redirects";
import { requireSessionUser } from "@/lib/auth/session";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export default async function WelcomePage() {
  const user = await requireSessionUser();
  const nextPath = await getServerPostAuthRedirectPath(user.id);

  if (nextPath !== "/welcome") {
    redirect(nextPath);
  }

  const supabase = createAdminSupabaseClient();
  const { data: rawProfile } = await supabase
    .from("profiles")
    .select("full_name, title")
    .eq("id", user.id)
    .maybeSingle();

  const profile = rawProfile as { full_name?: string | null; title?: string | null } | null;

  return (
    <main className="auth-page-shell relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div className="auth-page-orb auth-page-orb-left" />
      <div className="auth-page-orb auth-page-orb-right" />
      <div className="auth-page-orb auth-page-orb-bottom" />

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-7xl items-center justify-center">
        <AuthShell
          badge={productContent.auth.welcome.badge}
          title={productContent.auth.welcome.title}
          description={productContent.auth.welcome.description}
          caption={productContent.auth.welcome.caption}
        >
          <div className="auth-card grid gap-6 p-7 sm:p-8">
            <div className="grid gap-4">
              <div className="glass-control flex h-16 w-16 items-center justify-center rounded-[1.45rem] text-foreground">
                <Sparkles className="size-7" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold tracking-[-0.05em] text-foreground">
                  {productContent.auth.welcome.panelTitle}
                </h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  {productContent.auth.welcome.panelDescription}
                </p>
              </div>
            </div>

            <WelcomeForm
              defaultValues={{
                fullName:
                  profile?.full_name ?? user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "",
                title: profile?.title ?? "",
              }}
            />

            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
              <ArrowRight className="size-3.5" />
              {productContent.auth.welcome.nextLabel}
            </div>
          </div>
        </AuthShell>
      </div>
    </main>
  );
}
