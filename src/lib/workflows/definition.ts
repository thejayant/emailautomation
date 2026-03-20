import { stripHtmlToText } from "@/lib/utils/html";

export type WorkflowBranchCondition = "time" | "opened" | "clicked";
export type WorkflowBranchOutcome = "next_step" | "exit_sequence";
export type WorkflowComposerMode = "text" | "html";

export type WorkflowStepInput = {
  key?: string | null;
  stepNumber?: number | null;
  name?: string | null;
  waitDays?: number | null;
  branchCondition?: WorkflowBranchCondition | null;
  onMatch?: WorkflowBranchOutcome | null;
  onNoMatch?: WorkflowBranchOutcome | null;
  subject: string;
  mode: WorkflowComposerMode;
  body?: string | null;
  bodyHtml?: string | null;
};

export type WorkflowStepDefinition = {
  key: string;
  stepNumber: number;
  name: string;
  waitDays: number;
  branchCondition: WorkflowBranchCondition;
  onMatch: WorkflowBranchOutcome;
  onNoMatch: WorkflowBranchOutcome;
  subject: string;
  mode: WorkflowComposerMode;
  body: string;
  bodyHtml: string;
};

export type CampaignWorkflowDefinition = {
  version: 1;
  steps: WorkflowStepDefinition[];
};

export type StoredWorkflowEvent = {
  eventType: string;
  stepNumber?: number | null;
};

function normalizeStepName(step: WorkflowStepInput, index: number) {
  return step.name?.trim() || `Step ${index + 1}`;
}

function normalizeStepKey(step: WorkflowStepInput, index: number) {
  return step.key?.trim() || `step-${index + 1}`;
}

function normalizeStepBody(step: WorkflowStepInput) {
  if (step.mode === "html") {
    const bodyHtml = step.bodyHtml?.trim() || "";
    const body = step.body?.trim() || stripHtmlToText(bodyHtml);
    return { body, bodyHtml };
  }

  return {
    body: step.body?.trim() || "",
    bodyHtml: step.bodyHtml?.trim() || "",
  };
}

export function normalizeWorkflowDefinition(
  definition: { steps?: WorkflowStepInput[] } | Partial<CampaignWorkflowDefinition> | null | undefined,
): CampaignWorkflowDefinition {
  const rawSteps = Array.isArray(definition?.steps) ? definition.steps : [];
  const steps = rawSteps
    .map((step, index) => {
      const normalizedBody = normalizeStepBody(step);
      return {
        key: normalizeStepKey(step, index),
        stepNumber: index + 1,
        name: normalizeStepName(step, index),
        waitDays: Math.max(0, Number(step.waitDays ?? 0)),
        branchCondition: (step.branchCondition ?? "time") as WorkflowBranchCondition,
        onMatch: (step.onMatch ?? "next_step") as WorkflowBranchOutcome,
        onNoMatch: (step.onNoMatch ?? "next_step") as WorkflowBranchOutcome,
        subject: step.subject.trim(),
        mode: step.mode,
        body: normalizedBody.body,
        bodyHtml: normalizedBody.bodyHtml,
      } satisfies WorkflowStepDefinition;
    })
    .sort((left, right) => left.stepNumber - right.stepNumber)
    .map((step, index) => ({
      ...step,
      key: normalizeStepKey(step, index),
      stepNumber: index + 1,
      name: normalizeStepName(step, index),
    }));

  return {
    version: 1,
    steps,
  };
}

export function buildLegacyWorkflowDefinition(input: {
  followUpDelayDays: number;
  primaryStep: {
    subject: string;
    mode: WorkflowComposerMode;
    body?: string | null;
    bodyHtml?: string | null;
  };
  followupStep: {
    subject: string;
    mode: WorkflowComposerMode;
    body?: string | null;
    bodyHtml?: string | null;
  };
}) {
  return normalizeWorkflowDefinition({
    steps: [
      {
        name: "Primary email",
        waitDays: input.followUpDelayDays,
        branchCondition: "time",
        onMatch: "next_step",
        onNoMatch: "next_step",
        ...input.primaryStep,
      },
      {
        name: "Follow-up",
        waitDays: 0,
        branchCondition: "time",
        onMatch: "exit_sequence",
        onNoMatch: "exit_sequence",
        ...input.followupStep,
      },
    ],
  });
}

export function getWorkflowStepByNumber(
  definition: CampaignWorkflowDefinition | null | undefined,
  stepNumber: number,
) {
  return (definition?.steps ?? []).find((step) => step.stepNumber === stepNumber) ?? null;
}

export function getNextWorkflowStep(
  definition: CampaignWorkflowDefinition | null | undefined,
  stepNumber: number,
) {
  return (definition?.steps ?? []).find((step) => step.stepNumber === stepNumber + 1) ?? null;
}

export function deriveCampaignStepsFromWorkflow(definition: CampaignWorkflowDefinition) {
  return definition.steps.map((step, index) => ({
    step_number: step.stepNumber,
    step_type: index === 0 ? "initial" : "follow_up",
    subject_template: step.subject,
    body_template: step.body,
    body_html_template: step.mode === "html" ? step.bodyHtml || null : null,
    wait_days: step.waitDays,
  }));
}

export function buildWorkflowDefinitionFromStoredSteps(
  steps: Array<{
    step_number: number;
    step_type?: string | null;
    subject_template: string;
    body_template: string;
    body_html_template?: string | null;
    wait_days?: number | null;
  }>,
) {
  return normalizeWorkflowDefinition({
    steps: steps
      .slice()
      .sort((left, right) => left.step_number - right.step_number)
      .map((step, index) => ({
        key: `step-${step.step_number}`,
        name:
          step.step_type === "follow_up"
            ? `Follow-up ${index}`
            : step.step_number === 1
              ? "Primary email"
              : `Step ${step.step_number}`,
        waitDays: Number(step.wait_days ?? 0),
        branchCondition: "time",
        onMatch: index === steps.length - 1 ? "exit_sequence" : "next_step",
        onNoMatch: index === steps.length - 1 ? "exit_sequence" : "next_step",
        subject: step.subject_template,
        mode: step.body_html_template ? "html" : "text",
        body: step.body_template,
        bodyHtml: step.body_html_template ?? "",
      })),
  });
}

export function summarizeWorkflowEvents(
  events: StoredWorkflowEvent[],
  stepNumber: number,
) {
  return {
    opened: events.some(
      (event) => event.eventType === "opened" && Number(event.stepNumber ?? 0) === stepNumber,
    ),
    clicked: events.some(
      (event) => event.eventType === "clicked" && Number(event.stepNumber ?? 0) === stepNumber,
    ),
  };
}

export function resolveWorkflowAdvance(input: {
  definition: CampaignWorkflowDefinition;
  stepNumber: number;
  events: StoredWorkflowEvent[];
}) {
  const step = getWorkflowStepByNumber(input.definition, input.stepNumber);
  const nextStep = getNextWorkflowStep(input.definition, input.stepNumber);

  if (!step) {
    return { action: "exit" as const, exitReason: "missing_step" };
  }

  if (!nextStep) {
    return { action: "exit" as const, exitReason: "workflow_complete" };
  }

  if (step.branchCondition === "time") {
    const outcome = step.onMatch;
    return outcome === "next_step"
      ? {
          action: "advance" as const,
          nextStep,
          matched: true,
          exitReason: null,
          transitionReason: "time_elapsed",
        }
      : {
          action: "exit" as const,
          matched: true,
          exitReason: "time_elapsed_exit",
        };
  }

  const summary = summarizeWorkflowEvents(input.events, step.stepNumber);
  const matched = step.branchCondition === "opened" ? summary.opened : summary.clicked;
  const outcome = matched ? step.onMatch : step.onNoMatch;

  if (outcome === "next_step") {
    return {
      action: "advance" as const,
      nextStep,
      matched,
      exitReason: null,
      transitionReason: matched
        ? `${step.branchCondition}_matched`
        : `${step.branchCondition}_missing`,
    };
  }

  return {
    action: "exit" as const,
    matched,
    exitReason: matched
      ? `${step.branchCondition}_matched_exit`
      : `${step.branchCondition}_missing_exit`,
  };
}
