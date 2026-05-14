"use client";

import { useMemo, useState } from "react";
import { Code2, Eye, Mail, Monitor, Pencil, Smartphone } from "lucide-react";
import { useWatch, type UseFormReturn } from "react-hook-form";
import { previewRenderedTemplate } from "@/lib/utils/template";
import type { CampaignFormValues } from "@/lib/campaigns/wizard-defaults";
import { creatorCopy } from "@/components/campaigns/campaign-creator-copy";
import { FieldError } from "@/components/campaigns/campaign-creator-shared";
import { EmailPreviewFrame } from "@/components/templates/email-preview-frame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LiquidSelect } from "@/components/ui/liquid-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type PreviewContact = {
  first_name?: string | null;
  last_name?: string | null;
  company?: string | null;
  website?: string | null;
  job_title?: string | null;
  custom?: Record<string, string | number | boolean | null | undefined> | null;
};

function getStepFieldError(
  form: UseFormReturn<CampaignFormValues>,
  index: number,
  field: "subject" | "body" | "bodyHtml",
) {
  const stepError = form.formState.errors.workflowDefinition?.steps?.[index];
  const message = stepError?.[field]?.message;
  return typeof message === "string" ? message : undefined;
}

export function CampaignMessageCard({
  form,
  index,
  label,
  description,
  previewContact,
  sendDelayLabel,
  templateName,
  onOpenTemplateChooser,
}: {
  form: UseFormReturn<CampaignFormValues>;
  index: number;
  label: string;
  description: string;
  previewContact: PreviewContact;
  sendDelayLabel: string;
  templateName?: string | null;
  onOpenTemplateChooser?: () => void;
}) {
  const step = useWatch({
    control: form.control,
    name: `workflowDefinition.steps.${index}` as never,
  }) as CampaignFormValues["workflowDefinition"]["steps"][number] | undefined;
  const mode = step?.mode ?? "text";
  const [activeTab, setActiveTab] = useState<"write" | "preview">("preview");
  const [previewViewport, setPreviewViewport] = useState<"desktop" | "mobile">("desktop");
  const preview = useMemo(
    () =>
      previewRenderedTemplate({
        subjectTemplate: step?.subject ?? "",
        bodyTemplate: step?.body ?? "",
        bodyHtmlTemplate: mode === "html" ? step?.bodyHtml ?? "" : null,
        contact: previewContact,
      }),
    [mode, previewContact, step?.body, step?.bodyHtml, step?.subject],
  );

  return (
    <Card className="overflow-hidden rounded-[1.65rem]">
      <CardHeader className="gap-4 border-b border-slate-200/80 bg-white/72">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="flex items-start gap-3">
              <span className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-[0.85rem] border border-violet-200 bg-violet-50 text-violet-700">
                <Mail className="size-4" />
              </span>
              <div className="min-w-0 space-y-1">
                <CardTitle className="text-[1.05rem] tracking-[-0.03em]">
                  Email message
                </CardTitle>
                <CardDescription>{description}</CardDescription>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="neutral" className="bg-violet-100 text-violet-700">
                {label}
              </Badge>
              <Badge variant="neutral">{sendDelayLabel}</Badge>
              <Badge variant={mode === "html" ? "success" : "neutral"}>
                {mode === "html" ? "Designed email" : "Plain text"}
              </Badge>
            </div>
          </div>
          {onOpenTemplateChooser ? (
            <div className="grid justify-items-start gap-2 sm:justify-items-end">
              <Button type="button" variant="outline" size="sm" onClick={onOpenTemplateChooser}>
                {creatorCopy.message.changeTemplate}
              </Button>
              <p className="text-xs text-muted-foreground">
                {templateName ?? creatorCopy.summary.noTemplateSelected}
              </p>
            </div>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="grid gap-5 bg-white/54 p-5 sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="grid gap-2">
            <Label htmlFor={`workflow-step-${index}-subject`}>
              {creatorCopy.message.subjectLabel}
            </Label>
            <Input
              id={`workflow-step-${index}-subject`}
              className="bg-white/86"
              {...form.register(`workflowDefinition.steps.${index}.subject` as never)}
            />
            <FieldError message={getStepFieldError(form, index, "subject")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`workflow-step-${index}-name`}>
              {creatorCopy.message.routeNameLabel}
            </Label>
            <Input
              id={`workflow-step-${index}-name`}
              className="bg-white/86"
              {...form.register(`workflowDefinition.steps.${index}.name` as never)}
            />
          </div>
        </div>

        <div className="grid gap-3 rounded-[1.35rem] border border-slate-200/80 bg-white/70 p-4 lg:grid-cols-4">
          <div className="grid gap-2">
            <Label htmlFor={`workflow-step-${index}-wait`}>
              {creatorCopy.message.routeDelayLabel}
            </Label>
            <Input
              id={`workflow-step-${index}-wait`}
              type="number"
              min={0}
              max={30}
              className="bg-white"
              {...form.register(`workflowDefinition.steps.${index}.waitDays` as never)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`workflow-step-${index}-branch`}>
              {creatorCopy.message.routeBranchLabel}
            </Label>
            <LiquidSelect
              id={`workflow-step-${index}-branch`}
              ariaLabel={creatorCopy.message.routeBranchLabel}
              value={step?.branchCondition ?? "time"}
              onValueChange={(value) =>
                form.setValue(`workflowDefinition.steps.${index}.branchCondition` as never, value as never, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              triggerClassName="h-12 rounded-[1.15rem] bg-white"
              options={[
                {
                  value: "time",
                  label: creatorCopy.message.timeLabel,
                  description: "Send after the wait period",
                },
                {
                  value: "opened",
                  label: creatorCopy.message.openedLabel,
                  description: "Only continue if they opened",
                },
                {
                  value: "clicked",
                  label: creatorCopy.message.clickedLabel,
                  description: "Only continue if they clicked",
                },
              ]}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`workflow-step-${index}-match`}>
              {creatorCopy.message.routeMatchLabel}
            </Label>
            <LiquidSelect
              id={`workflow-step-${index}-match`}
              ariaLabel={creatorCopy.message.routeMatchLabel}
              value={step?.onMatch ?? "next_step"}
              onValueChange={(value) =>
                form.setValue(`workflowDefinition.steps.${index}.onMatch` as never, value as never, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              triggerClassName="h-12 rounded-[1.15rem] bg-white"
              options={[
                {
                  value: "next_step",
                  label: creatorCopy.message.nextStepLabel,
                  description: "Keep the sequence moving",
                },
                {
                  value: "exit_sequence",
                  label: creatorCopy.message.exitLabel,
                  description: "Stop this contact here",
                },
              ]}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`workflow-step-${index}-no-match`}>
              {creatorCopy.message.routeNoMatchLabel}
            </Label>
            <LiquidSelect
              id={`workflow-step-${index}-no-match`}
              ariaLabel={creatorCopy.message.routeNoMatchLabel}
              value={step?.onNoMatch ?? "next_step"}
              onValueChange={(value) =>
                form.setValue(`workflowDefinition.steps.${index}.onNoMatch` as never, value as never, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              triggerClassName="h-12 rounded-[1.15rem] bg-white"
              options={[
                {
                  value: "next_step",
                  label: creatorCopy.message.nextStepLabel,
                  description: "Keep the sequence moving",
                },
                {
                  value: "exit_sequence",
                  label: creatorCopy.message.exitLabel,
                  description: "Stop this contact here",
                },
              ]}
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "write" | "preview")} className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList className="w-fit">
              <TabsTrigger value="write">
                <Pencil className="size-4" />
                {creatorCopy.message.writeTab}
              </TabsTrigger>
              <TabsTrigger value="preview">
                <Eye className="size-4" />
                {creatorCopy.message.previewTab}
              </TabsTrigger>
            </TabsList>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                form.setValue(
                  `workflowDefinition.steps.${index}.mode` as never,
                  (mode === "html" ? "text" : "html") as never,
                  { shouldDirty: true, shouldValidate: true },
                )
              }
            >
              {mode === "html"
                ? creatorCopy.message.switchToText
                : creatorCopy.message.switchToHtml}
            </Button>
          </div>

          <TabsContent value="write" className="grid gap-4">
            {mode === "html" ? (
              <>
                <div className="grid gap-2">
                  <Label htmlFor={`workflow-step-${index}-html`}>
                    {creatorCopy.message.htmlBodyLabel}
                  </Label>
                  <Textarea
                    id={`workflow-step-${index}-html`}
                    className="min-h-72 bg-white/86 font-mono text-xs"
                    {...form.register(`workflowDefinition.steps.${index}.bodyHtml` as never)}
                  />
                  <FieldError message={getStepFieldError(form, index, "bodyHtml")} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`workflow-step-${index}-file`}>
                    {creatorCopy.message.importHtmlLabel}
                  </Label>
                  <Input
                    id={`workflow-step-${index}-file`}
                    type="file"
                    accept=".html,.htm,text/html"
                    className="bg-white/86"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) {
                        return;
                      }

                      void file.text().then((value) => {
                        form.setValue(`workflowDefinition.steps.${index}.mode` as never, "html" as never, {
                          shouldDirty: true,
                        });
                        form.setValue(`workflowDefinition.steps.${index}.bodyHtml` as never, value as never, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                      });
                    }}
                  />
                </div>
              </>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor={`workflow-step-${index}-body`}>
                  {creatorCopy.message.bodyLabel}
                </Label>
                <Textarea
                  id={`workflow-step-${index}-body`}
                  className="min-h-72 bg-white/86"
                  {...form.register(`workflowDefinition.steps.${index}.body` as never)}
                />
                <FieldError message={getStepFieldError(form, index, "body")} />
              </div>
            )}
          </TabsContent>

          <TabsContent value="preview" className="grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="grid gap-1">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  {creatorCopy.message.previewSubjectLabel}
                </p>
                <p className="text-base font-semibold text-foreground">
                  {preview.subject || "No subject yet"}
                </p>
              </div>
              <div className="flex rounded-[1rem] border border-slate-200/80 bg-white/72 p-1">
                <button
                  type="button"
                  onClick={() => setPreviewViewport("desktop")}
                  className={`inline-flex h-9 items-center gap-2 rounded-[0.75rem] px-3 text-xs font-semibold transition ${
                    previewViewport === "desktop"
                      ? "bg-violet-100 text-violet-700 shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Monitor className="size-4" />
                  Desktop
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewViewport("mobile")}
                  className={`inline-flex h-9 items-center gap-2 rounded-[0.75rem] px-3 text-xs font-semibold transition ${
                    previewViewport === "mobile"
                      ? "bg-violet-100 text-violet-700 shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Smartphone className="size-4" />
                  Mobile
                </button>
              </div>
            </div>
            <div className="grid gap-1">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                {creatorCopy.message.previewBodyLabel}
              </p>
              {mode === "html" && preview.bodyHtml ? (
                <div className="overflow-hidden rounded-[1.4rem] border border-slate-200/90 bg-[linear-gradient(180deg,#f8fbff,#eef3f8)] p-4">
                  <EmailPreviewFrame
                    html={preview.bodyHtml}
                    viewport={previewViewport}
                    presentation="reader"
                    viewportHeight="clamp(28rem, 62vh, 44rem)"
                    frameClassName="shadow-[0_22px_44px_rgba(17,39,63,0.1)]"
                  />
                </div>
              ) : (
                <div className="overflow-hidden rounded-[1.4rem] border border-slate-200/90 bg-white">
                  <div className="flex items-center justify-between border-b border-slate-200/80 bg-slate-50/80 px-4 py-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Code2 className="size-4 text-violet-700" />
                      Plain text preview
                    </div>
                    <Badge variant="neutral">{previewViewport}</Badge>
                  </div>
                  <div className="max-h-[44rem] overflow-y-auto whitespace-pre-wrap p-5 text-sm leading-7 text-muted-foreground">
                    {preview.body || "No message body yet"}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
