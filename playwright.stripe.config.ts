import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/stripe",
  outputDir: "test-results/stripe",
  workers: 1,
  fullyParallel: false,
  timeout: 150000,
  expect: { timeout: 30000 },
  use: {
    baseURL: "http://localhost:3014",
    channel: "chrome",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    {
      name: "mobile",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
