# Vercel + Desktop Release Notes

## Hosted app

Deploy the current Next.js app to Vercel and set the existing server env vars there, including:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI`
- `TOKEN_ENCRYPTION_KEY`
- `CUSTOM_CRM_API_KEYS`
- `DEFAULT_PER_USER_DAILY_CAP`
- `DEFAULT_PER_MINUTE_THROTTLE`
- `FOLLOW_UP_DELAY_DAYS`
- `SUPABASE_CRON_VERIFY_SECRET`

`NEXT_PUBLIC_APP_URL` and `GOOGLE_OAUTH_REDIRECT_URI` should both use the hosted Vercel domain for beta.

## Desktop build

The Windows desktop app packages only safe desktop config:

- `OUTBOUNDFLOW_APP_ORIGIN`
- `OUTBOUNDFLOW_DESKTOP_PROTOCOL`
- `OUTBOUNDFLOW_APP_NAME`

Example packaging command:

```powershell
$env:OUTBOUNDFLOW_APP_ORIGIN='https://your-app.vercel.app'
npm run desktop:pack
```

## Gmail desktop return

Desktop Gmail connect uses the hosted `/api/gmail/connect` route, opens Google in the system browser, and returns to the installed app through `outboundflow://oauth-complete?...`.
