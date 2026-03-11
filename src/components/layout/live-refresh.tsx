"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function LiveRefresh({
  intervalMs = 15000,
  label = "Live sync every 15s",
}: {
  intervalMs?: number;
  label?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      startTransition(() => {
        router.refresh();
      });
    }, intervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [intervalMs, router, startTransition]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => {
          startTransition(() => {
            router.refresh();
          });
        }}
      >
        {isPending ? "Syncing..." : "Sync now"}
      </Button>
    </div>
  );
}
