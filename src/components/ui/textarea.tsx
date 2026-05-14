import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "glass-control min-h-32 w-full rounded-[1rem] px-4 py-3 text-sm text-foreground outline-none transition-[border-color,box-shadow,background-color,transform] duration-200 placeholder:text-muted-foreground focus:border-[rgba(123,63,242,0.34)] focus:bg-white focus:shadow-[0_0_0_4px_var(--ring),0_18px_34px_rgba(44,55,91,0.1)]",
      className,
    )}
    {...props}
  />
));

Textarea.displayName = "Textarea";
