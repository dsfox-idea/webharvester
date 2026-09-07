import { mkdirSync, writeFileSync } from 'node:fs';
import { test as base } from '@playwright/test';
import { AvailabilityRules } from '../../src/availability.ts';
import { BrowserSession } from '../../src/browser-session.ts';
import { CatalogRepository } from '../../src/catalog-repository.ts';
import type { PermissionCatalog } from '../../src/catalog.ts';
import { ExpectedPermissions } from '../../src/expected-permissions.ts';
import { ManifestBuilder } from '../../src/manifest-builder.ts';
import type { ProbeReport } from '../../src/probe-report.ts';

interface WorkerFixtures {
  session: BrowserSession;
  report: ProbeReport;
  expected: ExpectedPermissions;
}

export const test = base.extend<Record<never, never>, WorkerFixtures>({
  session: [
    async ({}, use) => {
      const session = BrowserSession.fromEnv();
      await session.open();
      await use(session);
      await session.close();
    },
    { scope: 'worker' },
  ],
  report: [
    async ({ session }, use) => {
      const report = await session.runProbes();
      mkdirSync('test-results', { recursive: true });
      writeFileSync('test-results/probe-report.json', `${JSON.stringify(report, null, 2)}\n`);
      await use(report);
    },
    { scope: 'worker' },
  ],
  expected: [
    async ({ session }, use) => {
      const version = session.browser.version;
      let catalog: PermissionCatalog;
      try {
        catalog = await new CatalogRepository().forVersion(version);
      } catch (error) {
        console.warn(`[catalog] no catalog for Chromium ${version} (${(error as Error).message}); falling back to main`);
        catalog = CatalogRepository.readMain();
      }
      const declared = ManifestBuilder.readManifest().permissions;
      await use(new ExpectedPermissions(new AvailabilityRules(session.environment), declared, catalog, version));
    },
    { scope: 'worker' },
  ],
});

export { expect } from '@playwright/test';
