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
        "glass-control scrollbar-none inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-[1.25rem] p-1 text-muted-foreground",
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
        "inline-flex min-h-10 items-center justify-center whitespace-nowrap rounded-[1rem] px-4 py-2.5 text-sm font-semibold transition-[transform,box-shadow,background-color,color,border-color] duration-200 ease-out focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring hover:bg-white/48 hover:text-foreground data-[state=active]:glass-control data-[state=active]:border-white/90 data-[state=active]:text-foreground data-[state=active]:shadow-[0_16px_30px_rgba(17,39,63,0.12)] motion-reduce:transform-none motion-reduce:transition-none",
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
