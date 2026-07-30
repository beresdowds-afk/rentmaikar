import { defineConfig, devices } from "@playwright/test";

// Playwright config for Paystack/Opay checkout E2E tests.
// The dev server is expected to be running at http://localhost:8080.
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:8080",
    trace: "retain-on-failure",
    viewport: { width: 1280, height: 900 },
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          // The sandbox ships a pre-installed Chromium; allow overriding the
          // executable so runs don't require `npx playwright install`.
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
        },
      },
    },
  ],

});
