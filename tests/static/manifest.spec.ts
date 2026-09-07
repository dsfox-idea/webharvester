import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { PermissionCatalog } from '../../src/catalog.ts';
import { ManifestBuilder } from '../../src/manifest-builder.ts';
import { ExtensionIdentity } from '../../src/extension-id.ts';
import { NonWorkingList } from '../../src/non-working.ts';

test.describe('extension/manifest.json', () => {
  const catalog = PermissionCatalog.load();
  const manifest = ManifestBuilder.readManifest();
  const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as { version: string };

  const nonWorking = NonWorkingList.load();

  test('is exactly what the builder produces from the catalog minus the non-working list', () => {
    const builder = new ManifestBuilder(catalog, nonWorking, ManifestBuilder.readPublicKey(), pkg.version);
    expect(readFileSync(ManifestBuilder.manifestPath, 'utf8')).toBe(builder.serialize());
    expect(readFileSync(ManifestBuilder.nonWorkingCopyPath, 'utf8')).toBe(nonWorking.serialize());
  });

  test('declares every catalog permission not marked non-working, sorted and without duplicates', () => {
    const excluded = new Set(nonWorking.names);
    expect(manifest.permissions).toEqual(catalog.names.filter((name) => !excluded.has(name)).sort());
    expect(new Set(manifest.permissions).size).toBe(manifest.permissions.length);
  });

  test('non-working names all come from the catalog and carry a reason', () => {
    for (const p of nonWorking.permissions) {
      expect(catalog.has(p.name), p.name).toBe(true);
      expect(p.reason).not.toBe('');
    }
  });

  test('declares full host access', () => {
    expect(manifest.host_permissions).toEqual(['<all_urls>']);
  });

  test('injects the content script into every URL and every frame at document_start', () => {
    expect(manifest.content_scripts).toHaveLength(1);
    expect(manifest.content_scripts[0]).toMatchObject({
      matches: ['<all_urls>'],
      js: ['content.js'],
      all_frames: true,
      match_about_blank: true,
      match_origin_as_fallback: true,
      run_at: 'document_start',
    });
  });

  test('is Manifest V3 with a module service worker', () => {
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.background).toEqual({ service_worker: 'background.js', type: 'module' });
  });

  test('carries a key that yields a stable, well-formed extension id', () => {
    const id = ExtensionIdentity.fromManifest(manifest);
    expect(id).toMatch(/^[a-p]{32}$/);
    expect(ExtensionIdentity.fromManifest(manifest)).toBe(id);
  });
});

test.describe('ExtensionIdentity', () => {
  test('maps the first 128 bits of SHA-256 to a-p', () => {
    // SHA-256 of the single byte 0x00 starts with 6e340b9c...; 6->g e->o 3->d 4->e 0->a b->l 9->j c->m
    expect(ExtensionIdentity.fromPublicKey(Buffer.from([0]).toString('base64')).slice(0, 8)).toBe('godealjm');
  });

  test('refuses a manifest without a key', () => {
    expect(() => ExtensionIdentity.fromManifest({})).toThrow(/no "key"/);
  });
});
