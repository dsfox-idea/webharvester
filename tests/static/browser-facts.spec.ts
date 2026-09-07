import { expect, test } from '@playwright/test';
import { AvailabilityRules } from '../../src/availability.ts';
import { CatalogRepository } from '../../src/catalog-repository.ts';
import { PermissionCatalog, type CatalogDocument } from '../../src/catalog.ts';
import { ExpectedPermissions } from '../../src/expected-permissions.ts';
import { VersionPage } from '../../src/version-page.ts';

test.describe('VersionPage', () => {
  test('parses the Chromium version out of the chrome://version line', () => {
    expect(VersionPage.parseVersion('153.0.8010.12 (официальная сборка) (arm64)')).toBe('153.0.8010.12');
    expect(VersionPage.parseVersion('151.0.7445.82 (Official Build) unknown (arm64)')).toBe('151.0.7445.82');
    expect(VersionPage.parseVersion('151.1.95.0 Chromium: 151.0.7445.82 (Official Build) (arm64)')).toBe('151.0.7445.82');
    expect(() => VersionPage.parseVersion('no version here')).toThrow(/No Chromium version/);
  });

  test('extracts switch names from the command line, ignoring values and the executable path', () => {
    const line =
      '/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome --headless --user-data-dir=/tmp/a b ' +
      '--enable-experimental-extension-apis --disable-features=X,Y --remote-debugging-port=9222 https://example.com --headless';
    expect(VersionPage.parseSwitches(line)).toEqual([
      'headless',
      'user-data-dir',
      'enable-experimental-extension-apis',
      'disable-features',
      'remote-debugging-port',
    ]);
  });
});

test.describe('CatalogRepository', () => {
  test('maps a Chromium version to a file under catalog/versions', () => {
    expect(CatalogRepository.versionPath('151.0.7445.82')).toMatch(/catalog\/versions\/151\.0\.7445\.82\.json$/);
    expect(() => CatalogRepository.versionPath('151')).toThrow(/not a Chromium version/);
    expect(() => CatalogRepository.versionPath('../etc')).toThrow(/not a Chromium version/);
  });
});

test.describe('ExpectedPermissions', () => {
  const browserCatalog = new PermissionCatalog({
    source: { repository: '', revision: 'refs/tags/151.0.7445.82', fetchedAt: '', files: [] },
    excluded: { private: [], allowlistOnly: [], notApiPermissions: [], internal: [], incompatible: [] },
    permissions: [
      { name: 'alarms', alternatives: [{ channel: 'stable', extension_types: ['extension'] }] },
      { name: 'wallpaper', alternatives: [{ channel: 'stable', extension_types: ['extension'], platforms: ['chromeos'] }] },
    ],
  } satisfies CatalogDocument);
  const rules = new AvailabilityRules(AvailabilityRules.chromeForTesting({ platform: 'mac' }));

  test('marks declared permissions the browser release does not know as unknown-permission', () => {
    const expected = new ExpectedPermissions(rules, ['alarms', 'publicSuffix', 'wallpaper'], browserCatalog, '151.0.7445.82');
    expect(expected.available).toEqual(['alarms']);
    expect(expected.unavailable).toEqual([
      { name: 'publicSuffix', verdict: { available: false, reason: 'unknown-permission', detail: 'not in Chromium 151.0.7445.82' } },
      { name: 'wallpaper', verdict: { available: false, reason: 'platform', detail: 'chromeos' } },
    ]);
  });
});
