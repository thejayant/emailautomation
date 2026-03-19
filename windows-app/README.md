# OutboundFlow Desktop

This folder contains the Windows desktop shell for OutboundFlow.

## Scripts

- `npm run desktop:dev` starts Electron and a local Next dev server.
- `npm run desktop:build:web` creates the standalone Next bundle used by the desktop app.
- `npm run desktop:build` packages an unpacked Windows desktop app for verification.
- `npm run desktop:pack` builds the NSIS installer in `windows-app/out`.

## Environment

- Development loads values from `windows-app/.env.desktop.local`, `windows-app/.env.desktop`, `.env.local`, `.env`, then `env.example`.
- Packaged builds embed a merged runtime env file at `windows-app/.app/config/runtime.env`.
- `NEXT_PUBLIC_APP_URL` and `GOOGLE_OAUTH_REDIRECT_URI` are overridden at launch so the desktop app always uses its local loopback server.
