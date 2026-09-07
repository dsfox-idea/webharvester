import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  fullyParallel: false,
  reporter: [['list'], ['html', { open: 'never' }]],
  projects: [
    { name: 'static', testDir: 'tests/static', timeout: 15_000 },
    { name: 'live', testDir: 'tests/live', timeout: 120_000, workers: 1, retries: 0 },
  ],
});
