type WorkspaceShellLabelOptions = {
  email?: string | null;
  fullName?: string | null;
  workspaceName?: string | null;
};

function stripWorkspaceSuffix(value?: string | null) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.replace(/\s+workspace$/i, "").trim();
  return normalized || null;
}

function normalizeEmailPrefix(email?: string | null) {
  const prefix = email?.split("@")[0]?.trim();

  if (!prefix) {
    return null;
  }

  const normalized = prefix
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .find(Boolean);

  if (!normalized) {
    return null;
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function getWorkspaceOwnerFirstName({
  email,
  fullName,
  workspaceName,
}: WorkspaceShellLabelOptions) {
  const nameCandidate =
    stripWorkspaceSuffix(fullName) ??
    (() => {
      const workspaceCandidate = stripWorkspaceSuffix(workspaceName);
      return workspaceCandidate && !/^workspace$/i.test(workspaceCandidate)
        ? workspaceCandidate
        : null;
    })();

  const firstToken = nameCandidate?.split(/\s+/).find(Boolean);

  if (firstToken) {
    return firstToken;
  }

  return normalizeEmailPrefix(email);
}

export function buildWorkspaceShellLabel(options: WorkspaceShellLabelOptions) {
  const firstName = getWorkspaceOwnerFirstName(options);

  if (firstName) {
    return `${firstName} Workspace`;
  }

  const workspaceCandidate = stripWorkspaceSuffix(options.workspaceName);

  if (workspaceCandidate && !/^workspace$/i.test(workspaceCandidate)) {
    return `${workspaceCandidate} Workspace`;
  }

  return "Workspace";
}
