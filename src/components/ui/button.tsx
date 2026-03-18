import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-[1.15rem] border text-sm font-semibold tracking-[-0.01em] transition-[transform,box-shadow,background-color,border-color,color,opacity] duration-200 ease-out focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-55 active:translate-y-[1px] active:scale-[0.99] motion-reduce:transform-none motion-reduce:transition-none",
  {
    variants: {
      variant: {
        default:
          "button-brand px-4 py-2.5 text-primary-foreground hover:-translate-y-0.5",
        secondary:
          "glass-control px-4 py-2.5 text-foreground hover:-translate-y-0.5 hover:border-white/90 hover:bg-white/82 hover:shadow-[0_18px_34px_rgba(17,39,63,0.12)]",
        outline:
          "glass-control px-4 py-2.5 text-foreground hover:-translate-y-0.5 hover:border-white/90 hover:bg-white/78 hover:shadow-[0_18px_34px_rgba(17,39,63,0.12)]",
        ghost:
          "border-transparent bg-transparent px-4 py-2.5 text-foreground shadow-none hover:-translate-y-0.5 hover:border-white/60 hover:bg-white/46 hover:shadow-[0_12px_24px_rgba(17,39,63,0.08)]",
        danger:
          "border-[#aa4a40] bg-[linear-gradient(180deg,rgba(196,92,81,0.98),rgba(174,73,63,0.98))] px-4 py-2.5 text-danger-foreground shadow-[0_18px_34px_rgba(174,73,63,0.2)] hover:-translate-y-0.5 hover:shadow-[0_22px_40px_rgba(174,73,63,0.26)]",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 rounded-[0.95rem] px-3.5 text-xs",
        lg: "h-12 rounded-[1.2rem] px-6 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);

Button.displayName = "Button";
