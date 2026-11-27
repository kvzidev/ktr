import { expect, test } from "@playwright/test";

test("renders team issue tracker", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Team Issue Tracker/i })).toBeVisible();
});
