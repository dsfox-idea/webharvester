import type { AvailabilityRules, Verdict } from './availability.ts';
import type { PermissionCatalog } from './catalog.ts';

export interface Expectation {
  name: string;
  verdict: Verdict;
}

/**
 * What the browser should grant, per declared manifest permission: the
 * availability rules applied to the catalog of the browser's own Chromium
 * release; a declared name that release does not know is `unknown-permission`.
 */
export class ExpectedPermissions {
  readonly expectations: Expectation[];

  constructor(rules: AvailabilityRules, declared: readonly string[], browserCatalog: PermissionCatalog, browserVersion: string) {
    this.expectations = declared.map((name) => ({
      name,
      verdict: browserCatalog.has(name)
        ? rules.evaluate(browserCatalog.entry(name))
        : { available: false, reason: 'unknown-permission', detail: `not in Chromium ${browserVersion}` },
    }));
  }

  get available(): string[] {
    return this.expectations.filter((e) => e.verdict.available).map((e) => e.name);
  }

  get unavailable(): Expectation[] {
    return this.expectations.filter((e) => !e.verdict.available);
  }
}
