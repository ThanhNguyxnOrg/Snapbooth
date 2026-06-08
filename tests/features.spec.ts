import { expect, test } from "@playwright/test";

test.describe("Snapbooth keyboard shortcuts & theme", () => {
  test("toggles dark theme using key shortcut D", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /begin roll/i }).waitFor();
    
    // Press D to toggle theme
    await page.keyboard.press("d");
    
    // Theme state is set on doc element
    const themeAttr = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(themeAttr).toBe("dark");
  });

  test("switches layouts using keys 1-5 in studio", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /begin roll/i }).click();

    // Press 3 to change to B / 3 Layout
    await page.keyboard.press("3");
    await expect(page.locator(".stage-meta")).toContainText("B / 3");

    // Press 1 to change to S / 1 Layout
    await page.keyboard.press("1");
    await expect(page.locator(".stage-meta")).toContainText("S / 1");
  });

  test("runs countdown using Space key in studio", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /begin roll/i }).click();

    // Press space key to capture
    await page.keyboard.press("Space");

    // Check countdown displays
    await expect(page.locator(".countdown")).toBeVisible();
    await expect(page.locator(".countdown")).toHaveText(/\d/);
  });
});

test.describe("Snapbooth responsive mobile layout", () => {
  test("adjusts UI and shows mobile toggle button on mobile screens", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // On mobile, the hamburger menu toggle should be visible
    const toggleBtn = page.locator(".mobile-menu-toggle");
    await expect(toggleBtn).toBeVisible();

    // The standard nav links should be hidden/collapsed
    const navLinks = page.locator(".topbar nav");
    await expect(navLinks).not.toBeVisible();

    // Click toggle button to open menu
    await toggleBtn.click();
    
    // Links should be visible inside mobile drawer now
    await expect(page.locator(".topbar nav.mobile-open")).toBeVisible();
  });
});
