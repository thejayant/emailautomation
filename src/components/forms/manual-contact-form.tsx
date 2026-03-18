"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import { productContent } from "@/content/product";
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
  title = productContent.contacts.manualForm.title,
  description = productContent.contacts.manualForm.description,
  submitLabel = productContent.contacts.manualForm.submitLabel,
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
        toast.error(
          typeof payload?.error === "string"
            ? payload.error
            : productContent.contacts.manualForm.createError,
        );
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

      toast.success(productContent.contacts.manualForm.successMessage);
    });
  });

  const fields = (
    <>
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="manualContactEmail">{productContent.contacts.manualForm.fields.email}</Label>
          <Input
            id="manualContactEmail"
            placeholder={productContent.contacts.manualForm.placeholders.email}
            {...form.register("email")}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="manualContactCompany">{productContent.contacts.manualForm.fields.company}</Label>
          <Input
            id="manualContactCompany"
            placeholder={productContent.contacts.manualForm.placeholders.company}
            {...form.register("company")}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="grid gap-2">
          <Label htmlFor="manualContactFirstName">{productContent.contacts.manualForm.fields.firstName}</Label>
          <Input id="manualContactFirstName" {...form.register("firstName")} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="manualContactLastName">{productContent.contacts.manualForm.fields.lastName}</Label>
          <Input id="manualContactLastName" {...form.register("lastName")} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="manualContactJobTitle">{productContent.contacts.manualForm.fields.jobTitle}</Label>
          <Input id="manualContactJobTitle" {...form.register("jobTitle")} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="manualContactWebsite">{productContent.contacts.manualForm.fields.website}</Label>
          <Input
            id="manualContactWebsite"
            placeholder={productContent.contacts.manualForm.placeholders.website}
            {...form.register("website")}
          />
        </div>
      </div>
      <div className="flex justify-stretch sm:justify-end">
        <Button
          type={asForm ? "submit" : "button"}
          disabled={isPending}
          onClick={asForm ? undefined : () => void onSubmit()}
          className="w-full sm:w-auto"
        >
          {isPending ? productContent.contacts.manualForm.pendingLabel : submitLabel}
        </Button>
      </div>
    </>
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader className="gap-4 border-b border-white/56 bg-white/32">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <CardTitle className="text-[1.9rem] tracking-[-0.05em]">{title}</CardTitle>
            <CardDescription className="max-w-2xl text-sm leading-7">{description}</CardDescription>
          </div>
          <div className="glass-chip inline-flex w-fit items-center rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            {productContent.contacts.manualForm.badge}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5 sm:p-6">
        {asForm ? (
          <form className="grid gap-5" onSubmit={onSubmit}>
            {fields}
          </form>
        ) : (
          <div className="grid gap-5">
            {fields}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
