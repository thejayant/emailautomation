import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, BadgeCheck, BriefcaseBusiness, FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact | OutboundFlow",
  description:
    "Public contact page for OutboundFlow verification, product, partnership, and compliance inquiries.",
};

const contactCards = [
  {
    title: "Verification inquiries",
    description:
      "Use this public page as the contact destination for Google Auth Platform review, Microsoft Entra verification, and related branding checks for OutboundFlow.",
    icon: BadgeCheck,
  },
  {
    title: "Product and partnership requests",
    description:
      "OutboundFlow may receive requests relating to product access, integrations, operational use cases, and collaboration opportunities through the public website.",
    icon: BriefcaseBusiness,
  },
  {
    title: "Legal and privacy guidance",
    description:
      "Privacy and legal contact details are maintained on the applicable legal pages so requests can be directed through the correct policy channel.",
    icon: FileText,
  },
];

export default function ContactPage() {
  return (
    <main className="page-gradient min-h-screen px-6 py-10 md:px-10 md:py-14">
      <div className="mx-auto max-w-5xl space-y-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#5f5975] transition hover:text-[#b4236d]"
        >
          <ArrowLeft className="size-4" />
          Back to OutboundFlow
        </Link>

        <section className="marketing-light-cta-panel overflow-hidden px-7 py-8 md:px-10 md:py-10">
          <p className="font-mono text-xs uppercase tracking-[0.32em] text-[#b4236d]">
            Public contact page
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-[#1e1735] md:text-5xl">
            Contact OutboundFlow
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[#544e68]">
            This page is the public contact destination for OutboundFlow at
            {" "}
            https://outbound-flow.vercel.app/. It is intended to support verification,
            product, partnership, and compliance-related inquiries for the public service.
          </p>
          <p className="mt-4 max-w-3xl text-base leading-8 text-[#5c566f]">
            If your request relates to privacy handling, legal terms, or verification contact
            details, please refer to the applicable legal documentation linked below.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm text-[#5f5975]">
            <span className="rounded-full border border-[#ead7e3] bg-white/80 px-4 py-2">
              Domain: outbound-flow.vercel.app
            </span>
            <span className="rounded-full border border-[#ead7e3] bg-white/80 px-4 py-2">
              Privacy details: <Link href="/privacy" className="font-medium text-[#b4236d]">Privacy Policy</Link>
            </span>
            <span className="rounded-full border border-[#ead7e3] bg-white/80 px-4 py-2">
              Legal terms: <Link href="/terms" className="font-medium text-[#b4236d]">Terms &amp; Conditions</Link>
            </span>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {contactCards.map(({ title, description, icon: Icon }) => (
            <article key={title} className="marketing-light-card p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[#fff0f7] p-3 text-[#b4236d]">
                  <Icon className="size-5" />
                </div>
                <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#1e1735]">
                  {title}
                </h2>
              </div>
              <p className="mt-4 text-sm leading-7 text-[#5c566f]">{description}</p>
            </article>
          ))}
        </section>

        <article className="marketing-light-card p-7 md:p-9">
          <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#1e1735]">
            Request routing
          </h2>
          <div className="mt-4 space-y-4 text-base leading-8 text-[#4f4963]">
            <p>
              For verification reviews, product evaluation, partnership outreach, or compliance
              checks, use this public route as the canonical contact page for OutboundFlow.
            </p>
            <p>
              For privacy disclosures, data-handling details, and legal contact information,
              review the public legal pages below.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link
              href="/privacy"
              className="rounded-full border border-[#ead7e3] bg-white px-5 py-3 text-sm font-medium text-[#b4236d] transition hover:border-[#d9b7ca]"
            >
              Open Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="rounded-full border border-[#ead7e3] bg-white px-5 py-3 text-sm font-medium text-[#b4236d] transition hover:border-[#d9b7ca]"
            >
              Open Terms &amp; Conditions
            </Link>
          </div>
        </article>
      </div>
    </main>
  );
}
