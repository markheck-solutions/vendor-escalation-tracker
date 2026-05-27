# Vendor Escalation Tracker

Vendor follow-ups slip. When they slip, revenue can be exposed, escalations get messy, and people waste time digging through email, spreadsheets, and old notes just to figure out the next move.

This app turns that workflow into a modern risk dashboard. It is a demo-safe portfolio project built to be inspected by a hiring manager and an IT reviewer.

## Live demo

https://vendor-escalation-tracker.vercel.app

## What you can do (public demo)

- View a seeded risk dashboard of fake circuit delivery records
- Filter and sort a priority queue by risk signals like stale follow-ups and revenue exposure
- Open a read-only detail panel with a plain-English risk explanation and follow-up history
- Generate deterministic mock follow-up drafts (copy-only, no send action)

The public demo is intentionally **view-and-draft only**. Visitors cannot edit records, save changes, configure providers, or trigger paid AI usage.

## Local setup

### 1) Install

```bash
npm install
```

### 2) Environment variables

Do not commit secrets. Do not paste secrets into chat logs.

```powershell
Set-Location 'C:\SoftwareFactory\01-projects\vendor-escalation-tracker'
Copy-Item '.env.example' '.env.local' -ErrorAction SilentlyContinue
notepad '.env.local'
```

Required for local runtime:

- `DATABASE_URL` (server-only)
- `NEXT_PUBLIC_SUPABASE_URL` (public)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public)

Optional local-only private drafting (server-only, never needed for the public demo):

- `OPENAI_COMPATIBLE_BASE_URL`
- `OPENAI_COMPATIBLE_API_KEY`
- `OPENAI_COMPATIBLE_MODEL`

Provider selection:

- `AI_PROVIDER=mock` (default and required for the public demo)
- `AI_PROVIDER=openai-compatible` (local-only, backend-only)

### 3) Run the dev server

```bash
npm run dev -- --hostname 127.0.0.1 --port 3100
```

Open: http://127.0.0.1:3100

## Validate

```bash
npm run lint
npm run typecheck
npm run test -- --run
npm run build
```

Optional browser tests:

```bash
npm run test:browser
```

## Handoff notes

See `docs/handoff.md` for:

- Safe PowerShell setup commands (placeholders only)
- Deployment notes and how production is kept in Demo Mode + mock AI
- A quick checklist for verifying local vs deployed parity
