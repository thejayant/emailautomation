import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function TabLoading({
  title = "Loading workspace",
  rows = 4,
}: {
  title?: string;
  rows?: number;
}) {
  return (
    <div className="grid gap-8" aria-busy="true">
      <div className="space-y-3">
        <div className="h-3 w-28 rounded-full bg-muted/70" />
        <div className="h-9 w-72 max-w-full rounded-full bg-muted/70" />
        <div className="h-4 w-[32rem] max-w-full rounded-full bg-muted/60" />
        <span className="sr-only">{title}</span>
      </div>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: rows }).map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <div className="h-3 w-24 rounded-full bg-muted/70" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 rounded-full bg-muted/70" />
            </CardContent>
          </Card>
        ))}
      </section>
      <Card>
        <CardHeader>
          <div className="h-5 w-48 rounded-full bg-muted/70" />
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="h-4 w-full rounded-full bg-muted/60" />
          <div className="h-4 w-3/4 rounded-full bg-muted/60" />
          <div className="h-4 w-1/2 rounded-full bg-muted/60" />
        </CardContent>
      </Card>
    </div>
  );
}
