import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { getWorkspaceContext } from "@/lib/db/workspace";
import { getWorkspaceAdminSummary, getWorkspaceHealthSummary } from "@/services/admin-service";

function HealthBadge({ status }: { status: string }) {
  return (
    <Badge variant={status === "healthy" ? "success" : status === "warning" ? "neutral" : "danger"}>
      {status}
    </Badge>
  );
}

export default async function SettingsPage() {
  const workspace = await getWorkspaceContext();
  const adminSummary = await getWorkspaceAdminSummary(workspace.workspaceId);
  const healthSummary = getWorkspaceHealthSummary();
  const canManage = ["owner", "admin"].includes(workspace.workspaceRole);

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Operations console"
        title={workspace.workspaceName}
        description="Manage members, approved senders, billing state, CRM connections, and telemetry health from one shared admin surface."
      />

      <section className="grid gap-4 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{adminSummary.members.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Approved senders</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {adminSummary.gmailAccounts.filter((account) => account.approval_status === "approved").length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>CRM connections</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{adminSummary.crmConnections.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Seed inboxes</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{adminSummary.seedInboxes.length}</CardContent>
        </Card>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Workspace health</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {healthSummary.map((item) => (
              <div key={item.key} className="glass-control flex items-center justify-between rounded-[1.25rem] px-4 py-3">
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.summary}</p>
                </div>
                <HealthBadge status={item.status} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plan and usage</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            {canManage ? (
              <form action="/api/settings/billing" method="post" className="glass-control grid gap-3 rounded-[1.25rem] px-4 py-4">
                <div className="grid gap-1">
                  <p className="font-medium">Assign internal plan</p>
                  <p className="text-muted-foreground">
                    Update entitlement state without public checkout.
                  </p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    type="text"
                    name="planKey"
                    defaultValue={adminSummary.billingAccount?.plan_key ?? "internal_mvp"}
                    className="glass-control h-11 rounded-[1rem] border-0 px-4 text-sm shadow-none"
                  />
                  <select
                    name="status"
                    defaultValue={adminSummary.billingAccount?.status ?? "active"}
                    className="glass-control h-11 rounded-[1rem] border-0 px-4 text-sm shadow-none"
                  >
                    <option value="trialing">trialing</option>
                    <option value="active">active</option>
                    <option value="past_due">past_due</option>
                    <option value="canceled">canceled</option>
                  </select>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" size="sm">Save plan</Button>
                </div>
              </form>
            ) : null}
            <div className="glass-control rounded-[1.25rem] px-4 py-3">
              <p className="font-medium">Billing status</p>
              <p className="mt-1 text-muted-foreground">
                {(adminSummary.billingAccount?.status ?? "inactive").replace(/_/g, " ")}
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="glass-control rounded-[1.25rem] px-4 py-3">
                <p className="font-medium">Seats used</p>
                <p className="mt-1 text-muted-foreground">{adminSummary.usageCounter?.seats_used ?? 0}</p>
              </div>
              <div className="glass-control rounded-[1.25rem] px-4 py-3">
                <p className="font-medium">Approved mailboxes</p>
                <p className="mt-1 text-muted-foreground">{adminSummary.usageCounter?.connected_mailboxes_count ?? 0}</p>
              </div>
              <div className="glass-control rounded-[1.25rem] px-4 py-3">
                <p className="font-medium">Active campaigns</p>
                <p className="mt-1 text-muted-foreground">{adminSummary.usageCounter?.active_campaigns_count ?? 0}</p>
              </div>
              <div className="glass-control rounded-[1.25rem] px-4 py-3">
                <p className="font-medium">Daily sends used</p>
                <p className="mt-1 text-muted-foreground">{adminSummary.usageCounter?.daily_sends_used ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Team members</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {adminSummary.members.map((member) => (
              <div key={member.id} className="glass-control flex items-center justify-between rounded-[1.25rem] px-4 py-3">
                <div>
                  <p className="font-medium">{member.fullName}</p>
                  <p className="text-sm text-muted-foreground">{member.title ?? "No title set"}</p>
                </div>
                <Badge variant="neutral">{member.role}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sender approvals</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {adminSummary.gmailAccounts.length ? (
              adminSummary.gmailAccounts.map((account) => (
                <div key={account.id} className="glass-control grid gap-3 rounded-[1.25rem] px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{account.email_address}</p>
                      <p className="text-sm text-muted-foreground">
                        {account.approval_status ?? "pending"} / {account.health_status ?? "unknown"}
                      </p>
                    </div>
                    <HealthBadge
                      status={
                        account.approval_status === "approved"
                          ? "healthy"
                          : account.approval_status === "rejected"
                            ? "error"
                            : "warning"
                      }
                    />
                  </div>
                  {canManage && account.approval_status !== "approved" ? (
                    <div className="flex flex-wrap gap-2">
                      <form action="/api/gmail/approve" method="post">
                        <input type="hidden" name="gmailAccountId" value={account.id} />
                        <input type="hidden" name="approvalStatus" value="approved" />
                        <Button size="sm" type="submit">Approve sender</Button>
                      </form>
                      <form action="/api/gmail/approve" method="post">
                        <input type="hidden" name="gmailAccountId" value={account.id} />
                        <input type="hidden" name="approvalStatus" value="rejected" />
                        <Button size="sm" type="submit" variant="outline">Reject</Button>
                      </form>
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="glass-control rounded-[1.25rem] px-4 py-5 text-sm text-muted-foreground">
                No senders connected yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>CRM connections</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {adminSummary.crmConnections.length ? (
              adminSummary.crmConnections.map((connection) => (
                <div key={connection.id} className="glass-control flex items-center justify-between rounded-[1.25rem] px-4 py-3">
                  <div>
                    <p className="font-medium">{connection.provider_account_label ?? connection.provider}</p>
                    <p className="text-sm text-muted-foreground">
                      {connection.provider} / {connection.status}
                    </p>
                  </div>
                  <Badge variant="neutral">{connection.last_synced_at ? "synced" : "idle"}</Badge>
                </div>
              ))
            ) : (
              <div className="glass-control rounded-[1.25rem] px-4 py-5 text-sm text-muted-foreground">
                No CRM connections have been configured yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Seed inbox monitors</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {canManage ? (
              <form action="/api/settings/seed-inboxes" method="post" className="glass-control grid gap-3 rounded-[1.25rem] px-4 py-4">
                <div className="grid gap-1">
                  <p className="font-medium">Add monitored inbox</p>
                  <p className="text-sm text-muted-foreground">
                    Register owned inboxes for exact placement telemetry.
                  </p>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <select
                    name="provider"
                    defaultValue="gmail"
                    className="glass-control h-11 rounded-[1rem] border-0 px-4 text-sm shadow-none"
                  >
                    <option value="gmail">gmail</option>
                    <option value="outlook">outlook</option>
                    <option value="yahoo">yahoo</option>
                    <option value="other">other</option>
                  </select>
                  <input
                    type="email"
                    name="emailAddress"
                    placeholder="seed@company.com"
                    className="glass-control h-11 rounded-[1rem] border-0 px-4 text-sm shadow-none md:col-span-2"
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" size="sm">Add inbox</Button>
                </div>
              </form>
            ) : null}
            {adminSummary.seedInboxes.length ? (
              adminSummary.seedInboxes.map((inbox) => (
                <div key={inbox.id} className="glass-control flex items-center justify-between rounded-[1.25rem] px-4 py-3">
                  <div>
                    <p className="font-medium">{inbox.email_address}</p>
                    <p className="text-sm text-muted-foreground">
                      {inbox.provider} / {inbox.status}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={inbox.status === "active" ? "success" : "neutral"}>
                      {inbox.last_checked_at ? "checked" : "pending"}
                    </Badge>
                    {canManage ? (
                      <form action="/api/settings/seed-inboxes" method="post">
                        <input type="hidden" name="seedInboxId" value={inbox.id} />
                        <input type="hidden" name="status" value={inbox.status === "active" ? "paused" : "active"} />
                        <Button size="sm" variant="outline" type="submit">
                          {inbox.status === "active" ? "Pause" : "Resume"}
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="glass-control rounded-[1.25rem] px-4 py-5 text-sm text-muted-foreground">
                Add monitored inbox accounts to enable exact placement telemetry on owned seed mailboxes.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
