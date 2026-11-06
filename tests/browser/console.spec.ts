import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("the app opens directly and the optional project explanation returns to it", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Request recorder", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".project-hero")).toHaveCount(0);
  await page.getByRole("link", { name: "How it works" }).click();
  await expect(page).toHaveURL(/\/how-it-works$/);
  await expect(
    page.getByRole("heading", {
      name: "Trace the request. Keep the evidence.",
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Workflow", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "From an exchange to an explanation." }),
  ).toBeInViewport();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("link", { name: "Open app", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Request recorder", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("report endpoints reject foreign origins, malformed JSON and oversized uploads", async ({
  request,
  baseURL,
}) => {
  const headers = { origin: new URL(baseURL!).origin };
  expect(
    (
      await request.post("/api/report?mode=fixture", {
        headers: { origin: "https://example.org" },
      })
    ).status(),
  ).toBe(403);
  const exported = await request.post("/api/report?mode=fixture", { headers });
  expect(exported.status()).toBe(200);
  const verified = await request.post("/api/verify", {
    headers,
    data: await exported.text(),
  });
  expect((await verified.json()).valid).toBe(true);
  expect(
    (await request.post("/api/verify", { headers, data: "invalid" })).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/verify", { headers, data: "x".repeat(2000001) })
    ).status(),
  ).toBe(413);
});

test("pause stops polling and manual refresh still reads the recording", async ({
  page,
}) => {
  const { fixtureRecording } = await import("../../src/lib/fixture");
  const data = fixtureRecording();
  data.mode = "live";
  data.observations.forEach((o) => {
    o.source = "live";
  });
  let reads = 0;
  await page.clock.install();
  await page.route("**/api/recording?mode=live", (route) => {
    reads++;
    return route.fulfill({ json: data });
  });
  await page.goto("/");
  await expect(page.locator("tbody tr")).toHaveCount(36);
  await page.getByRole("button", { name: "Pause view updates" }).click();
  const readsAtPause = reads;
  await page.clock.fastForward(15000);
  expect(reads).toBe(readsAtPause);
  await page.getByRole("button", { name: "Refresh recording" }).click();
  await expect.poll(() => reads).toBe(readsAtPause + 1);
  await page.getByRole("button", { name: "Resume view updates" }).click();
  await page.clock.fastForward(6000);
  await expect.poll(() => reads).toBe(readsAtPause + 2);
});

test("inspect examples, filter requests, export and verify a signed report", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.goto("/");
  await page.getByRole("button", { name: "Example", exact: true }).click();
  await expect(
    page.getByText("Illustrative recording", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(36);
  await page.getByRole("button", { name: "Example", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(36);
  await expect(page.locator(".inspector")).toHaveCount(0);
  await expect(page.locator(".comparison-list")).not.toBeVisible();
  await page.locator(".comparison-toggle").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".comparison-list")).toBeVisible();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Arkiv", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(24);
  await page
    .getByRole("button", { name: "Inspect request fixture-35", exact: true })
    .click();
  await expect(page.locator(".inspector-method")).toHaveText(
    "arkiv_getEntityCount",
  );
  await expect(page.locator(".inspector")).toBeFocused();
  await page.getByRole("button", { name: "Close request details" }).click();
  await expect(page.locator(".inspector")).toHaveCount(0);
  await expect(
    page.getByRole("button", {
      name: "Inspect request fixture-35",
      exact: true,
    }),
  ).toBeFocused();
  await page.getByRole("button", { name: "All networks", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Find a method" })
    .fill("does-not-exist");
  await expect(page.getByText("No requests in this view")).toBeVisible();
  await page.getByRole("textbox", { name: "Find a method" }).fill("");
  await page.screenshot({
    path: "artifacts/recorder-desktop.png",
    fullPage: true,
  });
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export report", exact: true })
    .click();
  const download = await downloadPromise;
  const content = await readFile((await download.path())!, "utf8");
  const report = JSON.parse(content);
  expect(report.payload.recording.mode).toBe("fixture");
  await page.getByRole("button", { name: "Reports", exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "report.json",
    mimeType: "application/json",
    buffer: Buffer.from(content),
  });
  await expect(
    page.getByText("Integrity verified", { exact: true }),
  ).toBeVisible();
  report.payload.recording.observations[0].durationMs++;
  await page.locator('input[type="file"]').setInputFiles({
    name: "modified.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(report)),
  });
  await expect(
    page.getByText("Integrity check failed", { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("invalid live responses show a recoverable error without fixture fallback", async ({
  page,
}) => {
  await page.route("**/api/recording?mode=live", (route) =>
    route.fulfill({ json: { observations: null } }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("alert").filter({ hasText: "invalid recording" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Live", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Example", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(36);
  await expect(
    page.getByRole("alert").filter({ hasText: "invalid recording" }),
  ).toHaveCount(0);
});

test("a recent request does not hide stale node checks", async ({ page }) => {
  const { fixtureRecording } = await import("../../src/lib/fixture");
  const data = fixtureRecording();
  data.mode = "live";
  data.observations.forEach((o) => {
    o.source = "live";
    o.recordedAt = new Date().toISOString();
  });
  data.nodes.forEach((n) => {
    n.checkedAt = new Date(Date.now() - 600000).toISOString();
  });
  await page.route("**/api/recording?mode=live", (route) =>
    route.fulfill({ json: data }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Nodes", exact: true }).click();
  await expect(page.getByText("Last known state", { exact: true })).toHaveCount(
    2,
  );
  await expect(page.getByText("Connected", { exact: true })).toHaveCount(0);
});

test("mobile console fits and live mode never silently becomes an example", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Live", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Example", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(36);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const requestTable = page.getByRole("table", { name: "Recorded requests" });
  expect(
    await requestTable.evaluate(
      (table) => table.scrollWidth <= table.clientWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Inspect request fixture-35", exact: true })
    .click();
  await expect(page.locator(".inspector")).toBeInViewport();
  await page.getByRole("button", { name: "Close request details" }).click();
  await expect(page.locator(".inspector")).toHaveCount(0);
  await page.screenshot({
    path: "artifacts/recorder-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Nodes", exact: true }).click();
  await expect(page.getByText("Collector host resources")).toBeVisible();
  await expect(
    page.getByRole("alert").filter({ hasText: "Capacity alert" }),
  ).toBeVisible();
  await expect(
    page.getByText("example-only / synthetic", { exact: false }),
  ).toBeVisible();
  const counters = page.getByRole("table", { name: "RPC method counters" });
  await expect(
    counters.getByRole("row").filter({ hasText: "arkiv_getEntityCount" }),
  ).toContainText("24");
});
