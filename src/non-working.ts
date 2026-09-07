import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Verdict } from './availability.ts';
import type { ProbeReport } from './probe-report.ts';

export interface NonWorkingPermission {
  name: string;
  reason: string;
  detail: string;
}

export interface NonWorkingDocument {
  /** The browser the measurement was taken in. */
  measuredIn: { versionLine: string; executablePath: string; chromiumVersion: string; measuredAt: string };
  permissions: NonWorkingPermission[];
}

/** A probe report enriched by the live tests with the verdict predicted for each declared permission. */
export interface MeasuredReport extends ProbeReport {
  browser?: { versionLine: string; executablePath: string; version: string };
  expectations?: Array<{ name: string; verdict: Verdict }>;
}

/**
 * Permissions a real browser refused: measured (not predicted) from a live
 * probe run of the full manifest, kept in catalog/non-working.json and left
 * out of the manifest by the builder.
 */
export class NonWorkingList {
  static readonly defaultPath = fileURLToPath(new URL('../catalog/non-working.json', import.meta.url));

  private readonly document: NonWorkingDocument;

  constructor(document: NonWorkingDocument) {
    this.document = document;
  }

  static empty(): NonWorkingList {
    return new NonWorkingList({
      measuredIn: { versionLine: '', executablePath: '', chromiumVersion: '', measuredAt: '' },
      permissions: [],
    });
  }

  static load(path: string = NonWorkingList.defaultPath): NonWorkingList {
    if (!existsSync(path)) return NonWorkingList.empty();
    return new NonWorkingList(JSON.parse(readFileSync(path, 'utf8')) as NonWorkingDocument);
  }

  static fromReport(report: MeasuredReport): NonWorkingList {
    if (!report.browser || !report.expectations) throw new Error('Report lacks browser facts or expectations; run the live tests first');
    const verdicts = new Map(report.expectations.map((e) => [e.name, e.verdict]));
    const permissions = report.results
      .filter((result) => !result.granted)
      .map((result) => {
        const verdict = verdicts.get(result.permission);
        return {
          name: result.permission,
          reason: verdict?.reason ?? 'not-granted',
          detail: verdict?.detail ?? 'not granted by the browser',
        };
      });
    return new NonWorkingList({
      measuredIn: {
        versionLine: report.browser.versionLine,
        executablePath: report.browser.executablePath,
        chromiumVersion: report.browser.version,
        measuredAt: report.ranAt,
      },
      permissions,
    });
  }

  get names(): string[] {
    return this.document.permissions.map((p) => p.name);
  }

  get permissions(): NonWorkingPermission[] {
    return [...this.document.permissions];
  }

  get measuredIn(): NonWorkingDocument['measuredIn'] {
    return this.document.measuredIn;
  }

  serialize(): string {
    return `${JSON.stringify(this.document, null, 2)}\n`;
  }

  write(path: string = NonWorkingList.defaultPath): void {
    writeFileSync(path, this.serialize());
  }
}
