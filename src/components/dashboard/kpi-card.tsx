import { ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber, formatPercent } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  kind = "count",
}: {
  label: string;
  value: number;
  kind?: "count" | "percent";
}) {
  return (
    <Card className="card-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <ArrowUpRight className="size-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tracking-[-0.05em] text-foreground">
          {kind === "percent" ? formatPercent(value) : formatNumber(value)}
        </div>
      </CardContent>
    </Card>
  );
}
