---
name: qa-web
description: >
  QA tests for the Vendor Escalation Tracker web app. Tests the read-only
  dashboard, delivery detail drawer, mock draft generation, copy behavior, and
  API safety posture through browser-driven functional QA.
---

# QA Web App

Use this sub-skill only when the diff affects the web app paths configured in `.factory/skills/qa/config.yaml`.

## App Summary

Vendor Escalation Tracker is a single Next.js App Router web app. It is a demo-safe portfolio app with no login, no mutations, no send action, and mock-only draft generation for public/CI QA.

Key routes:

- `/` -- dashboard and queue
- `/api/health` -- health check
- `/api/dashboard/metrics` -- dashboard KPIs
- `/api/deliveries` -- delivery queue
- `/api/deliveries/:id` -- delivery detail
- `/api/drafts` -- deterministic mock draft generation

## Testing Target

### CI PR Branches

This repo has no committed Vercel preview deployment workflow. In CI, test the checked-out branch by starting a local dev server:

```powershell
npm run dev -- --hostname 127.0.0.1 --port 3100
```

Use `http://127.0.0.1:3100` as the base URL and poll `http://127.0.0.1:3100/api/health` before running flows.

Never fall back to the live production URL for PR branch QA. Production runs different code and would make PR verification meaningless.

### Manual Smoke Testing

Use the target selected by the QA orchestrator:

- local: `http://127.0.0.1:3100`
- production read-only smoke: `https://vendor-escalation-tracker.vercel.app`

Production testing must remain read-only/mock-only. Do not configure private AI providers for production QA.

## Authentication Method

No authentication exists. Do not ask for credentials, create users, or attempt login.

Persona:

- `public_viewer` -- unauthenticated read-only viewer.

## Required Environment

For normal QA:

- `NEXT_PUBLIC_DEMO_MODE=true`
- `AI_PROVIDER=mock`

No database or AI secrets are required for normal QA. If `DATABASE_URL` is absent, the app uses deterministic seeded repository data.

## Flow Menu

The orchestrator selects only flows relevant to the diff. These are available flows, not a required checklist for every run.

### Flow A: Dashboard Load and Demo Safety

Use when changes affect `app/page.tsx`, dashboard data loading, layout, demo badge, metrics, repository factory, seed data, or styling that may alter the dashboard.

Steps:

1. Open `/`.
2. Wait for the main heading and queue to render.
3. Capture an accessibility snapshot of the heading, Demo Mode badge, KPI cards, and queue controls.
4. Verify the default queue state says no filters are applied.
5. Verify records are fake/demo records; do not include real emails, phone numbers, private URLs, tokens, or keys.

Success criteria:

- `Vendor Escalation Tracker` is visible.
- Demo Mode badge appears when `NEXT_PUBLIC_DEMO_MODE=true`.
- KPI cards and queue load without console-visible error states.
- Default sort is priority/highest-risk behavior.
- No edit, delete, save, send, or provider-configuration control is visible.

Negative or boundary checks:

- Visit `/api/health` and verify it returns OK.
- If data fails to load, verify the report marks the flow BLOCKED or FAIL with evidence; do not silently skip.

### Flow B: Queue Filter, Sort, Empty State, and Reset

Use when changes affect `components/dashboard/Dashboard.tsx`, `lib/dashboard/**`, URL state, queue controls, filter copy, sorting, or risk/status/market/blocker/stale logic.

Steps:

1. Open `/`.
2. Change sort order to due date, revenue, and last vendor touch when relevant to the diff.
3. Apply at least one filter affected by the change.
4. Combine filters that should produce matches.
5. Combine filters that should produce no matches.
6. Verify active chips/counts update.
7. Click `Reset view`.
8. Capture snapshots before filtering, after filtering, empty state if used, and after reset.

Success criteria:

- URL query params reflect non-default state only.
- Showing count changes with active filters.
- Empty state says no deliveries match filters.
- Exactly one reset action appears when state is non-default.
- Reset restores default sort and all filters.

Negative or boundary checks:

- Load invalid query params and verify the dashboard defaults safely.
- Verify default state does not show redundant `Clear filters` and `Reset` actions.

### Flow C: Delivery Detail Drawer and Browser History

Use when changes affect `components/detail/**`, detail API, drawer open/close behavior, focus, timeline, risk explanation, URL detail state, or queue card actions.

Steps:

1. Open `/`.
2. Click `View details` for a delivery.
3. Capture a snapshot of the open dialog.
4. Verify detail fields: customer, vendor, service, owner, revenue, due date, blocker/next action, risk explanation, and follow-up history or empty-history message.
5. Close with the close button.
6. Reopen and close with Escape.
7. Reopen and verify browser back closes the drawer while preserving filters.
8. If relevant, open `/?detail=deliv_0001` directly and verify the drawer appears.

Success criteria:

- URL gains `detail=deliv_####` when opened from the queue.
- Dialog content matches the selected delivery.
- Close actions work.
- Browser back/forward behavior matches URL state.
- Focus returns sensibly after closing a click-opened drawer.

Negative or boundary checks:

- `?detail=bad-id` should not crash the app.
- Unknown but well-formed IDs should show a controlled detail error state or safe fallback.

### Flow D: Mock Draft Generation, Option Freshness, and Copy

Use when changes affect `components/draft/DraftPanel.tsx`, `app/api/drafts/route.ts`, `lib/ai/**`, draft type/tone copy, clipboard behavior, stale requests, or detail drawer integration.

Steps:

1. Open a delivery detail drawer.
2. Select a draft type and tone relevant to the change.
3. Click `Generate`.
4. Capture the generated draft text.
5. Verify `Copy` becomes enabled only after a fresh matching draft exists.
6. Change draft type or tone.
7. Verify the existing draft is marked stale or copy is disabled until regeneration.
8. Regenerate and verify the new text visibly reflects the selected type and tone.
9. Use Copy if clipboard access is available; otherwise report clipboard limitation clearly.
10. Switch to another delivery and verify previous draft state does not remain copyable.

Success criteria:

- `POST /api/drafts` succeeds for valid options.
- Mock draft output is deterministic and demo-safe.
- Draft type and tone visibly change generated content.
- Stale generated content cannot be copied as if it matched current controls.
- There is no send/save action.

Negative or boundary checks:

- Rapid option changes during generation should not leave stale responses copyable.
- Clipboard failure should produce `Copy failed.` or be reported as BLOCKED if browser permissions prevent verification.

### Flow E: API Read-Only and Validation Safety

Use when changes affect API routes, response helpers, repositories, validation schemas, or safety posture.

This flow may use direct HTTP requests in addition to browser checks.

Steps:

1. Request `GET /api/health`.
2. Request `GET /api/deliveries`.
3. Request `GET /api/dashboard/metrics`.
4. Request `GET /api/deliveries/deliv_0001`.
5. Attempt unsupported methods on read-only endpoints.
6. Send invalid draft payloads to `/api/drafts`.
7. Send a valid mock draft request.

Success criteria:

- Supported GET endpoints return successful JSON.
- Unsupported write methods return controlled 405 JSON with appropriate Allow behavior.
- Malformed delivery IDs return controlled 400.
- Unknown delivery IDs return controlled 404.
- Invalid draft type/tone/payloads are rejected.
- Valid draft request returns mock-safe text and does not persist or send anything.

Negative or boundary checks:

- Extra provider override fields must not allow client-side provider configuration.
- Write attempts must not mutate visible delivery data.

## Per-Persona Variations

Only `public_viewer` exists. For every selected flow, verify both:

- What the viewer can do: read dashboard/detail data and generate/copy mock drafts.
- What the viewer cannot do: log in, edit, save, delete, send, or configure private providers.

## Evidence Requirements

For each selected flow:

- Capture at least one accessibility snapshot after the relevant state change.
- Save screenshots under `qa-results/$RUN_ID/` when visual layout matters.
- Reference screenshot filenames in the report instead of embedding image links.
- Include direct API request/response summaries for API safety checks.

If ImageMagick is available, GIF diffs may be generated for visual before/after comparisons, but they are optional evidence.

## Known UI Quirks

- No `<form>` elements are used for the main flows; interactions are buttons and select controls.
- Sort/filter changes use URL replacement; detail opening uses browser history.
- Closing a click-opened drawer may use browser back semantics.
- Focus restoration can happen asynchronously after closing the drawer.
- Loading/error UI can appear briefly while API requests resolve.
- `Reset view` appears only when sort/filter state is non-default.
- Draft options are applied on the next `Generate`, not immediately to an existing draft.
- Clipboard verification can be browser-permission dependent.

## Known Failure Modes

1. **Local dev server not ready.** Poll `/api/health` before opening `/`; report BLOCKED if it never becomes ready.
2. **Port 3100 already in use.** If the health check points to the wrong app or fails after startup, report BLOCKED and include the process/port finding if available.
3. **Clipboard denied by browser context.** Verify copy state transitions and report clipboard result as BLOCKED only if browser permissions prevent direct verification.
4. **Production cannot verify PR code.** Never use the live demo as fallback for PR branch changes; report BLOCKED if no local or preview target is available.
5. **Postgres-backed data can differ from seed data.** Do not rely on exact row counts unless the target environment is known to use deterministic seed/fallback data.
