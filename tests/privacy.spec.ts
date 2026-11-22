import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "block" });

test("Privacy explains which photos persist and how to delete them", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Privacy", exact: true }).click();

  const policy = page.getByRole("article");
  await expect(policy).toContainText(/session storage/i);
  await expect(policy).toContainText(/source photos and the finished PNG/i);
  await expect(policy).toContainText(/12 rolls/i);
  await expect(policy).toContainText(/delete a roll in Gallery/i);
  await expect(policy).toContainText(/tmpfiles\.org/i);
});

test("Share QR only uploads after the user confirms the destination", async ({ page }) => {
  let uploads = 0;
  await page.route("https://tmpfiles.org/api/v1/upload", async (route) => {
    uploads++;
    await route.fulfill({ json: { status: "success", data: { url: "https://tmpfiles.org/123/roll.png" } } });
  });

  await page.goto("/");
  await page.getByRole("button", { name: /begin roll/i }).click();
  await page.getByRole("button", { name: "Demo roll" }).click();
  await page.getByRole("button", { name: /develop strip/i }).click();

  const share = page.getByRole("button", { name: "Share QR" });
  let disclosure = "";
  page.once("dialog", async (dialog) => {
    disclosure = dialog.message();
    await dialog.dismiss();
  });
  await share.click();
  expect(disclosure).toContain("PNG to tmpfiles.org");
  expect(disclosure).toContain("60 minutes");
  await expect(page.getByRole("region", { name: "Share QR" })).not.toBeVisible();
  expect(uploads).toBe(0);

  page.once("dialog", (dialog) => dialog.accept());
  await share.click();
  await expect(page.getByRole("img", { name: "QR code for photo strip" })).toBeVisible();
  expect(uploads).toBe(1);
});
