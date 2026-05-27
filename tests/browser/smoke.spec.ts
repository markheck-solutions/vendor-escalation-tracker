import { expect, test } from "@playwright/test";

test("home page renders", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Vendor Escalation Tracker" }),
  ).toBeVisible();

  await expect(page.getByText("Demo Mode")).toBeVisible();
});

test("health endpoint returns ok", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBe(true);
  await expect(res.json()).resolves.toEqual({ ok: true });
});
