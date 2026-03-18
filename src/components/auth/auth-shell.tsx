import type { ReactNode } from "react";
import { productContent } from "@/content/product";

type AuthShellProps = {
  badge?: string;
  title?: string;
  description?: string;
  caption?: string;
  children: ReactNode;
};

export function AuthShell({ badge, title, description, caption, children }: AuthShellProps) {
  return (
    <section className="auth-stage-simple relative isolate w-full max-w-[34rem]">
      <div className="relative z-10 space-y-5">
        {badge || title || description ? (
          <div className="space-y-4 text-center">
            {badge ? (
              <div className="glass-chip inline-flex items-center rounded-full px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                {badge}
              </div>
            ) : null}
            {title || description ? (
              <div className="space-y-2">
                {title ? (
                  <h1 className="text-[2.6rem] font-semibold tracking-[-0.07em] text-foreground sm:text-[3rem]">
                    {title}
                  </h1>
                ) : null}
                {description ? (
                  <p className="mx-auto max-w-[34rem] text-base leading-8 text-muted-foreground">
                    {description}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
        {children}
        {caption ? (
          <p className="mx-auto max-w-md text-center text-sm leading-6 text-muted-foreground">{caption}</p>
        ) : null}
        <div className="text-center font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground/80">
          {productContent.auth.securityLabel}
        </div>
      </div>
    </section>
  );
}
