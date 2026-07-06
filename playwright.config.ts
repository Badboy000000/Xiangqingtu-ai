import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'e2e-browser.spec.ts',
  timeout: 24 * 60 * 60 * 1000, // 24 小时，等效于不超时
  use: {
    baseURL: 'http://localhost:5173',
    headless: false,        // 默认有头模式，可观看操作过程
    launchOptions: { slowMo: 100 }, // 每步操作间隔 100ms，适度观看
    viewport: { width: 1440, height: 900 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
