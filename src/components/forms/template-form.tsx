"use client";

import { useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import { previewRenderedTemplate } from "@/lib/utils/template";
import { templateSchema } from "@/lib/zod/schemas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function TemplateForm() {
  const [isPending, startTransition] = useTransition();
  const form = useForm<z.infer<typeof templateSchema>>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      subjectTemplate: "Quick idea for {{company}}",
      bodyTemplate:
        "Hi {{first_name}},\n\nNoticed {{company}} and thought a short intro might be useful.\n\nBest,\nJay",
    },
  });
  const subjectTemplate = useWatch({
    control: form.control,
    name: "subjectTemplate",
  });
  const bodyTemplate = useWatch({
    control: form.control,
    name: "bodyTemplate",
  });
  const preview = previewRenderedTemplate({
    subjectTemplate: subjectTemplate ?? "",
    bodyTemplate: bodyTemplate ?? "",
    contact: { first_name: "Alina", company: "Northstar", website: "northstar.dev" },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const response = await fetch("/api/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        toast.error(error?.error ?? "Failed to save template");
        return;
      }

      form.reset();
      toast.success("Template saved");
    });
  });

  return (
    <Card className="border-border/60 bg-card/90">
      <CardHeader>
        <CardTitle>Create template</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="name">Template name</Label>
            <Input id="name" {...form.register("name")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="subjectTemplate">Subject</Label>
            <Input id="subjectTemplate" {...form.register("subjectTemplate")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bodyTemplate">Body</Label>
            <Textarea id="bodyTemplate" {...form.register("bodyTemplate")} />
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save template"}
          </Button>
        </form>
        <div className="rounded-[28px] border border-border/60 bg-background/70 p-5">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Preview
          </p>
          <h3 className="mt-4 text-lg font-semibold">{preview.subject}</h3>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
            {preview.body}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
