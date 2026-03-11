"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";

type SendNowButtonProps = {
  campaignId: string;
  label?: string;
  disabled?: boolean;
  refreshOnSuccess?: boolean;
} & Omit<ButtonProps, "onClick">;

export function SendNowButton({
  campaignId,
  label = "Send now",
  disabled = false,
  refreshOnSuccess = true,
  ...buttonProps
}: SendNowButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const response = await fetch("/api/campaigns/send-now", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ campaignId }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error(typeof payload?.error === "string" ? payload.error : "Failed to send campaign");
        return;
      }

      const processed = Number(payload?.processed ?? 0);

      if (processed > 0) {
        toast.success(`Queued send completed for ${processed} contact${processed === 1 ? "" : "s"}.`);
      } else {
        toast.message("No eligible contacts were ready to send.");
      }

      if (refreshOnSuccess) {
        router.refresh();
      }
    });
  }

  return (
    <Button
      {...buttonProps}
      disabled={disabled || isPending}
      onClick={handleClick}
      type="button"
    >
      {isPending ? "Sending..." : label}
    </Button>
  );
}
