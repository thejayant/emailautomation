import { ReactNode } from "react";
import { WalkthroughTrigger } from "@/components/walkthrough/walkthrough-trigger";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div
      className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"
      data-tour="page-header-root"
    >
      <div className="min-w-0 space-y-4">
        {eyebrow ? (
          <div className="inline-flex w-fit items-center rounded-full bg-transparent font-mono text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
            {eyebrow}
          </div>
        ) : null}
        <div className="space-y-3">
          <h1 className="max-w-4xl text-3xl font-semibold tracking-[-0.055em] text-foreground sm:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 lg:justify-end">
        <WalkthroughTrigger />
        {actions}
      </div>
    </div>
  );
}
