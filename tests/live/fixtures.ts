import { mkdirSync, writeFileSync } from 'node:fs';
import { test as base } from '@playwright/test';
import { AvailabilityRules, type Verdict } from '../../src/availability.ts';
import { BrowserSession } from '../../src/browser-session.ts';
import { PermissionCatalog } from '../../src/catalog.ts';
import type { ProbeReport } from '../../src/probe-report.ts';

export interface Expectation {
  name: string;
  verdict: Verdict;
}

/** What Chromium should grant in the session's environment, per catalog permission. */
export class ExpectedPermissions {
  readonly expectations: Expectation[];

  constructor(rules: AvailabilityRules, catalog: PermissionCatalog) {
    this.expectations = catalog.entries.map((entry) => ({ name: entry.name, verdict: rules.evaluate(entry) }));
  }

  get available(): string[] {
    return this.expectations.filter((e) => e.verdict.available).map((e) => e.name);
  }

  get unavailable(): Expectation[] {
    return this.expectations.filter((e) => !e.verdict.available);
  }
}

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
      await use(new ExpectedPermissions(new AvailabilityRules(session.environment), PermissionCatalog.load()));
    },
    { scope: 'worker' },
  ],
});

export { expect } from '@playwright/test';
