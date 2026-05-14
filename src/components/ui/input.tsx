import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "glass-control flex h-12 w-full rounded-[0.95rem] px-4 py-3 text-[0.95rem] text-foreground outline-none transition-[border-color,box-shadow,background-color,transform] duration-200 placeholder:text-muted-foreground/90 hover:-translate-y-[1px] hover:border-[rgba(199,207,225,0.98)] hover:bg-white focus:border-[rgba(123,63,242,0.34)] focus:bg-white focus:shadow-[0_0_0_4px_var(--ring),0_18px_34px_rgba(44,55,91,0.1)]",
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = "Input";
