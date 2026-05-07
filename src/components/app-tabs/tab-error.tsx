"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TabError({ message }: { message: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Could not load this tab</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        {message}
      </CardContent>
    </Card>
  );
}
