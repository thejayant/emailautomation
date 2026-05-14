import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]",
  {
    variants: {
      variant: {
        neutral: "border-[rgba(219,225,238,0.95)] bg-white/86 text-foreground",
        success: "border-[rgba(181,232,200,0.95)] bg-[rgba(231,247,236,0.96)] text-secondary-foreground",
        warning: "border-[rgba(229,217,255,0.96)] bg-[rgba(240,233,255,0.96)] text-accent-foreground",
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
