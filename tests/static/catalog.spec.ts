import { expect, test } from '@playwright/test';
import { CatalogBuilder } from '../../src/catalog-builder.ts';
import { PermissionCatalog, type FeatureDocument } from '../../src/catalog.ts';

test.describe('CatalogBuilder', () => {
  const document: FeatureDocument = {
    alarms: { channel: 'stable', extension_types: ['extension', 'platform_app'] },
    appOnly: { channel: 'stable', extension_types: ['platform_app'] },
    secretPrivate: { channel: 'stable', extension_types: ['extension'] },
    'nested.somethingPrivate.event': { channel: 'stable', extension_types: ['extension'] },
    allowlisted: [
      { channel: 'stable', extension_types: ['extension'], allowlist: ['A'] },
      { channel: 'dev', extension_types: ['extension'], allowlist: ['B'] },
    ],
    partlyAllowlisted: [
      { channel: 'stable', extension_types: ['extension'], allowlist: ['A'] },
      { channel: 'dev', extension_types: ['extension'] },
    ],
    plugin: { channel: 'stable', extension_types: ['extension'] },
    mixedTypes: [
      { channel: 'stable', extension_types: ['platform_app'] },
      { channel: 'stable', extension_types: ['extension'], platforms: ['chromeos'] },
    ],
  };

  test('keeps only declarable extension permissions and records exclusions', () => {
    const built = new CatalogBuilder([document]).build();
    expect(built.permissions.map((entry) => entry.name)).toEqual(['alarms', 'mixedTypes', 'partlyAllowlisted']);
    expect(built.excluded).toEqual({
      private: ['nested.somethingPrivate.event', 'secretPrivate'],
      allowlistOnly: ['allowlisted'],
      notApiPermissions: ['plugin'],
    });
  });

  test('drops alternatives that do not apply to extensions', () => {
    const built = new CatalogBuilder([document]).build();
    const mixed = built.permissions.find((entry) => entry.name === 'mixedTypes')!;
    expect(mixed.alternatives).toEqual([{ channel: 'stable', extension_types: ['extension'], platforms: ['chromeos'] }]);
  });

  test('later documents override earlier ones by name', () => {
    const built = new CatalogBuilder([
      { x: { channel: 'stable', extension_types: ['extension'] } },
      { x: { channel: 'dev', extension_types: ['extension'] } },
    ]).build();
    expect(built.permissions[0].alternatives[0].channel).toBe('dev');
  });
});

test.describe('catalog/permissions.json', () => {
  const catalog = PermissionCatalog.load();

  test('records its Chromium source revision', () => {
    expect(catalog.source.revision).toMatch(/^[0-9a-f]{40}$/);
    expect(catalog.source.files).toHaveLength(2);
  });

  test('is sorted, unique, and free of excluded names', () => {
    const names = catalog.names;
    expect(names).toEqual([...new Set(names)].sort());
    const excluded = new Set([...catalog.excluded.private, ...catalog.excluded.allowlistOnly, ...catalog.excluded.notApiPermissions]);
    expect(names.filter((name) => excluded.has(name))).toEqual([]);
    expect(names.filter((name) => /Private/.test(name))).toEqual([]);
  });

  test('every entry has at least one non-allowlisted extension alternative', () => {
    for (const entry of catalog.entries) {
      const usable = entry.alternatives.filter(
        (alternative) => alternative.extension_types?.includes('extension') && !(alternative.allowlist?.length),
      );
      expect(usable.length, entry.name).toBeGreaterThan(0);
    }
  });

  test('contains the well-known desktop permissions', () => {
    for (const name of ['tabs', 'cookies', 'history', 'debugger', 'scripting', 'webRequest', 'declarativeNetRequest', 'nativeMessaging']) {
      expect(catalog.has(name), name).toBe(true);
    }
  });
});
