import { describe, expect, it } from "vitest";
import {
  buildLegacyWorkflowDefinition,
  normalizeWorkflowDefinition,
  resolveWorkflowAdvance,
} from "@/lib/workflows/definition";

describe("normalizeWorkflowDefinition", () => {
  it("adds keys, step numbers, and html fallbacks", () => {
    const workflow = normalizeWorkflowDefinition({
      steps: [
        {
          name: "Intro",
          waitDays: 2,
          branchCondition: "opened",
          onMatch: "next_step",
          onNoMatch: "exit_sequence",
          subject: "Hello",
          mode: "html",
          bodyHtml: "<p>Hi {{first_name}}</p>",
        },
      ],
    });

    expect(workflow.steps[0]).toMatchObject({
      key: "step-1",
      stepNumber: 1,
      branchCondition: "opened",
      body: "Hi {{first_name}}",
    });
  });

  it("converts the legacy two-step flow into the new structure", () => {
    const workflow = buildLegacyWorkflowDefinition({
      followUpDelayDays: 3,
      primaryStep: {
        subject: "First",
        mode: "text",
        body: "One",
      },
      followupStep: {
        subject: "Second",
        mode: "text",
        body: "Two",
      },
    });

    expect(workflow.steps).toHaveLength(2);
    expect(workflow.steps[0]).toMatchObject({
      waitDays: 3,
      onMatch: "next_step",
    });
    expect(workflow.steps[1]).toMatchObject({
      onMatch: "exit_sequence",
    });
  });
});

describe("resolveWorkflowAdvance", () => {
  it("advances when the tracked condition matches", () => {
    const workflow = normalizeWorkflowDefinition({
      steps: [
        {
          name: "Intro",
          waitDays: 2,
          branchCondition: "opened",
          onMatch: "next_step",
          onNoMatch: "exit_sequence",
          subject: "Hello",
          mode: "text",
          body: "One",
        },
        {
          name: "Follow-up",
          waitDays: 0,
          branchCondition: "time",
          onMatch: "exit_sequence",
          onNoMatch: "exit_sequence",
          subject: "Again",
          mode: "text",
          body: "Two",
        },
      ],
    });

    const resolution = resolveWorkflowAdvance({
      definition: workflow,
      stepNumber: 1,
      events: [{ eventType: "opened", stepNumber: 1 }],
    });

    expect(resolution.action).toBe("advance");
  });

  it("exits when the branch condition misses and fallback exits", () => {
    const workflow = normalizeWorkflowDefinition({
      steps: [
        {
          name: "Intro",
          waitDays: 2,
          branchCondition: "clicked",
          onMatch: "next_step",
          onNoMatch: "exit_sequence",
          subject: "Hello",
          mode: "text",
          body: "One",
        },
        {
          name: "Follow-up",
          waitDays: 0,
          branchCondition: "time",
          onMatch: "exit_sequence",
          onNoMatch: "exit_sequence",
          subject: "Again",
          mode: "text",
          body: "Two",
        },
      ],
    });

    const resolution = resolveWorkflowAdvance({
      definition: workflow,
      stepNumber: 1,
      events: [],
    });

    expect(resolution).toMatchObject({
      action: "exit",
      exitReason: "clicked_missing_exit",
    });
  });
});
