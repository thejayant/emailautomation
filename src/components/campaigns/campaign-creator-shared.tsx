"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { Check, ChevronRight, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildLaunchChecklist,
  matchesTemplateIntent,
  type CampaignTemplateIntent,
  type CampaignCreatorStepId,
} from "@/lib/campaigns/creator";
import { creatorCopy } from "@/components/campaigns/campaign-creator-copy";
import { EmailPreviewFrame } from "@/components/templates/email-preview-frame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type TemplateOption = {
  id: string;
  name: string;
  subject_template: string;
  body_template: string;
  body_html_template?: string | null;
  preview_text?: string | null;
  category?: string | null;
  tags?: string[] | null;
};

export function getTemplateSnippet(template: {
  body_template: string;
  body_html_template?: string | null;
  preview_text?: string | null;
}) {
  if (template.body_html_template) {
    return "Designed HTML email ready to personalize.";
  }

  return template.preview_text?.trim() || template.body_template.slice(0, 140) || "No preview available.";
}

function TemplateThumbnail({ template }: { template: TemplateOption }) {
  if (template.body_html_template) {
    return (
      <div className="overflow-hidden rounded-[1.25rem] border border-white/70 bg-[linear-gradient(180deg,#edf3f6,#f9fbfd)]">
        <EmailPreviewFrame
          html={template.body_html_template}
          maxCanvasHeight={196}
          className="bg-[linear-gradient(180deg,#edf3f6,#f9fbfd)]"
          frameClassName="shadow-[0_18px_36px_rgba(17,39,63,0.08)]"
        />
      </div>
    );
  }

  return (
    <div className="grid min-h-[12.25rem] gap-3 rounded-[1.25rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,249,253,0.92))] p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex size-10 items-center justify-center rounded-[1rem] border border-white/72 bg-[rgba(215,237,247,0.78)] text-accent-foreground">
          <Mail className="size-4" />
        </span>
        <Badge variant="neutral">Text</Badge>
      </div>
      <div className="grid gap-2">
        <p className="line-clamp-2 text-sm font-semibold tracking-[-0.02em] text-foreground">
          {template.subject_template || "No subject yet"}
        </p>
        <p className="line-clamp-4 text-sm leading-6 text-muted-foreground">
          {getTemplateSnippet(template)}
        </p>
      </div>
    </div>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-sm text-danger">{message}</p>;
}

export function StarterCard({
  active,
  icon,
  title,
  description,
  badge,
  onClick,
  disabled = false,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid gap-4 rounded-[1.75rem] border p-5 text-left transition-all duration-200 ease-out",
        active
          ? "border-white/90 bg-[linear-gradient(180deg,rgba(215,237,247,0.72),rgba(255,255,255,0.88))] shadow-[0_24px_48px_rgba(17,39,63,0.14)]"
          : "glass-control hover:-translate-y-0.5 hover:border-white/90 hover:bg-white/82 hover:shadow-[0_16px_30px_rgba(17,39,63,0.12)]",
        disabled && "cursor-not-allowed opacity-60 hover:translate-y-0 hover:shadow-none",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-12 items-center justify-center rounded-[1.2rem] border border-white/72 bg-white/82 text-accent-foreground shadow-[0_14px_24px_rgba(17,39,63,0.1)]">
          {icon}
        </span>
        {badge ? <Badge variant="success">{badge}</Badge> : null}
      </div>
      <div className="grid gap-1">
        <p className="text-base font-semibold tracking-[-0.03em] text-foreground">{title}</p>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}

export function TemplateChooserDialog({
  open,
  onOpenChange,
  templates,
  selectedTemplateId,
  onSelect,
  intent,
  title,
  description,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: TemplateOption[];
  selectedTemplateId: string;
  onSelect: (templateId: string) => void;
  intent: CampaignTemplateIntent;
  title: string;
  description: string;
}) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const filteredTemplates = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    const templatesForIntent = templates.filter((template) => matchesTemplateIntent(template, intent));

    if (!normalizedQuery) {
      return templatesForIntent;
    }

    return templatesForIntent.filter((template) =>
      [
        template.name,
        template.subject_template,
        template.preview_text ?? "",
        template.category ?? "",
        ...(template.tags ?? []),
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery)),
    );
  }, [deferredQuery, intent, templates]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[86vh] overflow-hidden p-0">
        <DialogHeader className="border-b border-white/70 px-6 py-5">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 overflow-y-auto px-6 py-5">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={creatorCopy.start.templateSearchPlaceholder}
          />
          {filteredTemplates.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {filteredTemplates.map((template) => {
                const active = template.id === selectedTemplateId;
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => {
                      onSelect(template.id);
                      onOpenChange(false);
                    }}
                    className={cn(
                      "grid gap-3 rounded-[1.6rem] border p-4 text-left transition-all duration-200",
                      active
                        ? "border-white/90 bg-[linear-gradient(180deg,rgba(215,237,247,0.72),rgba(255,255,255,0.88))] shadow-[0_20px_38px_rgba(17,39,63,0.14)]"
                        : "glass-control hover:-translate-y-0.5 hover:border-white/90 hover:bg-white/80 hover:shadow-[0_18px_32px_rgba(17,39,63,0.12)]",
                    )}
                  >
                    <TemplateThumbnail template={template} />
                    <div className="flex items-start justify-between gap-3">
                      <div className="grid gap-1">
                        <p className="text-base font-semibold tracking-[-0.03em] text-foreground">
                          {template.name}
                        </p>
                        <p className="text-sm text-muted-foreground">{template.subject_template}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant={template.body_html_template ? "success" : "neutral"}>
                          {template.body_html_template ? "HTML" : "Text"}
                        </Badge>
                        {template.category ? (
                          <Badge variant="neutral">{template.category}</Badge>
                        ) : null}
                      </div>
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {getTemplateSnippet(template)}
                    </p>
                    <div className="flex items-center gap-2 text-sm font-semibold text-accent-foreground">
                      <span>{creatorCopy.start.templateSelectLabel}</span>
                      <ChevronRight className="size-4" />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[1.6rem] border border-dashed border-border/70 px-4 py-10 text-center">
              <p className="text-base font-semibold text-foreground">
                {creatorCopy.start.templateEmptyTitle}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {intent === "follow-up"
                  ? "No follow-up templates match this search yet. Add one in Templates or keep the default follow-up."
                  : creatorCopy.start.templateEmptyDescription}
              </p>
              <div className="mt-4 flex justify-center">
                <Button asChild variant="outline">
                  <Link href="/templates">Open templates</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SummaryRail({
  starterType,
  selectedTemplateName,
  senderEmail,
  selectedContactsCount,
  primarySubject,
  followUpDelayDays,
  sendWindowSummary,
  dailySendLimit,
  sequenceCount,
  checklist,
  onJump,
  className,
}: {
  starterType: "template" | "scratch";
  selectedTemplateName: string | null;
  senderEmail: string | null;
  selectedContactsCount: number;
  primarySubject: string;
  followUpDelayDays: number;
  sendWindowSummary: string;
  dailySendLimit: number;
  sequenceCount: number;
  checklist: ReturnType<typeof buildLaunchChecklist>;
  onJump: (stepId: CampaignCreatorStepId) => void;
  className?: string;
}) {
  const readyToLaunch = checklist.every((item) => item.complete);
  const summaryItems = [
    {
      label: creatorCopy.summary.starterLabel,
      value:
        starterType === "template"
          ? `${creatorCopy.summary.templateStarter}${selectedTemplateName ? `: ${selectedTemplateName}` : ""}`
          : creatorCopy.summary.scratchStarter,
      stepId: "start" as const,
    },
    {
      label: creatorCopy.summary.senderLabel,
      value: senderEmail ?? creatorCopy.summary.noSender,
      stepId: "start" as const,
    },
    {
      label: creatorCopy.summary.contactsLabel,
      value: `${selectedContactsCount} selected`,
      stepId: "audience" as const,
    },
    {
      label: creatorCopy.summary.subjectLabel,
      value: primarySubject.trim() || creatorCopy.summary.noSubject,
      stepId: "message" as const,
    },
    {
      label: creatorCopy.summary.followUpDelayLabel,
      value: `${followUpDelayDays} day${followUpDelayDays === 1 ? "" : "s"}`,
      stepId: "message" as const,
    },
    {
      label: creatorCopy.summary.sendWindowLabel,
      value: sendWindowSummary,
      stepId: "review" as const,
    },
    {
      label: creatorCopy.summary.dailyCapLabel,
      value: `${dailySendLimit} emails / day`,
      stepId: "review" as const,
    },
  ];

  return (
    <Card className={cn("overflow-hidden rounded-[1.65rem] bg-white/78", className)}>
      <CardHeader className="gap-5 border-b border-slate-200/80 bg-white/70">
        <div className="space-y-3">
          <CardTitle className="text-[1.2rem]">{creatorCopy.summary.title}</CardTitle>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span
              className={cn(
                "size-2.5 rounded-full",
                readyToLaunch ? "bg-emerald-500" : "bg-amber-500",
              )}
            />
            <span className={readyToLaunch ? "text-emerald-700" : "text-amber-700"}>
              {readyToLaunch ? "Ready to launch" : "Needs attention"}
            </span>
          </div>
          <CardDescription>
            Review your settings before launching.
          </CardDescription>
        </div>
        <div className="rounded-[1.2rem] border border-violet-100 bg-violet-50/72 px-4 py-4">
          <p className="text-lg font-semibold text-foreground">{sequenceCount}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            steps in this sequence
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Estimated duration: ~{followUpDelayDays} day{followUpDelayDays === 1 ? "" : "s"}
          </p>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5 bg-white/50 p-5 sm:p-6">
        <div className="grid gap-4">
          {summaryItems.map((item) => (
            <div
              key={item.label}
              className="flex items-start justify-between gap-3"
            >
              <div className="grid gap-1">
                <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-sidebar-muted">
                  {item.label}
                </p>
                <p className="text-sm font-medium text-foreground">{item.value}</p>
              </div>
              <button
                type="button"
                onClick={() => onJump(item.stepId)}
                className="text-xs font-semibold text-accent-foreground transition hover:text-foreground"
              >
                {creatorCopy.summary.change}
              </button>
            </div>
          ))}
        </div>

        <div className="grid gap-3 rounded-[1.25rem] border border-violet-100 bg-violet-50/62 p-4">
          <div className="space-y-1">
            <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-violet-700">
              {creatorCopy.review.checklistTitle}
            </p>
            <p className="text-sm text-muted-foreground">
              Final checks that make the launch state obvious.
            </p>
          </div>
          <div className="grid gap-2">
            {checklist.map((item) => (
              <div key={item.id} className="flex items-center gap-3 text-sm">
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full border",
                    item.complete
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-white/72 bg-white/70 text-muted-foreground",
                  )}
                >
                  {item.complete ? <Check className="size-4" /> : <ChevronRight className="size-4" />}
                </span>
                <span className={cn(item.complete ? "text-foreground" : "text-muted-foreground")}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
