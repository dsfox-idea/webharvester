import { expect, test } from '@playwright/test';
import { AvailabilityRules, type Channel, type Environment, type Platform } from '../../src/availability.ts';
import { PermissionCatalog, type CatalogEntry } from '../../src/catalog.ts';

const base: Environment = {
  platform: 'mac',
  channel: 'stable',
  manifestVersion: 3,
  location: 'unpacked',
  sessionType: 'regular',
  commandLineSwitches: [],
  featureFlags: [],
};
const entry = (name: string, ...alternatives: CatalogEntry['alternatives']): CatalogEntry => ({ name, alternatives });
const rules = (overrides: Partial<Environment> = {}) => new AvailabilityRules({ ...base, ...overrides });

test.describe('AvailabilityRules', () => {
  test('stable feature is available everywhere', () => {
    expect(rules().evaluate(entry('alarms', { channel: 'stable' }))).toEqual({ available: true });
  });

  test('channel: a dev feature is unavailable on stable but available on dev, canary and unknown', () => {
    const dns = entry('dns', { channel: 'dev' });
    expect(rules({ channel: 'stable' }).evaluate(dns)).toMatchObject({ available: false, reason: 'channel', detail: 'dev' });
    expect(rules({ channel: 'beta' }).evaluate(dns).available).toBe(false);
    expect(rules({ channel: 'dev' }).evaluate(dns).available).toBe(true);
    expect(rules({ channel: 'canary' }).evaluate(dns).available).toBe(true);
    expect(rules({ channel: 'unknown' }).evaluate(dns).available).toBe(true);
  });

  test('channel: --enable-experimental-extension-apis lifts channel restrictions', () => {
    const dns = entry('dns', { channel: 'dev' });
    expect(rules({ commandLineSwitches: ['enable-experimental-extension-apis'] }).evaluate(dns).available).toBe(true);
  });

  test('platform: chromeos-only feature is unavailable on mac', () => {
    const verdict = rules().evaluate(entry('wallpaper', { channel: 'stable', platforms: ['chromeos'] }));
    expect(verdict).toMatchObject({ available: false, reason: 'platform' });
    expect(rules({ platform: 'chromeos' }).evaluate(entry('wallpaper', { channel: 'stable', platforms: ['chromeos'] })).available).toBe(true);
  });

  test('manifest version bounds', () => {
    const mv2Only = entry('webRequestBlocking', { channel: 'stable', max_manifest_version: 2 });
    expect(rules().evaluate(mv2Only)).toMatchObject({ available: false, reason: 'max-manifest-version' });
    expect(rules({ manifestVersion: 2 }).evaluate(mv2Only).available).toBe(true);
    const mv3Only = entry('offscreen', { channel: 'stable', min_manifest_version: 3 });
    expect(rules({ manifestVersion: 2 }).evaluate(mv3Only)).toMatchObject({ available: false, reason: 'min-manifest-version' });
  });

  test('location: policy-only feature needs a policy install', () => {
    const policy = entry('enterprise.hardwarePlatform', { channel: 'stable', location: 'policy' });
    expect(rules().evaluate(policy)).toMatchObject({ available: false, reason: 'location' });
    expect(rules({ location: 'policy' }).evaluate(policy).available).toBe(true);
    expect(rules({ location: 'component' }).evaluate(policy).available).toBe(true);
  });

  test('command-line switch and feature flag gates', () => {
    const experimental = entry('experimental', { channel: 'stable', command_line_switch: 'experimental-extension-apis' });
    expect(rules().evaluate(experimental)).toMatchObject({ available: false, reason: 'command-line-switch' });
    expect(rules({ commandLineSwitches: ['experimental-extension-apis'] }).evaluate(experimental).available).toBe(true);
    const flagged = entry('enterprise.webrtc', { channel: 'stable', feature_flag: 'ApiEnterpriseWebrtc' });
    expect(rules().evaluate(flagged)).toMatchObject({ available: false, reason: 'feature-flag' });
    expect(rules({ featureFlags: ['ApiEnterpriseWebrtc'] }).evaluate(flagged).available).toBe(true);
  });

  test('allowlist, session type and behavior dependencies block regular extensions', () => {
    expect(rules().evaluate(entry('hid', { channel: 'stable', allowlist: ['A'] }))).toMatchObject({ reason: 'allowlist' });
    expect(rules().evaluate(entry('audio', { channel: 'stable', session_types: ['kiosk'] }))).toMatchObject({ reason: 'session-type' });
    expect(rules({ sessionType: 'kiosk' }).evaluate(entry('audio', { channel: 'stable', session_types: ['kiosk'] })).available).toBe(true);
    expect(rules().evaluate(entry('login', { channel: 'stable', dependencies: ['behavior:imprivata_extension'] }))).toMatchObject({ reason: 'dependency' });
  });

  test('complex feature: first available alternative wins, otherwise the first alternative explains', () => {
    const processes = entry('processes', { channel: 'dev' }, { channel: 'stable', allowlist: ['A'] });
    expect(rules({ channel: 'dev' }).evaluate(processes).available).toBe(true);
    expect(rules({ channel: 'stable' }).evaluate(processes)).toMatchObject({ available: false, reason: 'channel' });
    const blocking = entry('webRequestBlocking', { channel: 'stable', max_manifest_version: 2 }, { channel: 'stable', location: 'policy', min_manifest_version: 3 });
    expect(rules({ location: 'policy' }).evaluate(blocking).available).toBe(true);
    expect(rules().evaluate(blocking)).toMatchObject({ reason: 'max-manifest-version' });
  });

  test('checks run in Chromium order: platform before channel before switches', () => {
    const mixed = entry('x', { channel: 'dev', platforms: ['chromeos'], command_line_switch: 'sw' });
    expect(rules().evaluate(mixed)).toMatchObject({ reason: 'platform' });
    expect(rules({ platform: 'chromeos' }).evaluate(mixed)).toMatchObject({ reason: 'channel' });
    expect(rules({ platform: 'chromeos', channel: 'dev' }).evaluate(mixed)).toMatchObject({ reason: 'command-line-switch' });
  });

  test('two channel buckets suffice for the catalog: unknown/canary/dev agree, beta/stable agree', () => {
    // ChannelProbe can only tell "dev or less stable" from "beta or stable"; this proves no catalog
    // permission would be predicted differently within either bucket, on any desktop platform.
    const catalog = PermissionCatalog.load();
    const buckets: Channel[][] = [['unknown', 'canary', 'dev'], ['beta', 'stable']];
    for (const platform of ['mac', 'win', 'linux'] as Platform[]) {
      for (const bucket of buckets) {
        for (const entry of catalog.entries) {
          const verdicts = bucket.map((channel) => rules({ platform, channel }).evaluate(entry).available);
          expect(new Set(verdicts).size, `${entry.name} on ${platform} across ${bucket.join('/')}`).toBe(1);
        }
      }
    }
  });

  test('chromeForTesting environment reports the unknown channel on the host platform', () => {
    const env = AvailabilityRules.chromeForTesting();
    expect(env.channel).toBe('unknown');
    expect(['mac', 'win', 'linux']).toContain(env.platform);
  });
});
