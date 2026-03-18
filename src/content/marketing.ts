export type MarketingNavItem = {
  label: string;
  href: string;
};

export type MarketingProofCard = {
  eyebrow: string;
  text: string;
};

export type MarketingPillar = {
  icon: "workflow" | "inbox" | "shield";
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
};

export type MarketingWorkflowStep = {
  step: string;
  title: string;
  description: string;
};

type MarketingContent = {
  meta: {
    title: string;
    description: string;
  };
  brand: {
    name: string;
    descriptor: string;
  };
  nav: MarketingNavItem[];
  headerCtas: {
    signIn: string;
    signUp: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    description: string;
    caption: string;
    primaryCta: string;
    secondaryCta: string;
    notes: string[];
  };
  proof: {
    eyebrow: string;
    title: string;
    description: string;
    cards: MarketingProofCard[];
  };
  product: {
    eyebrow: string;
    title: string;
    description: string;
    pillars: MarketingPillar[];
  };
  workflow: {
    eyebrow: string;
    title: string;
    description: string;
    audienceEyebrow: string;
    audiences: string[];
    steps: MarketingWorkflowStep[];
  };
  cta: {
    eyebrow: string;
    title: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
  };
  footer: {
    brand: string;
    tagline: string;
  };
};

export const marketingContent: MarketingContent = {
  meta: {
    title: "OutboundFlow | Gmail-First Outbound in One Calm Workspace",
    description:
      "Import leads, launch Gmail-first sequences, and track replies from one shared outbound workspace.",
  },
  brand: {
    name: "OutboundFlow",
    descriptor: "gmail-first outbound workspace",
  },
  nav: [
    { label: "Product", href: "#product" },
    { label: "Why teams stay", href: "#proof" },
    { label: "Workflow", href: "#workflow" },
    { label: "For teams", href: "#audience" },
  ],
  headerCtas: {
    signIn: "Sign in",
    signUp: "Start workspace",
  },
  hero: {
    eyebrow: "Gmail-first outbound workspace",
    title: "Launch outbound from one calm workspace.",
    description:
      "Import leads, shape the sequence, and track replies without bouncing between spreadsheets, inboxes, and notes.",
    caption:
      "Built for founders, lean GTM teams, and agencies that want clean execution without a bloated sales stack.",
    primaryCta: "Start workspace",
    secondaryCta: "Sign in",
    notes: [
      "Gmail-native sending",
      "Two-step campaigns",
      "Shared reply visibility",
    ],
  },
  proof: {
    eyebrow: "Why teams stay",
    title: "Less context switching. Better follow-through.",
    description:
      "OutboundFlow keeps contacts, templates, sends, and replies in one operating surface so the team can stay on the work.",
    cards: [
      {
        eyebrow: "One workspace",
        text: "Lists, templates, sends, and replies stay together instead of getting split across tabs and inboxes.",
      },
      {
        eyebrow: "Faster reply handling",
        text: "The moment a prospect answers, the team can pick it up from the shared inbox with the campaign context still attached.",
      },
      {
        eyebrow: "Cleaner launch flow",
        text: "Import, draft, review, and launch in one product so campaigns do not stall halfway through setup.",
      },
    ],
  },
  product: {
    eyebrow: "Product pillars",
    title: "Everything the outbound motion needs, without the clutter.",
    description:
      "The product stays focused on the real workflow: build the audience, launch the sequence, and keep replies visible for the team.",
    pillars: [
      {
        icon: "workflow",
        eyebrow: "Campaign control",
        title: "Build a sequence that is easy to review and easy to launch.",
        description:
          "Choose the sender, shape a two-step campaign, and keep the audience visible while you work.",
        bullets: [
          "Manual contact entry plus CSV, XLSX, and public Sheet imports",
          "Text or HTML templates with merge fields",
          "Launch controls built for operators, not slide decks",
        ],
      },
      {
        icon: "inbox",
        eyebrow: "Reply visibility",
        title: "Keep reply context tied to the campaign.",
        description:
          "Threads, sends, and replies stay connected so the team can review what happened and answer in the same workspace.",
        bullets: [
          "Shared inbox view for outbound replies",
          "Reply-aware campaign state tracking",
          "Sync between mailbox activity and the dashboard",
        ],
      },
      {
        icon: "shield",
        eyebrow: "Workspace clarity",
        title: "Give the team one clean source of truth.",
        description:
          "Profiles, contacts, mailboxes, and campaign state stay scoped to the workspace so execution stays organized.",
        bullets: [
          "Workspace membership and data boundaries",
          "Mailbox connection state where the operator expects it",
          "Shared visibility without enterprise bloat",
        ],
      },
    ],
  },
  workflow: {
    eyebrow: "Workflow",
    title: "A clear path from cold list to live conversation.",
    description:
      "OutboundFlow stays opinionated where it helps and lightweight where the operator needs speed.",
    audienceEyebrow: "Built for",
    audiences: [
      "Founders running outbound before building a larger GTM team",
      "Lean SDR teams that need shared visibility without extra tooling sprawl",
      "Agencies and operators managing campaigns across multiple clients or offers",
    ],
    steps: [
      {
        step: "01",
        title: "Import the right audience",
        description:
          "Pull in contacts from files or a public Google Sheet and keep the list visible before you launch.",
      },
      {
        step: "02",
        title: "Launch from a real Gmail mailbox",
        description:
          "Pick the sender, apply the template, and move from draft to live campaign without leaving the builder.",
      },
      {
        step: "03",
        title: "Work replies in one shared view",
        description:
          "When a lead answers, the reply lands back in the product so the team can review and respond with context.",
      },
    ],
  },
  cta: {
    eyebrow: "Ready to move faster",
    title: "Replace scattered outbound work with one focused workspace.",
    description:
      "Connect Gmail, load contacts, save the sequence, and keep replies visible from day one.",
    primaryCta: "Create workspace",
    secondaryCta: "Sign in",
  },
  footer: {
    brand: "OutboundFlow",
    tagline: "Gmail-native outbound for lean teams.",
  },
};
