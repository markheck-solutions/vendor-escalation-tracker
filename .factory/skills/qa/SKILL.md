---
name: qa
description: >
  Run QA tests for Vendor Escalation Tracker. Analyzes git diff to determine
  affected areas, runs configured functional test flows, and generates concise
  QA reports for PRs or smoke testing environments.
---

# QA Orchestrator

**SCOPE: This skill performs manual/functional QA only -- verifying that the application actually works by interacting with it as a real user would through a browser or API calls. Do NOT run or report on CI checks, linting, ESLint, typecheck, unit tests, or static analysis. Those are handled by separate workflows.**

## Step 1: Load Configuration

Read `.factory/skills/qa/config.yaml` for:

- environment URLs and restrictions
- personas
- app path patterns
- failure learning mode
- workflow/runtime expectations

Use `.factory/skills/qa/REPORT-TEMPLATE.md` for the final report.

If the config and diff provide enough information, choose the safest configured defaults instead of asking the user technical setup questions.

## Step 2: Determine Target Environment

Use `default_target` from config unless the user or CI prompt specifies a different target.

For this project:

- Default target is `local`.
- Local QA should use `http://127.0.0.1:3100`.
- Production QA should use `https://vendor-escalation-tracker.vercel.app` for read-only smoke checks only.
- Preview URLs, if added later, must be treated like local/dev environments with mock/read-only flows.

**CRITICAL: Vercel/Netlify preview deployments are DEV environments.** Preview URLs serve branch frontend code and usually connect to development-style backend resources. Use dev flows when testing preview URLs. Do NOT use prod-only data or private paid-provider flows against previews.

## Step 3: Analyze Git Diff

Run `git diff` and map changed files to apps using `apps.*.path_patterns` from config.

Files that do not match any app path pattern, such as `.factory/skills/**`, `docs/**`, `.github/**`, or repo metadata, are not app changes. Do NOT run app flows for those changes.

For each affected app:

1. Load only that app's sub-skill from `.factory/skills/qa-<app-name>/SKILL.md`.
2. Select flows relevant to the changed files and nearby integration points.
3. Generate additional ad-hoc tests when no existing flow covers the change.

For apps not affected by the diff:

- Do not load or run their module.
- Do not run their pre-flight checks.
- Do not test unrelated functionality.

If no app is affected by the diff, report:

`:grey_question: INCONCLUSIVE -- No app code changed; QA is not applicable for this diff.`

## Step 4: Pre-flight Checks (Affected Apps Only)

Run pre-flight checks only for apps affected by the diff.

For the `web` app:

1. Determine target URL:
   - CI PR branch: start local dev server from checked-out code unless a preview URL is explicitly provided.
   - Manual local run: use the configured target environment.
2. If starting local dev server, run:
   `npm run dev -- --hostname 127.0.0.1 --port 3100`
3. Poll `http://127.0.0.1:3100/api/health` until it returns OK or times out.
4. If pre-flight fails, report affected web tests as BLOCKED with what was tried and how to fix it.

Do not fall back to production when testing a PR branch; production runs different code.

## Step 5: Execute Diff-Relevant Flows Only

For each affected app:

1. Read its sub-skill.
2. Select the flows directly relevant to the diff.
3. Include adjacent flows that verify integration with changed behavior.
4. Include at least one negative or boundary test related to the change.
5. Interact with the app like a real user.

Do NOT run unit tests, Playwright, Vitest, lint, typecheck, or build as QA evidence.

## Step 6: Evidence Capture

Text evidence is primary because it renders reliably in PR comments.

For web app testing:

- Use `agent-browser` snapshots to capture accessibility-tree evidence.
- Save screenshots under `./qa-results/$RUN_ID/` for artifact upload.
- Do NOT embed image markdown links in the report.
- Reference screenshot filenames only; the workflow uploads artifacts.

Evidence quality rules:

- Capture evidence after meaningful state changes.
- Trim snapshots to relevant content.
- Label each snapshot with what it proves.
- Never include secrets, tokens, or private env values.

## Step 7: Test Quality Gate

QA runs must satisfy these rules:

1. Change-specific tests first.
2. At least half the tests should verify the changed behavior directly when app code changed.
3. Integration tests are valid when they verify the change works with nearby UI/API behavior.
4. No unrelated flows.
5. No automated test suites or static checks.
6. At least one negative or boundary test for the changed behavior.
7. Mark INCONCLUSIVE if you cannot clearly identify the behavioral change.

## Step 8: Handle Failures

Never silently skip a flow. If a flow cannot complete, report it as BLOCKED with what was tried and how the user can fix it. Continue to other affected flows when possible.

Result meanings:

- `:white_check_mark: PASS` -- observed behavior matches expected behavior.
- `:x: FAIL` -- app behavior is wrong.
- `:no_entry: BLOCKED` -- environment or setup prevented verification.
- `:warning: FLAKY` -- behavior was inconsistent.
- `:grey_question: INCONCLUSIVE` -- QA not applicable or insufficient information.

## Step 9: Generate Report

Write the report to `./qa-results/report.md`.

The report MUST:

- Start with `## QA Report`.
- Follow `.factory/skills/qa/REPORT-TEMPLATE.md`.
- Keep the table concise.
- Include actionable failures only in `### Action Required`.
- Put all evidence inside one collapsed `<details>` block.
- Avoid verbose diff summaries and setup logs.
- Avoid broken image links.

## Step 10: Failure Learning

Read `failure_learning` from config.

For this project it is `auto_commit`. If a BLOCKED or FAIL result reveals a new repeatable **testing environment insight** not already documented in the relevant sub-skill's Known Failure Modes, do both:

1. Add a concise "Suggested Skill Updates" table to the QA report.
2. Write `qa-results/skill-updates.json` with structured edits for the workflow to apply and commit.

Only suggest updates for environment/workflow knowledge, such as:

- required env variables
- dev server startup quirks
- browser timing/loading behavior
- feature flag setup
- stable authentication or clipboard constraints

Do NOT suggest updates for:

- bad selectors in the current QA instructions
- expected UI copy changes from the PR
- app bugs that should be fixed in app code

`skill-updates.json` format:

```json
[
  {
    "file": ".factory/skills/qa-web/SKILL.md",
    "section": "Known Failure Modes",
    "action": "append",
    "content": "6. **New failure mode.** Description and future handling guidance."
  }
]
```

If there are no new environment insights, do not create `skill-updates.json`.
