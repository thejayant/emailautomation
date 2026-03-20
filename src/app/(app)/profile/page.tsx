import { ProfileForm } from "@/components/forms/profile-form";
import { PageHeader } from "@/components/layout/page-header";
import { GmailConnectButton } from "@/components/profile/gmail-connect-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { productContent } from "@/content/product";
import { getWorkspaceContext } from "@/lib/db/workspace";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getWorkspaceGmailAccounts } from "@/services/gmail-service";

type ProfilePageProps = {
  searchParams?: Promise<{
    gmail?: string;
    message?: string;
  }>;
};

function getGmailBanner(gmail?: string, message?: string) {
  if (gmail === "connected") {
    return {
      tone: "success",
      text: productContent.profile.banners.connected,
    };
  }

  if (gmail === "disconnected") {
    return {
      tone: "default",
      text: productContent.profile.banners.disconnected,
    };
  }

  if (gmail === "missing-code") {
    return {
      tone: "error",
      text: productContent.profile.banners.missingCode,
    };
  }

  if (gmail === "error") {
    return {
      tone: "error",
      text: message ? decodeURIComponent(message) : productContent.profile.banners.genericError,
    };
  }

  return null;
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const params = (await searchParams) ?? {};
  const workspace = await getWorkspaceContext();
  const supabase = createAdminSupabaseClient();
  const { data: rawProfile } = await supabase
    .from("profiles")
    .select("full_name, title")
    .eq("id", workspace.userId)
    .maybeSingle();
  const profile = rawProfile as { full_name?: string | null; title?: string | null } | null;
  const gmailAccounts = (await getWorkspaceGmailAccounts(workspace.workspaceId)) as Array<{
    id: string;
    email_address: string;
    status: string;
    approval_status?: string | null;
    approval_note?: string | null;
  }>;
  const gmailBanner = getGmailBanner(params.gmail, params.message);

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow={productContent.profile.header.eyebrow}
        title={productContent.profile.header.title}
        description={productContent.profile.header.description}
      />
      {gmailBanner ? (
        <div
          className={
            gmailBanner.tone === "error"
              ? "rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"
              : gmailBanner.tone === "success"
                ? "rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700"
                : "rounded-2xl border border-border/60 bg-card/70 px-4 py-3 text-sm text-foreground"
          }
        >
          {gmailBanner.text}
        </div>
      ) : null}
      <ProfileForm
        defaultValues={{
          fullName: profile?.full_name ?? "",
          title: profile?.title ?? "",
        }}
      />
      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>{productContent.profile.gmailCard.title}</CardTitle>
          <GmailConnectButton label={productContent.profile.gmailCard.connectLabel} />
        </CardHeader>
        <CardContent className="grid gap-3">
          {gmailAccounts.length ? (
            gmailAccounts.map((account) => (
              <div
                key={account.id}
                className="glass-control flex items-center justify-between rounded-[1.5rem] px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">{account.email_address}</p>
                  <p className="text-muted-foreground">
                    {account.status} / {account.approval_status ?? "pending"}
                  </p>
                  {account.approval_note ? (
                    <p className="text-xs text-muted-foreground">{account.approval_note}</p>
                  ) : null}
                </div>
                <form action="/api/gmail/disconnect" method="post">
                  <input type="hidden" name="gmailAccountId" value={account.id} />
                  <button className="font-medium text-danger">
                    {productContent.profile.gmailCard.disconnectLabel}
                  </button>
                </form>
              </div>
            ))
          ) : (
            <div className="glass-control rounded-[1.5rem] px-4 py-5">
              <p className="font-medium text-foreground">{productContent.profile.gmailCard.emptyTitle}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {productContent.profile.gmailCard.emptyDescription}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
