"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ReplyRateChart({
  data,
  title = "Reply rate by campaign",
}: {
  data: Array<{ name: string; replyRate: number }>;
  title?: string;
}) {
  return (
    <Card className="card-shadow">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-[320px] min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(91,100,114,0.2)" />
            <XAxis dataKey="name" stroke="#5b6472" tickLine={false} axisLine={false} />
            <YAxis unit="%" stroke="#5b6472" tickLine={false} axisLine={false} />
            <Tooltip
              cursor={{ fill: "rgba(31,111,95,0.08)" }}
              contentStyle={{
                borderRadius: "18px",
                border: "1px solid var(--border)",
                background: "var(--card)",
              }}
            />
            <Bar dataKey="replyRate" fill="var(--chart-1)" radius={[10, 10, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
