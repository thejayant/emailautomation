"use client";

import { useAppTabData } from "@/components/app-data/app-data-provider";
import { TabLoading } from "@/components/app-data/tab-loading";
import { TabError } from "@/components/app-tabs/tab-error";
import { ContactsManager } from "@/components/contacts/contacts-manager";
import { ManualContactForm } from "@/components/forms/manual-contact-form";
import { PageHeader } from "@/components/layout/page-header";
import { productContent } from "@/content/product";

export function ContactsTab() {
  const entry = useAppTabData("contacts");
  const data = entry.data;

  if (!data && entry.status === "error") {
    return <TabError message={entry.error ?? "Contacts data failed to load."} />;
  }

  if (!data) {
    return <TabLoading title="Loading contacts" />;
  }

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow={productContent.contacts.header.eyebrow}
        title={productContent.contacts.header.title}
        description={productContent.contacts.header.description}
      />
      <ManualContactForm refreshOnSuccess />
      <ContactsManager initialContacts={data.contacts} initialTags={data.tags} />
    </div>
  );
}
