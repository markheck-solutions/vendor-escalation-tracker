import { expect, test } from "@playwright/test";

test("home page renders", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Vendor Escalation Tracker" }),
  ).toBeVisible();

  await expect(page.getByText("Demo Mode")).toBeVisible();
});

test("delivery detail opens, switches records, and closes with keyboard", async ({ page }) => {
  await page.goto("/");

  const detailButtons = page.getByRole("button", { name: /View details for/i });
  await expect(detailButtons.first()).toBeVisible();

  const firstLabel = await detailButtons.first().getAttribute("aria-label");
  const secondLabel = await detailButtons.nth(1).getAttribute("aria-label");

  function parseLabel(label: string | null) {
    const match = label?.match(/^View details for (.+) in (.+) \((.+)\)$/);
    if (!match) return null;
    return { serviceAlias: match[1]!, market: match[2]!, vendorAlias: match[3]! };
  }

  const first = parseLabel(firstLabel);
  const second = parseLabel(secondLabel);

  await detailButtons.first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  if (first) {
    await expect(dialog).toContainText(first.serviceAlias);
    await expect(dialog).toContainText(first.market);
    await expect(dialog).toContainText(first.vendorAlias);
  }

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);

  await detailButtons.nth(1).click();
  await expect(dialog).toBeVisible();
  if (second) {
    await expect(dialog).toContainText(second.serviceAlias);
    await expect(dialog).toContainText(second.market);
    await expect(dialog).toContainText(second.vendorAlias);
  }

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(detailButtons.nth(1)).toBeFocused();
});

test("delivery detail closes when clicking the backdrop", async ({ page }) => {
  await page.goto("/");

  const detailButtons = page.getByRole("button", { name: /View details for/i });
  await expect(detailButtons.first()).toBeVisible();

  await detailButtons.first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  // Click well outside the drawer, on the overlay backdrop.
  await page.mouse.click(10, 10);
  await expect(dialog).toHaveCount(0);
  await expect(detailButtons.first()).toBeFocused();
});

test("dashboard state persists and detail supports back/forward navigation", async ({ page }) => {
  await page.goto("/");

  const detailButtons = page.getByRole("button", { name: /View details for/i });
  await expect(detailButtons.first()).toBeVisible();

  await page.locator("#dashboard-sort").selectOption("revenue");
  await page.locator("#dashboard-filter-risk").selectOption("high");

  await expect(page).toHaveURL(/sort=revenue/);
  await expect(page).toHaveURL(/risk=high/);

  await detailButtons.first().click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  await expect(page).toHaveURL(/detail=deliv_\d{4}/);

  await page.goBack();
  await expect(dialog).toHaveCount(0);
  await expect(detailButtons.first()).toBeFocused();

  await expect(page.getByText("Risk: high")).toBeVisible();
  await expect(page).toHaveURL(/sort=revenue/);
  await expect(page).toHaveURL(/risk=high/);

  await page.goForward();
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(/detail=deliv_\d{4}/);
});

test("dashboard filter status shows a single reset action only when needed", async ({ page }) => {
  await page.goto("/");

  // Wait for deliveries to load so the controls are enabled.
  await expect(page.locator("#dashboard-sort")).toBeEnabled();

  // Default state: passive status only, no clear/reset actions.
  await expect(page.getByText("No filters applied.")).toBeVisible();
  await expect(page.getByRole("button", { name: /clear filters/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Reset$/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Reset view", exact: true })).toHaveCount(0);

  // Sort-only: status should reflect non-default sorting, with a single reset action.
  await page.locator("#dashboard-sort").selectOption("revenue");
  await expect(page.getByText(/Sort:/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Reset view", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reset view", exact: true })).toHaveAttribute(
    "aria-describedby",
    "dashboard-reset-scope",
  );

  // Filter-only: active filter labels show, with a single reset action (no duplicates).
  await page.getByRole("button", { name: "Reset view", exact: true }).click();
  await expect(page.locator("#dashboard-sort")).toHaveValue("priority");

  await page.locator("#dashboard-filter-risk").selectOption("high");
  await expect(page.getByText("Risk: high")).toBeVisible();
  await expect(page.getByRole("button", { name: /clear filters/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Reset$/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Reset view", exact: true })).toBeVisible();

  // Empty results state follows the same single-action rule.
  // There are no "high risk" deliveries in "on-track" status in the deterministic seed set.
  await page.locator("#dashboard-filter-status").selectOption("on-track");
  await expect(page.getByText("No deliveries match your filters.")).toBeVisible();
  await expect(page.getByRole("button", { name: /clear filters/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Reset$/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Reset view", exact: true })).toBeVisible();

  // Reset returns the queue to its default view, and the reset action disappears again.
  await page.getByRole("button", { name: "Reset view", exact: true }).click();
  await expect(page.locator("#dashboard-sort")).toHaveValue("priority");
  await expect(page.locator("#dashboard-filter-risk")).toHaveValue("all");
  await expect(page.locator("#dashboard-filter-status")).toHaveValue("all");
  await expect(page.getByText("No filters applied.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Reset view", exact: true })).toHaveCount(0);
});

test("switching records clears stale draft state", async ({ page }) => {
  await page.goto("/");

  const detailButtons = page.getByRole("button", { name: /View details for/i });
  await expect(detailButtons.first()).toBeVisible();

  await detailButtons.first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  await page.getByRole("button", { name: "Generate", exact: true }).click();

  const draftText = page.getByLabel("Generated draft text");
  await expect(draftText).toBeVisible();

  // Close and open another record.
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);

  await detailButtons.nth(1).click();
  await expect(dialog).toBeVisible();

  // The previous draft should not carry over to the new delivery context.
  await expect(draftText).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Copy" })).toBeDisabled();
});

test("health endpoint returns ok", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBe(true);
  await expect(res.json()).resolves.toEqual({ ok: true });
});
