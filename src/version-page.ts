import type { BrowserContext } from '@playwright/test';

/** What chrome://version tells about the running browser. */
export interface BrowserFacts {
  /** Chromium version, e.g. "151.0.7445.82" (Brave-based browsers report their Chromium base here). */
  version: string;
  versionLine: string;
  executablePath: string;
  profilePath: string;
  commandLine: string;
  userAgent: string;
}

/** Reads chrome://version, which works in every Chromium-based browser and in attach mode where no executable path is known. */
export class VersionPage {
  static readonly url = 'chrome://version/';

  static async read(context: BrowserContext): Promise<BrowserFacts> {
    const page = await context.newPage();
    try {
      await page.goto(VersionPage.url);
      const text = await page.evaluate(() => {
        const read = (id: string) => (document.getElementById(id)?.textContent ?? '').replace(/\s+/g, ' ').trim();
        return {
          versionLine: read('version'),
          executablePath: read('executable_path'),
          profilePath: read('profile_path'),
          commandLine: read('command_line'),
          userAgent: read('useragent'),
        };
      });
      return { ...text, version: VersionPage.parseVersion(text.versionLine) };
    } finally {
      await page.close();
    }
  }

  /** Brave-based browsers print their own version first and the base as "Chromium: 151.0.7445.82"; prefer that. */
  static parseVersion(versionLine: string): string {
    const match = /Chromium:\s*(\d+\.\d+\.\d+\.\d+)/.exec(versionLine) ?? /(\d+\.\d+\.\d+\.\d+)/.exec(versionLine);
    if (!match) throw new Error(`No Chromium version in "${versionLine}"`);
    return match[1];
  }

  /** Switch names (without dashes or values) from a chrome://version command line. */
  static parseSwitches(commandLine: string): string[] {
    const names = new Set<string>();
    for (const token of commandLine.split(/\s+/)) {
      const match = /^--([^=\s]+)/.exec(token);
      if (match && match[1] !== '') names.add(match[1]);
    }
    return [...names];
  }
}
