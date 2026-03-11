"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import type { ContactRecord } from "@/lib/types/contact";
import { manualContactSchema } from "@/lib/zod/schemas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ManualContactFormProps = {
  title?: string;
  description?: string;
  submitLabel?: string;
  refreshOnSuccess?: boolean;
  onCreated?: (contact: ContactRecord) => void;
  asForm?: boolean;
};

export function ManualContactForm({
  title = "Add contact manually",
  description = "Create one contact without importing a file or syncing a CRM.",
  submitLabel = "Add contact",
  refreshOnSuccess = false,
  onCreated,
  asForm = true,
}: ManualContactFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<z.input<typeof manualContactSchema>>({
    resolver: zodResolver(manualContactSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      company: "",
      website: "",
      jobTitle: "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error(typeof payload?.error === "string" ? payload.error : "Failed to create contact");
        return;
      }

      const contact = payload?.contact as ContactRecord | undefined;

      form.reset({
        email: "",
        firstName: "",
        lastName: "",
        company: "",
        website: "",
        jobTitle: "",
      });

      if (contact) {
        onCreated?.(contact);
      }

      if (refreshOnSuccess) {
        router.refresh();
      }

      toast.success("Contact added");
    });
  });

  const fields = (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="manualContactEmail">Email</Label>
          <Input
            id="manualContactEmail"
            placeholder="lead@company.com"
            {...form.register("email")}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="manualContactCompany">Company</Label>
          <Input
            id="manualContactCompany"
            placeholder="Northstar"
            {...form.register("company")}
          />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="grid gap-2">
          <Label htmlFor="manualContactFirstName">First name</Label>
          <Input id="manualContactFirstName" {...form.register("firstName")} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="manualContactLastName">Last name</Label>
          <Input id="manualContactLastName" {...form.register("lastName")} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="manualContactJobTitle">Job title</Label>
          <Input id="manualContactJobTitle" {...form.register("jobTitle")} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="manualContactWebsite">Website</Label>
          <Input id="manualContactWebsite" placeholder="company.com" {...form.register("website")} />
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          type={asForm ? "submit" : "button"}
          disabled={isPending}
          onClick={asForm ? undefined : () => void onSubmit()}
        >
          {isPending ? "Adding..." : submitLabel}
        </Button>
      </div>
    </>
  );

  return (
    <Card className="border-border/60 bg-card/90">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {asForm ? (
          <form className="grid gap-4" onSubmit={onSubmit}>
            {fields}
          </form>
        ) : (
          <div className="grid gap-4">
            {fields}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
