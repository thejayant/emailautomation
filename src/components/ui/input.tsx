import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "glass-control flex h-12 w-full rounded-[1.15rem] px-4 py-3 text-[0.95rem] text-foreground outline-none transition-[border-color,box-shadow,background-color,transform] duration-200 placeholder:text-muted-foreground/90 hover:-translate-y-[1px] hover:border-white/90 hover:bg-white/82 focus:border-white/95 focus:bg-white/88 focus:shadow-[0_0_0_4px_var(--ring),0_18px_34px_rgba(17,39,63,0.12)]",
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = "Input";
