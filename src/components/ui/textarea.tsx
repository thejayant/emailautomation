import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "glass-control min-h-32 w-full rounded-[1.4rem] px-4 py-3 text-sm text-foreground outline-none transition-[border-color,box-shadow,background-color,transform] duration-200 placeholder:text-muted-foreground focus:border-white/95 focus:shadow-[0_0_0_4px_var(--ring),0_18px_34px_rgba(17,39,63,0.12)]",
      className,
    )}
    {...props}
  />
));

Textarea.displayName = "Textarea";
