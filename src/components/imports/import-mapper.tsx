"use client";

import { useMemo, useState } from "react";
import { productContent } from "@/content/product";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function ImportMapper({ headers }: { headers: string[] }) {
  const suggestions = useMemo(
    () =>
      headers.map((header) => ({
        source: header,
        suggested:
          header.toLowerCase().includes("first")
            ? "first_name"
            : header.toLowerCase().includes("company")
              ? "company"
              : header.toLowerCase().includes("site")
                ? "website"
                : header.toLowerCase().includes("email")
                  ? "email"
                  : "custom",
      })),
    [headers],
  );
  const [search, setSearch] = useState("");
  const filtered = suggestions.filter((item) =>
    item.source.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Card>
      <CardHeader className="gap-4">
        <CardTitle>{productContent.imports.mapper.title}</CardTitle>
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={productContent.imports.mapper.filterPlaceholder}
        />
      </CardHeader>
      <CardContent className="grid gap-3">
        {filtered.map((item) => (
          <div
            key={item.source}
            className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/60 px-4 py-3"
          >
            <span className="text-sm">{item.source}</span>
            <Badge variant="neutral">{item.suggested}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
