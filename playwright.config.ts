import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } },
    },
    {
      name: "iphone",
      use: { ...devices["iPhone 13"] },
    },
    {
      name: "ipad",
      testMatch: /table-view\.spec\.ts/,
      use: { ...devices["iPad (gen 7)"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/demo",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
