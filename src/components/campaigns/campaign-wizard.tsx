"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState, useTransition } from "react";
import type { Control, UseFormRegister, UseFormSetValue } from "react-hook-form";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import { productContent } from "@/content/product";
import type { ContactRecord } from "@/lib/types/contact";
import { previewRenderedTemplate } from "@/lib/utils/template";
import { campaignLaunchSchema } from "@/lib/zod/schemas";
import { ManualContactForm } from "@/components/forms/manual-contact-form";
import { SafeHtmlContent } from "@/components/shared/safe-html-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type CampaignFormValues = z.input<typeof campaignLaunchSchema>;

type WizardProps = {
  gmailAccounts: Array<{ id: string; email_address: string }>;
  contacts: ContactRecord[];
  templates: Array<{
    id: string;
    name: string;
    subject_template: string;
    body_template: string;
    body_html_template?: string | null;
  }>;
  mode?: "create" | "edit";
  campaignId?: string;
  initialValues?: CampaignFormValues;
};

type StepEditorProps = {
  title: string;
  description: string;
  namePrefix: "primaryStep" | "followupStep";
  control: Control<CampaignFormValues>;
  register: UseFormRegister<CampaignFormValues>;
  previewContact: {
    first_name?: string | null;
    last_name?: string | null;
    company?: string | null;
    website?: string | null;
    job_title?: string | null;
    custom?: Record<string, string | number | boolean | null | undefined> | null;
  };
  setValue: UseFormSetValue<CampaignFormValues>;
  templates: WizardProps["templates"];
};

function getTemplateSnippet(template: {
  body_template: string;
  body_html_template?: string | null;
}) {
  if (template.body_html_template) {
    return productContent.templates.table.htmlPreviewLabel;
  }

  return template.body_template.slice(0, 120) || productContent.shared.noBodyLabel;
}

function CampaignStepEditor({
  title,
  description,
  namePrefix,
  control,
  register,
  previewContact,
  setValue,
  templates,
}: StepEditorProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const stepCopy = productContent.campaigns.wizard.stepEditor;
  const mode = useWatch({ control, name: `${namePrefix}.mode` as const });
  const subject = useWatch({ control, name: `${namePrefix}.subject` as const });
  const body = useWatch({ control, name: `${namePrefix}.body` as const });
  const bodyHtml = useWatch({ control, name: `${namePrefix}.bodyHtml` as const });
  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? null,
    [selectedTemplateId, templates],
  );
  const deferredPreview = useDeferredValue({ subject, body, bodyHtml, mode });
  const preview = useMemo(
    () =>
      previewRenderedTemplate({
        subjectTemplate: deferredPreview.subject ?? "",
        bodyTemplate: deferredPreview.body ?? "",
        bodyHtmlTemplate: deferredPreview.mode === "html" ? deferredPreview.bodyHtml ?? "" : null,
        contact: previewContact,
      }),
    [deferredPreview, previewContact],
  );

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{title}</CardTitle>
          <Badge variant="neutral">
            {mode === "html" ? stepCopy.htmlModeLabel : stepCopy.textModeLabel}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)]">
        <div className="grid gap-4">
          {templates.length ? (
            <div className="glass-control grid gap-3 rounded-[1.75rem] p-4">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor={`${namePrefix}-template`}>{stepCopy.savedTemplateLabel}</Label>
                <span className="text-xs text-muted-foreground">
                  {stepCopy.savedTemplateHint}
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                <select
                  id={`${namePrefix}-template`}
                  className="glass-control h-12 flex-1 appearance-none rounded-[1.15rem] border-0 px-4 text-sm shadow-none"
                  value={selectedTemplateId}
                  onChange={(event) => {
                    const nextId = event.target.value;
                    setSelectedTemplateId(nextId);
                    const nextTemplate = templates.find((template) => template.id === nextId);

                    if (!nextTemplate) {
                      return;
                    }

                    const templateMode = nextTemplate.body_html_template ? "html" : "text";
                    setValue(`${namePrefix}.mode` as const, templateMode, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                    setValue(`${namePrefix}.subject` as const, nextTemplate.subject_template, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                    setValue(`${namePrefix}.body` as const, nextTemplate.body_template ?? "", {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                    setValue(`${namePrefix}.bodyHtml` as const, nextTemplate.body_html_template ?? "", {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                    toast.success(stepCopy.loadedTemplateMessage(nextTemplate.name));
                  }}
                >
                  <option value="">{stepCopy.emptyTemplateOption}</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}{" "}
                      {template.body_html_template
                        ? `(${stepCopy.htmlModeLabel})`
                        : `(${stepCopy.textModeLabel})`}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <Badge variant="neutral">
                    {selectedTemplate?.body_html_template
                      ? stepCopy.htmlModeLabel
                      : selectedTemplate
                        ? stepCopy.textModeLabel
                        : stepCopy.savedCountLabel(templates.length)}
                  </Badge>
                </div>
              </div>
              {selectedTemplate ? (
                <div className="rounded-[1.5rem] border border-white/50 bg-white/52 px-4 py-3 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">{selectedTemplate.subject_template}</p>
                  <p className="mt-1 leading-6">{getTemplateSnippet(selectedTemplate)}</p>
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="grid gap-2">
            <Label>{stepCopy.composerModeLabel}</Label>
            <Tabs
              value={mode ?? "text"}
              onValueChange={(value) => setValue(`${namePrefix}.mode` as const, value as "text" | "html", { shouldDirty: true })}
            >
              <TabsList>
                <TabsTrigger value="text">{stepCopy.textModeLabel}</TabsTrigger>
                <TabsTrigger value="html">{stepCopy.htmlModeLabel}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${namePrefix}-subject`}>{stepCopy.subjectLabel}</Label>
            <Input id={`${namePrefix}-subject`} {...register(`${namePrefix}.subject` as const)} />
          </div>
          {mode === "html" ? (
            <>
              <div className="grid gap-2">
                <Label htmlFor={`${namePrefix}-html`}>{stepCopy.htmlBodyLabel}</Label>
                <Textarea
                  id={`${namePrefix}-html`}
                  className="min-h-60 font-mono text-xs"
                  {...register(`${namePrefix}.bodyHtml` as const)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`${namePrefix}-file`}>{stepCopy.importHtmlLabel}</Label>
                <Input
                  id={`${namePrefix}-file`}
                  type="file"
                  accept=".html,.htm,text/html"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) {
                      return;
                    }

                    void file.text().then((value) => {
                      setValue(`${namePrefix}.mode` as const, "html", { shouldDirty: true });
                      setValue(`${namePrefix}.bodyHtml` as const, value, { shouldDirty: true, shouldValidate: true });
                    });
                  }}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`${namePrefix}-fallback`}>{stepCopy.fallbackLabel}</Label>
                <Textarea
                  id={`${namePrefix}-fallback`}
                  className="min-h-36"
                  placeholder={stepCopy.fallbackPlaceholder}
                  {...register(`${namePrefix}.body` as const)}
                />
              </div>
            </>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor={`${namePrefix}-body`}>{stepCopy.bodyLabel}</Label>
              <Textarea id={`${namePrefix}-body`} className="min-h-60" {...register(`${namePrefix}.body` as const)} />
            </div>
          )}
        </div>

        <div className="glass-control rounded-[1.75rem] p-5 lg:sticky lg:top-6 lg:self-start">
          <Tabs defaultValue="rendered" className="grid gap-4">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="rendered">{productContent.shared.previewTab}</TabsTrigger>
              <TabsTrigger value="text">{productContent.shared.textTab}</TabsTrigger>
            </TabsList>
            <TabsContent value="rendered" className="mt-0">
              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  {stepCopy.previewSubjectLabel}
                </p>
                <p className="text-base font-semibold">
                  {preview.subject || productContent.shared.noSubjectLabel}
                </p>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  {stepCopy.previewBodyLabel}
                </p>
                {mode === "html" && preview.bodyHtml ? (
                  <div className="overflow-hidden rounded-[1.5rem] border border-white/65 bg-white p-4 text-sm leading-6 text-slate-700">
                    <SafeHtmlContent html={preview.bodyHtml} />
                  </div>
                ) : (
                  <div className="rounded-[1.5rem] border border-white/60 bg-white/54 p-4 text-sm leading-6 text-muted-foreground whitespace-pre-wrap">
                    {preview.body || productContent.shared.noBodyLabel}
                  </div>
                )}
              </div>
            </TabsContent>
            <TabsContent value="text" className="mt-0">
              <div className="rounded-[1.5rem] border border-white/60 bg-white/54 p-4 text-sm leading-6 text-muted-foreground whitespace-pre-wrap">
                {preview.textFallback || productContent.shared.noTextPreviewLabel}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
}

export function CampaignWizard({
  gmailAccounts,
  contacts,
  templates,
  mode = "create",
  campaignId,
  initialValues,
}: WizardProps) {
  const wizardCopy = productContent.campaigns.wizard;
  const hasMailbox = gmailAccounts.length > 0;
  const [availableContacts, setAvailableContacts] = useState(contacts);
  const [contactQuery, setContactQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignLaunchSchema),
    defaultValues:
      initialValues ?? {
        campaignName: "",
        gmailAccountId: gmailAccounts[0]?.id ?? "",
        contactListId: "",
        targetContactIds: contacts.slice(0, 3).map((contact) => contact.id),
        timezone: "Asia/Calcutta",
        sendWindowStart: "09:00",
        sendWindowEnd: "17:00",
        dailySendLimit: 25,
        primaryStep: {
          subject: "Quick idea for {{company}}",
          mode: "text",
          body: "Hi {{first_name}},\n\nThought this might be relevant for {{company}}.\n\nBest,\nJay",
          bodyHtml: "",
        },
        followupStep: {
          subject: "Following up on my note",
          mode: "text",
          body: "Hi {{first_name}},\n\nBumping this once in case it got buried.\n\nBest,\nJay",
          bodyHtml: "",
        },
      },
  });
  const watchedTargetContactIds = useWatch({
    control: form.control,
    name: "targetContactIds",
  });
  const targetContactIds = useMemo(() => watchedTargetContactIds ?? [], [watchedTargetContactIds]);
  const filteredContacts = useMemo(() => {
    const normalizedQuery = contactQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return availableContacts;
    }

    return availableContacts.filter((contact) =>
      [
        contact.email,
        contact.first_name,
        contact.last_name,
        contact.company,
        contact.job_title,
        ...(contact.tags ?? []).map((tag) => tag.name),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery)),
    );
  }, [availableContacts, contactQuery]);

  const previewContact = useMemo(() => {
    const selectedContact = availableContacts.find((contact) => targetContactIds.includes(contact.id));
    return {
      first_name: selectedContact?.first_name ?? "Alina",
      last_name: selectedContact?.last_name ?? "Stone",
      company: selectedContact?.company ?? "Northstar",
      website: selectedContact?.website ?? "northstar.dev",
      job_title: selectedContact?.job_title ?? "Founder",
      custom: (selectedContact?.custom_fields_jsonb as Record<string, string | number | boolean | null | undefined> | null | undefined) ?? null,
    };
  }, [availableContacts, targetContactIds]);

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
        const url = mode === "edit" && campaignId ? `/api/campaigns/${campaignId}` : "/api/campaigns/launch";
        const method = mode === "edit" ? "PUT" : "POST";
        const response = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        });

        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          toast.error(payload?.error ?? (mode === "edit" ? wizardCopy.toasts.updateError : wizardCopy.toasts.launchError));
          return;
        }

        const resolvedCampaignId = (payload?.id as string | undefined) ?? campaignId;

        if (!resolvedCampaignId) {
          toast.error(wizardCopy.toasts.missingCampaignId);
          return;
        }

        if (mode === "edit") {
          toast.success(wizardCopy.toasts.updated);
          window.location.href = `/campaigns/${resolvedCampaignId}`;
          return;
        }

        if (!sendNow) {
          toast.success(wizardCopy.toasts.launched);
          window.location.href = `/campaigns/${resolvedCampaignId}`;
          return;
        }

        const sendResponse = await fetch("/api/campaigns/send-now", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ campaignId: resolvedCampaignId }),
        });
        const sendPayload = await sendResponse.json().catch(() => null);

        if (!sendResponse.ok) {
          toast.error(
            typeof sendPayload?.error === "string" ? sendPayload.error : wizardCopy.toasts.sendNowFailed,
          );
          window.location.href = `/campaigns/${resolvedCampaignId}`;
          return;
        }

        const processed = Number(sendPayload?.processed ?? 0);
        toast.success(
          processed > 0
            ? wizardCopy.toasts.launchedAndSent(processed)
            : wizardCopy.toasts.launchedNoReadyContacts,
        );
        window.location.href = `/campaigns/${resolvedCampaignId}`;
      });
    })();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === "edit" ? wizardCopy.title.edit : wizardCopy.title.create}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-8"
          onSubmit={(event) => {
            event.preventDefault();
            void submitCampaign(false);
          }}
        >
          <section className="grid gap-4 md:grid-cols-3">
            <div className="glass-control rounded-[1.75rem] p-5">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                {wizardCopy.summary.audience.eyebrow}
              </p>
              <p className="mt-3 text-3xl font-semibold text-foreground">{targetContactIds.length}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {wizardCopy.summary.audience.description}
              </p>
            </div>
            <div className="glass-control rounded-[1.75rem] p-5">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                {wizardCopy.summary.templates.eyebrow}
              </p>
              <p className="mt-3 text-3xl font-semibold text-foreground">{templates.length}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {wizardCopy.summary.templates.description}
              </p>
            </div>
            <div className="glass-control rounded-[1.75rem] p-5">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                {wizardCopy.summary.mailboxes.eyebrow}
              </p>
              <p className="mt-3 text-3xl font-semibold text-foreground">{gmailAccounts.length}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {wizardCopy.summary.mailboxes.description}
              </p>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="campaignName">{wizardCopy.campaignNameLabel}</Label>
              <Input id="campaignName" {...form.register("campaignName")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="gmailAccountId">{wizardCopy.senderLabel}</Label>
              <select
                id="gmailAccountId"
                className="glass-control h-12 appearance-none rounded-[1.15rem] border-0 px-4 text-sm shadow-none"
                {...form.register("gmailAccountId")}
              >
                {!hasMailbox ? (
                  <option value="">{wizardCopy.senderEmptyLabel}</option>
                ) : null}
                {gmailAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.email_address}
                  </option>
                ))}
              </select>
              {!hasMailbox ? (
                <div className="glass-control flex flex-col items-start gap-3 rounded-[1.5rem] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{wizardCopy.senderHelperTitle}</p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {wizardCopy.senderHelperDescription}
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/profile">{wizardCopy.senderHelperCta}</Link>
                  </Button>
                </div>
              ) : null}
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
            <div className="grid gap-2">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="grid gap-1">
                  <Label htmlFor="contact-search">{wizardCopy.targetContactsLabel}</Label>
                  <span className="text-xs text-muted-foreground">
                    {wizardCopy.targetContactsSummary(targetContactIds.length)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      form.setValue(
                        "targetContactIds",
                        [...new Set([...form.getValues("targetContactIds"), ...filteredContacts.map((contact) => contact.id)])],
                        { shouldDirty: true, shouldValidate: true },
                      )
                    }
                  >
                    {wizardCopy.selectVisibleLabel}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      form.setValue("targetContactIds", [], {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                  >
                    {wizardCopy.clearSelectionLabel}
                  </Button>
                </div>
              </div>
              <Input
                id="contact-search"
                placeholder={wizardCopy.searchContactsPlaceholder}
                value={contactQuery}
                onChange={(event) => setContactQuery(event.target.value)}
              />
              <div className="solid-content grid max-h-[28rem] gap-2 overflow-auto rounded-[1.75rem] p-4">
                {filteredContacts.length ? (
                  filteredContacts.map((contact) => (
                    <label
                      key={contact.id}
                      className="flex items-start gap-3 rounded-[1.25rem] border border-transparent px-3 py-3 text-sm transition hover:border-white/65 hover:bg-white/56"
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
                          {[contact.first_name, contact.last_name].filter(Boolean).join(" ") || wizardCopy.noNameLabel}
                          {contact.company ? ` - ${contact.company}` : ""}
                        </span>
                        {(contact.tags ?? []).length ? (
                          <span className="flex flex-wrap gap-2">
                            {(contact.tags ?? []).slice(0, 3).map((tag) => (
                              <Badge key={tag.id} variant="neutral">
                                {tag.name}
                              </Badge>
                            ))}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-border/80 px-4 py-8 text-center text-sm text-muted-foreground">
                    {availableContacts.length
                      ? wizardCopy.noContactsSearchLabel
                      : wizardCopy.noContactsLabel}
                  </div>
                )}
              </div>
            </div>
            <ManualContactForm
              title={wizardCopy.addInlineTitle}
              description={wizardCopy.addInlineDescription}
              submitLabel={wizardCopy.addInlineSubmitLabel}
              onCreated={handleContactCreated}
              asForm={false}
            />
          </section>

          <section className="grid gap-4 md:grid-cols-4">
            <div className="grid gap-2">
              <Label htmlFor="timezone">{wizardCopy.schedule.timezoneLabel}</Label>
              <Input id="timezone" {...form.register("timezone")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sendWindowStart">{wizardCopy.schedule.startLabel}</Label>
              <Input id="sendWindowStart" {...form.register("sendWindowStart")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sendWindowEnd">{wizardCopy.schedule.endLabel}</Label>
              <Input id="sendWindowEnd" {...form.register("sendWindowEnd")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dailySendLimit">{wizardCopy.schedule.dailyCapLabel}</Label>
              <Input id="dailySendLimit" type="number" {...form.register("dailySendLimit")} />
            </div>
          </section>

          <CampaignStepEditor
            title={wizardCopy.primaryStep.title}
            description={wizardCopy.primaryStep.description}
            namePrefix="primaryStep"
            control={form.control}
            register={form.register}
            previewContact={previewContact}
            setValue={form.setValue}
            templates={templates}
          />
          <CampaignStepEditor
            title={wizardCopy.followupStep.title}
            description={wizardCopy.followupStep.description}
            namePrefix="followupStep"
            control={form.control}
            register={form.register}
            previewContact={previewContact}
            setValue={form.setValue}
            templates={templates}
          />

          <div className="flex flex-wrap justify-end gap-3">
            {mode === "create" ? (
              <Button type="button" variant="outline" disabled={isPending || !hasMailbox} onClick={() => void submitCampaign(true)}>
                {isPending ? wizardCopy.actions.pendingCreate : wizardCopy.actions.launchNow}
              </Button>
            ) : null}
            <Button type="submit" disabled={isPending || !hasMailbox}>
              {isPending
                ? mode === "edit"
                  ? wizardCopy.actions.pendingEdit
                  : wizardCopy.actions.pendingCreate
                : mode === "edit"
                  ? wizardCopy.actions.saveChanges
                  : wizardCopy.actions.launch}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
