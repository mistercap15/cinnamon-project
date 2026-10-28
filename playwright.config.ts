import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e', workers: 2, fullyParallel: true, retries: 0, reporter: 'list',
  use: { baseURL: 'http://localhost:3011', channel: 'chrome', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: { command: 'npm run start -- --port 3011', url: 'http://localhost:3011', reuseExistingServer: !process.env.CI, timeout: 30000 },
});
