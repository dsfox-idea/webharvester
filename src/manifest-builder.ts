import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { PermissionCatalog } from './catalog.ts';
import type { NonWorkingList } from './non-working.ts';

export interface ContentScriptDeclaration {
  matches: string[];
  js: string[];
  all_frames: boolean;
  match_about_blank: boolean;
  match_origin_as_fallback: boolean;
  run_at: 'document_start' | 'document_end' | 'document_idle';
}

export interface ExtensionManifest {
  manifest_version: 3;
  name: string;
  version: string;
  description: string;
  key: string;
  minimum_chrome_version: string;
  permissions: string[];
  host_permissions: string[];
  background: { service_worker: string; type: 'module' };
  action: { default_title: string };
  content_scripts: ContentScriptDeclaration[];
}

/**
 * Builds `extension/manifest.json` from the catalog minus the measured
 * non-working list, so the manifest never drifts from either. The
 * non-working list is also copied next to the manifest for the probe page.
 */
export class ManifestBuilder {
  static readonly manifestPath = fileURLToPath(new URL('../extension/manifest.json', import.meta.url));
  static readonly nonWorkingCopyPath = fileURLToPath(new URL('../extension/non-working.json', import.meta.url));
  static readonly publicKeyPath = fileURLToPath(new URL('../catalog/public-key.b64', import.meta.url));

  private readonly catalog: PermissionCatalog;
  private readonly nonWorking: NonWorkingList;
  private readonly publicKey: string;
  private readonly version: string;

  constructor(catalog: PermissionCatalog, nonWorking: NonWorkingList, publicKey: string, version: string) {
    this.catalog = catalog;
    this.nonWorking = nonWorking;
    this.publicKey = publicKey;
    this.version = version;
  }

  /** Catalog names that are not marked non-working. */
  get permissions(): string[] {
    const excluded = new Set(this.nonWorking.names);
    return this.catalog.names.filter((name) => !excluded.has(name)).sort();
  }

  static readPublicKey(path: string = ManifestBuilder.publicKeyPath): string {
    return readFileSync(path, 'utf8').trim();
  }

  static readManifest(path: string = ManifestBuilder.manifestPath): ExtensionManifest {
    return JSON.parse(readFileSync(path, 'utf8')) as ExtensionManifest;
  }

  build(): ExtensionManifest {
    return {
      manifest_version: 3,
      name: 'webharvester',
      version: this.version,
      description:
        'Declares every permission a regular Chromium extension can declare, plus all hosts and all frames. Open the action to run the permission probes.',
      key: this.publicKey,
      minimum_chrome_version: '116',
      permissions: this.permissions,
      host_permissions: ['<all_urls>'],
      background: { service_worker: 'background.js', type: 'module' },
      action: { default_title: 'webharvester: run permission probes' },
      content_scripts: [
        {
          matches: ['<all_urls>'],
          js: ['content.js'],
          all_frames: true,
          match_about_blank: true,
          match_origin_as_fallback: true,
          run_at: 'document_start',
        },
      ],
    };
  }

  serialize(): string {
    return `${JSON.stringify(this.build(), null, 2)}\n`;
  }

  write(path: string = ManifestBuilder.manifestPath): void {
    writeFileSync(path, this.serialize());
    writeFileSync(ManifestBuilder.nonWorkingCopyPath, this.nonWorking.serialize());
  }
}
