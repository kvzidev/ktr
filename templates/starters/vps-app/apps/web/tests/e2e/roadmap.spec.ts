import { expect, test } from "@playwright/test";

test("renders public roadmap heading", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Public Roadmap/i })).toBeVisible();
});
