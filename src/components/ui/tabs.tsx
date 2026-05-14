import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

export function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        "glass-control scrollbar-none inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-[1rem] p-1 text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "inline-flex min-h-10 items-center justify-center whitespace-nowrap rounded-[0.85rem] px-4 py-2.5 text-sm font-semibold transition-[transform,box-shadow,background-color,color,border-color] duration-200 ease-out focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring hover:bg-white/72 hover:text-foreground data-[state=active]:border-[rgba(229,217,255,0.96)] data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-[0_12px_24px_rgba(123,63,242,0.12)] motion-reduce:transform-none motion-reduce:transition-none",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn("min-w-0 outline-none", className)} {...props} />;
}
