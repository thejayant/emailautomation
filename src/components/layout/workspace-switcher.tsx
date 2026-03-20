"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type WorkspaceOption = {
  id: string;
  name: string;
  kind: "personal" | "shared";
  role: "owner" | "admin" | "member";
};

export function WorkspaceSwitcher({
  activeWorkspaceId,
  workspaces,
}: {
  activeWorkspaceId: string;
  workspaces: WorkspaceOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <label className="grid gap-1.5 text-left">
      <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-sidebar-muted">
        Active workspace
      </span>
      <select
        className="glass-control h-11 rounded-[1rem] border-0 px-3 text-sm shadow-none"
        value={activeWorkspaceId}
        disabled={isPending}
        onChange={(event) => {
          const nextWorkspaceId = event.target.value;

          startTransition(async () => {
            const response = await fetch("/api/workspace/active", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ workspaceId: nextWorkspaceId }),
            });

            if (!response.ok) {
              const payload = await response.json().catch(() => null);
              toast.error(payload?.error ?? "Failed to switch workspace");
              return;
            }

            router.refresh();
          });
        }}
      >
        {workspaces.map((workspace) => (
          <option key={workspace.id} value={workspace.id}>
            {workspace.name} [{workspace.kind}/{workspace.role}]
          </option>
        ))}
      </select>
    </label>
  );
}
