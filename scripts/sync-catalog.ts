/**
 * Regenerates catalog/permissions.json from Chromium main.
 * Usage: node scripts/sync-catalog.ts [revision]
 */
import { writeFileSync } from 'node:fs';
import { ChromiumJson } from '../src/chromium-json.ts';
import { CatalogBuilder } from '../src/catalog-builder.ts';
import { PermissionCatalog, type CatalogDocument, type FeatureDocument } from '../src/catalog.ts';

class GitilesRepository {
  static readonly chromium = 'https://chromium.googlesource.com/chromium/src';

  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async headRevision(branch = 'main'): Promise<string> {
    const text = await this.fetchText(`${this.baseUrl}/+/refs/heads/${branch}?format=JSON`);
    const json = JSON.parse(text.replace(/^\)\]\}'\n?/, '')) as { commit: string };
    return json.commit;
  }

  async file(path: string, revision: string): Promise<string> {
    const base64 = await this.fetchText(`${this.baseUrl}/+/${revision}/${path}?format=TEXT`);
    return Buffer.from(base64, 'base64').toString('utf8');
  }

  private async fetchText(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
    return response.text();
  }
}

const featureFiles = [
  'extensions/common/api/_permission_features.json',
  'chrome/common/extensions/api/_permission_features.json',
];

async function main(): Promise<void> {
  const repository = new GitilesRepository(GitilesRepository.chromium);
  const revision = process.argv[2] ?? (await repository.headRevision());
  console.log(`Chromium revision ${revision}`);

  const documents: FeatureDocument[] = [];
  for (const path of featureFiles) {
    const text = await repository.file(path, revision);
    documents.push(ChromiumJson.parse<FeatureDocument>(text));
    console.log(`fetched ${path} (${text.length} bytes)`);
  }

  const built = new CatalogBuilder(documents).build();
  const document: CatalogDocument = {
    source: { repository: GitilesRepository.chromium, revision, fetchedAt: new Date().toISOString(), files: featureFiles },
    excluded: built.excluded,
    permissions: built.permissions,
  };
  writeFileSync(PermissionCatalog.defaultPath, `${JSON.stringify(document, null, 2)}\n`);

  console.log(`wrote ${PermissionCatalog.defaultPath}`);
  console.log(`permissions: ${built.permissions.length}`);
  console.log(`excluded private: ${built.excluded.private.length}, allowlist-only: ${built.excluded.allowlistOnly.length}, not API permissions: ${built.excluded.notApiPermissions.join(', ')}`);
}

await main();
