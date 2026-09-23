import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  fullyParallel: false,
  reporter: [['list'], ['html', { open: 'never' }]],
  projects: [
    { name: 'static', testDir: 'tests/static', timeout: 15_000 },
    // Code the growser MCP server runs inside pages, exercised in Playwright's bundled Chromium (no extension).
    { name: 'page', testDir: 'tests/page', timeout: 30_000, use: { browserName: 'chromium', headless: true } },
    { name: 'live', testDir: 'tests/live', timeout: 120_000, workers: 1, retries: 0 },
  ],
});
