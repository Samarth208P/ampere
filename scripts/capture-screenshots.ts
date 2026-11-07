import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { setTimeout } from "node:timers/promises";
import path from "node:path";
import fs from "node:fs";

async function main() {
  const outputDir = path.resolve("docs/assets/screenshots");
  fs.mkdirSync(outputDir, { recursive: true });

  console.log("Starting Next.js server on port 3000...");
  const server = spawn("npx", ["next", "dev", "-p", "3000"], {
    stdio: "pipe",
    shell: true,
  });

  // Wait for server to be responsive
  let ready = false;
  for (let i = 0; i < 30; i++) {
    await setTimeout(1000);
    try {
      const res = await fetch("http://127.0.0.1:3000");
      if (res.ok) {
        ready = true;
        break;
      }
    } catch {}
  }

  if (!ready) {
    console.error("Server failed to start");
    server.kill();
    process.exit(1);
  }

  console.log("Launching browser for screenshot capture...");
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  // 1. Recorder Console (Example mode)
  console.log("Capturing 1: Console Overview / Request Recorder...");
  await page.goto("http://127.0.0.1:3000");
  await page.waitForSelector("button:has-text('Example')");
  await page.click("button:has-text('Example')");
  await setTimeout(1200);
  await page.screenshot({
    path: path.join(outputDir, "01-request-recorder.png"),
    fullPage: false,
  });

  // 2. Request Inspector Drawer
  console.log("Capturing 2: Request Inspector Drawer...");
  const firstRow = page.locator("tbody tr").first();
  if (await firstRow.isVisible()) {
    await firstRow.click();
    await setTimeout(800);
    await page.screenshot({
      path: path.join(outputDir, "02-request-inspector.png"),
      fullPage: false,
    });
  }

  // 3. Nodes Tab - Arkiv node telemetry & disk saturation alert
  console.log("Capturing 3: Arkiv Node Diagnostics & Telemetry...");
  await page.click("button:has-text('Nodes')");
  await setTimeout(1200);
  await page.screenshot({
    path: path.join(outputDir, "03-arkiv-node-diagnostics.png"),
    fullPage: false,
  });

  // 4. Nodes Tab scrolled to Frame Admission Diagnostics
  console.log("Capturing 4: Frame Transaction Admission Diagnostics...");
  await page.evaluate(() => window.scrollBy(0, 450));
  await setTimeout(800);
  await page.screenshot({
    path: path.join(outputDir, "04-frame-admission-diagnostics.png"),
    fullPage: false,
  });

  // 5. Reports Tab
  console.log("Capturing 5: Cryptographic Reports & Ed25519 Verification...");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.click("button:has-text('Reports')");
  await setTimeout(1000);
  await page.screenshot({
    path: path.join(outputDir, "05-verifiable-reports.png"),
    fullPage: false,
  });

  // 6. How It Works page
  console.log("Capturing 6: How It Works & Architecture Workflow...");
  await page.goto("http://127.0.0.1:3000/how-it-works");
  await setTimeout(1200);
  await page.screenshot({
    path: path.join(outputDir, "06-how-it-works-workflow.png"),
    fullPage: false,
  });

  await browser.close();
  server.kill();
  console.log("All screenshots captured successfully in docs/assets/screenshots/");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
