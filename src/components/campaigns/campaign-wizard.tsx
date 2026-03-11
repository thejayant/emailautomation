"use client";

import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import type { ContactRecord } from "@/lib/types/contact";
import { campaignLaunchSchema } from "@/lib/zod/schemas";
import { ManualContactForm } from "@/components/forms/manual-contact-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type WizardProps = {
  gmailAccounts: Array<{ id: string; email_address: string }>;
  contacts: ContactRecord[];
};

export function CampaignWizard({ gmailAccounts, contacts }: WizardProps) {
  const [availableContacts, setAvailableContacts] = useState(contacts);
  const [isPending, startTransition] = useTransition();
  const form = useForm<z.input<typeof campaignLaunchSchema>>({
    resolver: zodResolver(campaignLaunchSchema),
    defaultValues: {
      campaignName: "",
      gmailAccountId: gmailAccounts[0]?.id ?? "",
      contactListId: "",
      targetContactIds: contacts.slice(0, 3).map((contact) => contact.id),
      timezone: "Asia/Calcutta",
      sendWindowStart: "09:00",
      sendWindowEnd: "17:00",
      dailySendLimit: 25,
      primarySubject: "Quick idea for {{company}}",
      primaryBody: "Hi {{first_name}},\n\nThought this might be relevant for {{company}}.\n\nBest,\nJay",
      followupSubject: "Following up on my note",
      followupBody: "Hi {{first_name}},\n\nBumping this once in case it got buried.\n\nBest,\nJay",
    },
  });
  const targetContactIds = useWatch({
    control: form.control,
    name: "targetContactIds",
  }) ?? [];

  function handleContactCreated(contact: ContactRecord) {
    setAvailableContacts((current) => [contact, ...current.filter((item) => item.id !== contact.id)]);
    form.setValue("targetContactIds", [...new Set([...form.getValues("targetContactIds"), contact.id])], {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  function submitCampaign(sendNow: boolean) {
    return form.handleSubmit((values) => {
      startTransition(async () => {
        const response = await fetch("/api/campaigns/launch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        });

        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          toast.error(payload?.error ?? "Failed to launch campaign");
          return;
        }

        const campaignId = payload?.id as string | undefined;

        if (!campaignId) {
          toast.error("Campaign was created without a valid ID.");
          return;
        }

        if (!sendNow) {
          toast.success("Campaign launched");
          window.location.href = `/campaigns/${campaignId}`;
          return;
        }

        const sendResponse = await fetch("/api/campaigns/send-now", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ campaignId }),
        });
        const sendPayload = await sendResponse.json().catch(() => null);

        if (!sendResponse.ok) {
          toast.error(typeof sendPayload?.error === "string" ? sendPayload.error : "Campaign created, but send now failed");
          window.location.href = `/campaigns/${campaignId}`;
          return;
        }

        const processed = Number(sendPayload?.processed ?? 0);
        toast.success(
          processed > 0
            ? `Campaign launched and sent to ${processed} contact${processed === 1 ? "" : "s"}.`
            : "Campaign launched. No contacts were ready to send yet.",
        );
        window.location.href = `/campaigns/${campaignId}`;
      });
    })();
  }

  return (
    <Card className="border-border/60 bg-card/90">
      <CardHeader>
        <CardTitle>Campaign builder</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-8"
          onSubmit={(event) => {
            event.preventDefault();
            void submitCampaign(false);
          }}
        >
          <section className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="campaignName">Campaign name</Label>
              <Input id="campaignName" {...form.register("campaignName")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="gmailAccountId">Sender mailbox</Label>
              <select
                id="gmailAccountId"
                className="h-11 rounded-2xl border border-border bg-white/75 px-4 text-sm"
                {...form.register("gmailAccountId")}
              >
                {gmailAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.email_address}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-4">
                <Label>Target contacts</Label>
                <span className="text-xs text-muted-foreground">{targetContactIds.length} selected</span>
              </div>
              <div className="grid gap-2 rounded-[28px] border border-border/60 bg-background/60 p-4">
                {availableContacts.length ? (
                  availableContacts.map((contact) => (
                    <label
                      key={contact.id}
                      className="flex items-start gap-3 rounded-2xl px-2 py-2 text-sm hover:bg-muted/30"
                    >
                      <input
                        type="checkbox"
                        value={contact.id}
                        checked={targetContactIds.includes(contact.id)}
                        onChange={(event) => {
                          const current = form.getValues("targetContactIds");
                          form.setValue(
                            "targetContactIds",
                            event.target.checked
                              ? [...current, contact.id]
                              : current.filter((value) => value !== contact.id),
                            { shouldDirty: true, shouldValidate: true },
                          );
                        }}
                      />
                      <span className="grid gap-1">
                        <span className="font-medium">{contact.email}</span>
                        <span className="text-xs text-muted-foreground">
                          {[contact.first_name, contact.last_name].filter(Boolean).join(" ") || "No name"}
                          {contact.company ? ` - ${contact.company}` : ""}
                        </span>
                      </span>
                    </label>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-border/80 px-4 py-8 text-center text-sm text-muted-foreground">
                    No contacts yet. Add one manually here or import contacts first.
                  </div>
                )}
              </div>
            </div>
            <ManualContactForm
              title="Add contact inline"
              description="Create a contact without leaving the campaign builder. New contacts are selected automatically."
              submitLabel="Add and select"
              onCreated={handleContactCreated}
              asForm={false}
            />
          </section>

          <section className="grid gap-4 md:grid-cols-4">
            <div className="grid gap-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input id="timezone" {...form.register("timezone")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sendWindowStart">Start</Label>
              <Input id="sendWindowStart" {...form.register("sendWindowStart")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sendWindowEnd">End</Label>
              <Input id="sendWindowEnd" {...form.register("sendWindowEnd")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dailySendLimit">Daily cap</Label>
              <Input id="dailySendLimit" type="number" {...form.register("dailySendLimit")} />
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="grid gap-4">
              <h3 className="font-semibold">Primary email</h3>
              <div className="grid gap-2">
                <Label htmlFor="primarySubject">Subject</Label>
                <Input id="primarySubject" {...form.register("primarySubject")} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="primaryBody">Body</Label>
                <Textarea id="primaryBody" {...form.register("primaryBody")} />
              </div>
            </div>
            <div className="grid gap-4">
              <h3 className="font-semibold">Follow-up (fixed 2 days)</h3>
              <div className="grid gap-2">
                <Label htmlFor="followupSubject">Subject</Label>
                <Input id="followupSubject" {...form.register("followupSubject")} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="followupBody">Body</Label>
                <Textarea id="followupBody" {...form.register("followupBody")} />
              </div>
            </div>
          </section>
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="outline" disabled={isPending} onClick={() => void submitCampaign(true)}>
              {isPending ? "Launching..." : "Launch and send now"}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Launching..." : "Launch campaign"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
