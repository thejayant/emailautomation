import { describe, expect, it } from "vitest";
import { buildWorkspaceShellLabel, getWorkspaceOwnerFirstName } from "@/lib/db/workspace-label";

describe("workspace label helpers", () => {
  it("uses the first token from the user's full name", () => {
    expect(
      getWorkspaceOwnerFirstName({
        fullName: "Jayant Sharma",
        workspaceName: "Jayant Sharma Workspace",
        email: "jayant@example.com",
      }),
    ).toBe("Jayant");

    expect(
      buildWorkspaceShellLabel({
        fullName: "Jayant Sharma",
        workspaceName: "Jayant Sharma Workspace",
        email: "jayant@example.com",
      }),
    ).toBe("Jayant Workspace");
  });

  it("falls back to the workspace name when full name is unavailable", () => {
    expect(
      buildWorkspaceShellLabel({
        workspaceName: "Northstar Team Workspace",
        email: "team@example.com",
      }),
    ).toBe("Northstar Workspace");
  });

  it("falls back to a cleaned email prefix when needed", () => {
    expect(
      buildWorkspaceShellLabel({
        email: "jayant-kumar@example.com",
        workspaceName: "Workspace",
      }),
    ).toBe("Jayant Workspace");
  });
});
