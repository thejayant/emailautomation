export const PRODUCT_TOUR_VERSION = 1;

export type WalkthroughKey = "workspace" | "sending" | "contacts" | "campaigns" | "profile";

export type WalkthroughPlacement = "top" | "bottom" | "left" | "right" | "center";

export type WalkthroughStep = {
  id: string;
  route: string;
  target?: string;
  title: string;
  body: string;
  placement: WalkthroughPlacement;
  desktopOnly?: boolean;
};

type WalkthroughDefinition = {
  key: WalkthroughKey;
  label: string;
  description: string;
  steps: WalkthroughStep[];
};

export const walkthroughDefinitions: Record<WalkthroughKey, WalkthroughDefinition> = {
  workspace: {
    key: "workspace",
    label: "Workspace overview",
    description: "See the main workspace and how to find your way around.",
    steps: [
      {
        id: "workspace-welcome",
        route: "/dashboard",
        target: "page-header-root",
        title: "Welcome",
        body: "This is your outbound workspace.",
        placement: "bottom",
      },
      {
        id: "workspace-sidebar-collapse",
        route: "/dashboard",
        target: "sidebar-collapse",
        title: "Collapse sidebar",
        body: "Use this to open more room or bring navigation back.",
        placement: "right",
        desktopOnly: true,
      },
      {
        id: "workspace-navigation",
        route: "/dashboard",
        target: "sidebar-nav",
        title: "Navigation",
        body: "Dashboard, Analytics, Campaigns, Contacts, and Profile live here.",
        placement: "right",
      },
      {
        id: "workspace-project-switcher",
        route: "/dashboard",
        target: "project-switcher",
        title: "Project switcher",
        body: "Change project without leaving the workspace.",
        placement: "right",
      },
      {
        id: "workspace-main",
        route: "/dashboard",
        target: "dashboard-main",
        title: "Main work area",
        body: "This panel shows status, next actions, and live progress.",
        placement: "bottom",
      },
      {
        id: "workspace-reopen",
        route: "/dashboard",
        target: "page-header-tour-trigger",
        title: "Reopen tour",
        body: "You can replay walkthroughs anytime from here.",
        placement: "bottom",
      },
    ],
  },
  sending: {
    key: "sending",
    label: "Sending setup",
    description: "Connect senders and review mailbox approvals.",
    steps: [
      {
        id: "sending-connect",
        route: "/settings/sending",
        target: "sending-connect",
        title: "Connect mailboxes",
        body: "Add Gmail or Outlook senders for the active project.",
        placement: "bottom",
      },
      {
        id: "sending-identities",
        route: "/settings/sending",
        target: "sending-identities",
        title: "Sender identity",
        body: "Keep each project’s sender name, title, and signature aligned.",
        placement: "left",
      },
      {
        id: "sending-approvals",
        route: "/settings/sending",
        target: "sending-approvals",
        title: "Approvals",
        body: "Review which sender mailboxes are ready to launch.",
        placement: "top",
      },
      {
        id: "sending-registry",
        route: "/settings/sending",
        target: "sending-registry",
        title: "Mailbox registry",
        body: "Check which mailbox belongs to each project.",
        placement: "top",
      },
    ],
  },
  contacts: {
    key: "contacts",
    label: "Contacts",
    description: "Add, import, and organize the audience you send to.",
    steps: [
      {
        id: "contacts-manual-form",
        route: "/contacts",
        target: "contacts-manual-form",
        title: "Add contacts",
        body: "Create a contact manually when you need one fast.",
        placement: "bottom",
      },
      {
        id: "contacts-import",
        route: "/imports",
        target: "imports-panel",
        title: "Import contacts",
        body: "Bring in CSV, Excel, or sheet-based contact lists here.",
        placement: "bottom",
      },
      {
        id: "contacts-controls",
        route: "/contacts",
        target: "contacts-controls",
        title: "Manage lists",
        body: "Filter by tags and run bulk actions from this panel.",
        placement: "bottom",
      },
      {
        id: "contacts-table",
        route: "/contacts",
        target: "contacts-table",
        title: "Contact table",
        body: "Review, edit, or clean up the audience before launch.",
        placement: "top",
      },
    ],
  },
  campaigns: {
    key: "campaigns",
    label: "Campaigns",
    description: "Walk through the core campaign build flow.",
    steps: [
      {
        id: "campaigns-list",
        route: "/campaigns",
        target: "campaigns-new-button",
        title: "Start a campaign",
        body: "Create a new campaign from this top action.",
        placement: "bottom",
      },
      {
        id: "campaigns-sender",
        route: "/campaigns/new?tourFocus=start",
        target: "campaign-builder-sender",
        title: "Choose sender",
        body: "Pick the approved mailbox that should send the sequence.",
        placement: "bottom",
      },
      {
        id: "campaigns-audience",
        route: "/campaigns/new?tourFocus=audience",
        target: "campaign-builder-audience",
        title: "Select audience",
        body: "Choose the contacts you want this campaign to reach.",
        placement: "top",
      },
      {
        id: "campaigns-message",
        route: "/campaigns/new?tourFocus=message",
        target: "campaign-builder-message",
        title: "Write sequence",
        body: "Shape the opener, follow-up, and extra steps here.",
        placement: "top",
      },
      {
        id: "campaigns-launch",
        route: "/campaigns/new?tourFocus=review",
        target: "campaign-builder-launch",
        title: "Launch",
        body: "Review the setup, schedule, and launch when it is ready.",
        placement: "top",
      },
    ],
  },
  profile: {
    key: "profile",
    label: "Profile & settings",
    description: "Update your profile and learn where setup now lives.",
    steps: [
      {
        id: "profile-personal",
        route: "/profile",
        target: "profile-form",
        title: "Personal profile",
        body: "Keep your name and title up to date here.",
        placement: "bottom",
      },
      {
        id: "profile-checklist",
        route: "/settings",
        target: "settings-checklist",
        title: "Setup checklist",
        body: "Track the few setup steps that matter most.",
        placement: "bottom",
      },
      {
        id: "profile-projects",
        route: "/settings/projects",
        target: "projects-manage",
        title: "Project details",
        body: "Manage brand, sender details, and mailbox context by project.",
        placement: "top",
      },
      {
        id: "profile-integrations",
        route: "/settings/integrations",
        target: "integrations-hub",
        title: "Integrations",
        body: "Connect the CRM, alerts, and delivery tools you need.",
        placement: "top",
      },
    ],
  },
};

export const walkthroughOrder: WalkthroughKey[] = [
  "workspace",
  "sending",
  "contacts",
  "campaigns",
  "profile",
];

export function getWalkthroughSteps(key: WalkthroughKey, isDesktopViewport: boolean) {
  return walkthroughDefinitions[key].steps.filter((step) => isDesktopViewport || !step.desktopOnly);
}

