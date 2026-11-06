import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  timeout: 30000,
  use: {
    baseURL: "http://127.0.0.1:3000",
    channel: process.env.CI ? undefined : "chrome",
  },
  webServer: {
    command:
      process.env.CI || process.env.AMPERE_E2E_PRODUCTION
        ? "npm run start"
        : "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI && !process.env.AMPERE_E2E_PRODUCTION,
  },
});
