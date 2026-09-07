import { expect, test } from './fixtures.ts';

test.describe('live permissions', () => {
  test('extension loads with the id derived from manifest.key', async ({ session, report }, testInfo) => {
    await testInfo.attach('probe-report.json', { body: JSON.stringify(report, null, 2), contentType: 'application/json' });
    expect(report.extensionId).toBe(session.extensionId);
    expect(report.manifestVersion).toBe(3);
  });

  test('declares every catalog permission in the running manifest', async ({ report, expected }) => {
    expect([...report.declared].sort()).toEqual(expected.expectations.map((e) => e.name).sort());
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

  test('exposes the API namespace of every granted permission', async ({ report, expected }, testInfo) => {
    const available = new Set(expected.available);
    const absent: string[] = [];
    for (const result of report.results) {
      if (!available.has(result.permission) || !result.namespace) continue;
      if (result.namespace.present) continue;
      if (result.conditional) {
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

  test('service worker is registered', async ({ session }) => {
    test.skip(session.mode === 'attach', 'service workers are not visible over connectOverCDP');
    const urls = session.context.serviceWorkers().map((worker) => worker.url());
    expect(urls).toContain(`chrome-extension://${session.extensionId}/background.js`);
  });
});
