import { CatalogRepository } from '../../src/catalog-repository.ts';
import { ExtensionsPage } from '../../src/extensions-page.ts';
import { NonWorkingList } from '../../src/non-working.ts';
import { expect, test } from './fixtures.ts';

test.describe('live permissions', () => {
  test('extension loads with the id derived from manifest.key', async ({ session, report }, testInfo) => {
    await testInfo.attach('probe-report.json', { body: JSON.stringify(report, null, 2), contentType: 'application/json' });
    expect(report.extensionId).toBe(session.extensionId);
    expect(report.manifestVersion).toBe(3);
  });

  test('declares every catalog permission that is not marked non-working', async ({ report }) => {
    const nonWorking = new Set(NonWorkingList.load().names);
    expect([...report.declared].sort()).toEqual(CatalogRepository.readMain().names.filter((name) => !nonWorking.has(name)).sort());
  });

  test('grants exactly the permissions Chromium makes available in this environment', async ({ report, expected }) => {
    const granted = new Set(report.granted);
    const missing = expected.available.filter((name) => !granted.has(name));
    const unexpected = report.granted.filter((name) => !expected.available.includes(name));
    expect(missing, 'expected available but not granted').toEqual([]);
    expect(unexpected, 'granted but expected unavailable').toEqual([]);
  });

  test('grants access to all hosts', async ({ report }) => {
    expect(report.grantedOrigins).toContain('<all_urls>');
  });

  test('exposes the API namespace of every granted permission', async ({ session, report, expected }, testInfo) => {
    const available = new Set(expected.available);
    const absent: string[] = [];
    for (const result of report.results) {
      if (!available.has(result.permission) || !result.namespace) continue;
      if (result.namespace.present) continue;
      if (result.conditional && !session.developerMode) {
        testInfo.annotations.push({ type: 'conditional', description: `${result.permission}: ${result.namespace.name} absent, needs ${result.conditional}` });
      } else {
        absent.push(`${result.permission}: ${result.namespace.name}`);
      }
    }
    expect(absent).toEqual([]);
  });

  test('every granted permission survives a harmless API call', async ({ report, expected }) => {
    const available = new Set(expected.available);
    const failures = report.results
      .filter((result) => available.has(result.permission) && result.exercise.status === 'failed')
      .map((result) => `${result.permission}: ${result.exercise.detail}`);
    expect(failures).toEqual([]);
  });

  test('permissions unavailable in this environment are not granted', async ({ report, expected }, testInfo) => {
    const granted = new Set(report.granted);
    for (const { name, verdict } of expected.unavailable) {
      testInfo.annotations.push({ type: 'unavailable', description: `${name}: ${verdict.reason} (${verdict.detail})` });
    }
    expect(expected.unavailable.filter((e) => granted.has(e.name)).map((e) => e.name)).toEqual([]);
  });

  test('Chromium warns about exactly the permissions predicted unavailable', async ({ session, expected }, testInfo) => {
    test.skip(!session.developerMode, 'Chromium reports manifest warnings only in developer mode');
    const info = await session.extensionsPage.info(session.extensionId);
    await testInfo.attach('extension-info.json', { body: JSON.stringify(info, null, 2), contentType: 'application/json' });
    expect(info.state).toBe('ENABLED');
    expect(info.runtimeErrors).toEqual([]);
    const warned = [...info.installWarnings, ...info.manifestErrors].map(ExtensionsPage.permissionNamed).filter((name): name is string => !!name);
    expect([...new Set(warned)].sort()).toEqual(expected.unavailable.map((e) => e.name).sort());
  });

  test('service worker is registered', async ({ session }) => {
    test.skip(session.mode === 'attach', 'service workers are not visible over connectOverCDP');
    const urls = session.context.serviceWorkers().map((worker) => worker.url());
    expect(urls).toContain(`chrome-extension://${session.extensionId}/background.js`);
  });
});
