import { expect, test } from "@playwright/test";

test.describe("Snapbooth smoke", () => {
  test("opens the intro screen", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /take a photo strip in thirty seconds/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /begin roll/i })).toBeVisible();
  });

  test("opens the studio and preset rail", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto("/");
    await page.getByRole("button", { name: /begin roll/i }).click();

    await expect(page.locator(".studio-page")).toBeVisible();
    await expect(page.getByText(/live preview/i)).toBeVisible();
    await expect(page.getByText("Caption presets")).toBeVisible();
    await expect(page.getByRole("button", { name: /shuffle/i })).toBeVisible();
    await expect(page.getByText(/count-in 3s/i)).toBeVisible();

    await page.getByRole("button", { name: /capture photo/i }).click();
    await expect(page.locator(".countdown")).toHaveText("3");
    await expect(page.getByText(/camera is not ready yet/i)).toBeVisible();
  });
});
