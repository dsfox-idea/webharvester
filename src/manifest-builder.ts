import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { PermissionCatalog } from './catalog.ts';

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

/** Builds `extension/manifest.json` from the catalog so the manifest never drifts from it. */
export class ManifestBuilder {
  static readonly manifestPath = fileURLToPath(new URL('../extension/manifest.json', import.meta.url));
  static readonly publicKeyPath = fileURLToPath(new URL('../catalog/public-key.b64', import.meta.url));

  private readonly catalog: PermissionCatalog;
  private readonly publicKey: string;
  private readonly version: string;

  constructor(catalog: PermissionCatalog, publicKey: string, version: string) {
    this.catalog = catalog;
    this.publicKey = publicKey;
    this.version = version;
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
      permissions: [...this.catalog.names].sort(),
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
  }
}
