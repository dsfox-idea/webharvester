import { mkdirSync, writeFileSync } from 'node:fs';
import { test as base } from '@playwright/test';
import { AvailabilityRules } from '../../src/availability.ts';
import { BrowserSession } from '../../src/browser-session.ts';
import { CatalogRepository } from '../../src/catalog-repository.ts';
import type { PermissionCatalog } from '../../src/catalog.ts';
import { ExpectedPermissions } from '../../src/expected-permissions.ts';
import { ManifestBuilder } from '../../src/manifest-builder.ts';
import type { MeasuredReport } from '../../src/non-working.ts';
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
      await use(await session.runProbes());
    },
    { scope: 'worker' },
  ],
  expected: [
    async ({ session, report }, use) => {
      const version = session.browser.version;
      let catalog: PermissionCatalog;
      try {
        catalog = await new CatalogRepository().forVersion(version);
      } catch (error) {
        console.warn(`[catalog] no catalog for Chromium ${version} (${(error as Error).message}); falling back to main`);
        catalog = CatalogRepository.readMain();
      }
      const declared = ManifestBuilder.readManifest().permissions;
      const expected = new ExpectedPermissions(new AvailabilityRules(session.environment), declared, catalog, version);
      const measured: MeasuredReport = {
        ...report,
        browser: { versionLine: session.browser.versionLine, executablePath: session.browser.executablePath, version },
        expectations: expected.expectations,
      };
      mkdirSync('test-results', { recursive: true });
      writeFileSync('test-results/probe-report.json', `${JSON.stringify(measured, null, 2)}\n`);
      await use(expected);
    },
    { scope: 'worker' },
  ],
});

export { expect } from '@playwright/test';
