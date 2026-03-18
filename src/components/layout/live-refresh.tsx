"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { productContent } from "@/content/product";
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
      <span className="glass-chip rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </span>
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
        {isPending ? productContent.shared.liveRefresh.syncing : productContent.shared.liveRefresh.syncNow}
      </Button>
    </div>
  );
}
