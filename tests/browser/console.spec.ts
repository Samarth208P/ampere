import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("inspect examples, filter requests, export and verify a signed report", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.goto("/");
  await page.getByRole("button", { name: "Example", exact: true }).click();
  await expect(page.getByText("Illustrative recording", { exact: true })).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(36);
  await page.getByRole("button", { name: "Arkiv", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(24);
  await page.getByRole("button", { name: "Inspect request fixture-35", exact: true }).click();
  await expect(page.locator(".inspector-method")).toHaveText("arkiv_getEntityCount");
  await page.getByRole("button", { name: "All networks", exact: true }).click();
  await page.getByRole("textbox", { name: "Find a method" }).fill("does-not-exist");
  await expect(page.getByText("No requests in this view")).toBeVisible();
  await page.getByRole("textbox", { name: "Find a method" }).fill("");
  await page.screenshot({ path: "artifacts/recorder-desktop.png", fullPage: true });
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export report", exact: true }).click();
  const download = await downloadPromise;
  const content = await readFile((await download.path())!, "utf8");
  const report = JSON.parse(content);
  expect(report.payload.recording.mode).toBe("fixture");
  await page.getByRole("button", { name: "Reports", exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles({ name: "report.json", mimeType: "application/json", buffer: Buffer.from(content) });
  await expect(page.getByText("Integrity verified", { exact: true })).toBeVisible();
  report.payload.recording.observations[0].durationMs++;
  await page.locator('input[type="file"]').setInputFiles({ name: "modified.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(report)) });
  await expect(page.getByText("Integrity check failed", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("mobile console fits and live mode never silently becomes an example", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Live", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Example", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(36);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "artifacts/recorder-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Nodes", exact: true }).click();
  await expect(page.getByText("Collector host resources")).toBeVisible();
});
