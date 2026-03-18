import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]",
  {
    variants: {
      variant: {
        neutral: "border-white/72 bg-white/54 text-foreground",
        success: "border-white/72 bg-[rgba(215,237,247,0.86)] text-accent-foreground",
        warning: "border-white/72 bg-[rgba(239,245,223,0.92)] text-secondary-foreground",
        danger: "border-white/72 bg-[rgba(182,79,68,0.16)] text-danger",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
