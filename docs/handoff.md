# Handoff

This repo is a demo-safe portfolio app. It is meant to look and feel like a real internal tool while staying safe for a public link.

## What the public demo is (and is not)

- No login
- Read-only seeded data
- Draft generation is mock-only in production
- Copy-only drafts (there is no send-email feature)
- No visitor edits, deletes, saves, or provider configuration

Live demo:

https://vendor-escalation-tracker.vercel.app

## Environment variables (contract)

`.env.example` is the single source of truth for names. Only `NEXT_PUBLIC_*` values are allowed to reach browser code.

Required:

- `NEXT_PUBLIC_DEMO_MODE` (public)
- `AI_PROVIDER` (server-only)
- `DATABASE_URL` (server-only)
- `NEXT_PUBLIC_SUPABASE_URL` (public)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public)

Optional local-only private provider settings (server-only):

- `OPENAI_COMPATIBLE_BASE_URL`
- `OPENAI_COMPATIBLE_API_KEY`
- `OPENAI_COMPATIBLE_MODEL`

Production safety defaults:

- `NEXT_PUBLIC_DEMO_MODE=true`
- `AI_PROVIDER=mock`
- No `OPENAI_COMPATIBLE_*` values set in production

## Local setup (PowerShell, placeholders only)

Do not paste secrets into chat logs.

```powershell
Set-Location 'C:\SoftwareFactory\01-projects\vendor-escalation-tracker'
Copy-Item '.env.example' '.env.local' -ErrorAction SilentlyContinue
notepad '.env.local'
```

Run locally on the mission port:

```powershell
Set-Location 'C:\SoftwareFactory\01-projects\vendor-escalation-tracker'
npm install
npm run dev -- --hostname 127.0.0.1 --port 3100
```

Open: http://127.0.0.1:3100

## Seed demo data

Seeding reads `.env.local` at runtime. It should be repeatable and safe to run multiple times.

```powershell
Set-Location 'C:\SoftwareFactory\01-projects\vendor-escalation-tracker'
npm run db:seed
```

## Validation commands

```powershell
Set-Location 'C:\SoftwareFactory\01-projects\vendor-escalation-tracker'
npm run lint
npm run typecheck
npm run test -- --run
npm run build
```

Optional:

```powershell
npm run test:browser
```

## Deployment (Vercel CLI)

This public demo was deployed via the Vercel CLI. Vercel Git integration is optional and was not required for the CLI-deployed demo.

### Set production environment variables (prompts for values)

These commands prompt for the value. Paste secrets into the terminal prompt, not into chat.

```powershell
Set-Location 'C:\SoftwareFactory\01-projects\vendor-escalation-tracker'

# Public demo mode flags
npx vercel env add NEXT_PUBLIC_DEMO_MODE production
npx vercel env add AI_PROVIDER production

# Supabase and database
npx vercel env add DATABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
```

If any private provider variables were accidentally added to production, remove them:

```powershell
npx vercel env rm OPENAI_COMPATIBLE_BASE_URL production
npx vercel env rm OPENAI_COMPATIBLE_API_KEY production
npx vercel env rm OPENAI_COMPATIBLE_MODEL production
```

### Deploy

```powershell
Set-Location 'C:\SoftwareFactory\01-projects\vendor-escalation-tracker'
npx vercel --prod
```

## Quick parity checks (local vs deployed)

API sanity:

```powershell
curl.exe -sf http://127.0.0.1:3100/api/deliveries | Out-String
curl.exe -sf https://vendor-escalation-tracker.vercel.app/api/deliveries | Out-String
```

Read-only posture (both should reject writes):

```powershell
curl.exe -s -o NUL -w '%{http_code}' -X POST http://127.0.0.1:3100/api/deliveries -H 'Content-Type: application/json' -d '{}'
curl.exe -s -o NUL -w '%{http_code}' -X POST https://vendor-escalation-tracker.vercel.app/api/deliveries -H 'Content-Type: application/json' -d '{}'
```

Mock draft (both should return a demo-safe response with no provider configuration):

```powershell
curl.exe -sf -X POST http://127.0.0.1:3100/api/drafts -H 'Content-Type: application/json' -d '{"deliveryId":"deliv_0001","options":{"type":"escalation","tone":"direct"}}' | Out-String
curl.exe -sf -X POST https://vendor-escalation-tracker.vercel.app/api/drafts -H 'Content-Type: application/json' -d '{"deliveryId":"deliv_0001","options":{"type":"escalation","tone":"direct"}}' | Out-String
```
