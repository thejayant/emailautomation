type DesktopGmailConnectResult = {
  ok: boolean;
  error?: string;
};

type OutboundFlowDesktopBridge = {
  connectGmail: () => Promise<DesktopGmailConnectResult>;
  isDesktop: boolean;
  version: string;
};

declare global {
  interface Window {
    outboundFlowDesktop?: OutboundFlowDesktopBridge;
  }
}

export {};
