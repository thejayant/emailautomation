# OutboundFlow Desktop

This folder contains the Windows desktop shell for OutboundFlow.

## Scripts

- `npm run dev` starts the hosted app locally for development.
- `npm run desktop:dev` starts Electron against `OUTBOUNDFLOW_APP_ORIGIN` or `http://127.0.0.1:3000`.
- `npm run desktop:build:config` stages the safe desktop config used by packaged builds.
- `npm run desktop:build` packages an unpacked Windows desktop app for verification.
- `npm run desktop:pack` builds the NSIS installer in `windows-app/out`.

## Environment

- Development reads only `windows-app/.env.desktop.local` and `windows-app/.env.desktop`.
- Packaged builds include only `windows-app/.dist/desktop-config.json`.
- Safe desktop config values are:
  - `OUTBOUNDFLOW_APP_ORIGIN`
  - `OUTBOUNDFLOW_DESKTOP_PROTOCOL`
  - `OUTBOUNDFLOW_APP_NAME`
- Do not put server secrets in desktop env files. Supabase service role, DB URL, Gmail secret, and token encryption key belong only in the hosted web deployment.
