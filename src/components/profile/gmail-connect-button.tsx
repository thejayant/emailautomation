"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { GmailMark } from "@/components/icons/gmail-mark";
import { Button } from "@/components/ui/button";

type GmailConnectButtonProps = {
  label: string;
};

export function GmailConnectButton({ label }: GmailConnectButtonProps) {
  const [isDesktop] = useState(
    () => typeof window !== "undefined" && Boolean(window.outboundFlowDesktop?.isDesktop),
  );
  const [isPending, startTransition] = useTransition();

  if (!isDesktop) {
    return (
      <Button asChild variant="outline" className="gmail-connect-button w-full sm:w-auto sm:min-w-[13rem]">
        <Link href="/api/gmail/connect">
          <span className="gmail-connect-button-icon">
            <GmailMark className="size-5" />
          </span>
          {label}
        </Link>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      disabled={isPending}
      className="gmail-connect-button w-full sm:w-auto sm:min-w-[13rem]"
      onClick={() => {
        startTransition(async () => {
          const result = await window.outboundFlowDesktop?.connectGmail();

          if (!result?.ok) {
            toast.error(result?.error ?? "Could not start the Gmail connection flow.");
          }
        });
      }}
    >
      <span className="gmail-connect-button-icon">
        {isPending ? <LoaderCircle className="size-5 animate-spin" /> : <GmailMark className="size-5" />}
      </span>
      {label}
    </Button>
  );
}
