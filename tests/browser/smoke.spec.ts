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

test("health endpoint returns ok", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBe(true);
  await expect(res.json()).resolves.toEqual({ ok: true });
});
