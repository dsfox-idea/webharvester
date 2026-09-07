import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CatalogBuilder } from './catalog-builder.ts';
import { PermissionCatalog, type CatalogDocument, type FeatureDocument } from './catalog.ts';
import { ChromiumJson } from './chromium-json.ts';
import { GitilesRepository } from './gitiles.ts';

/**
 * Catalogs come in two flavours: the main one (`catalog/permissions.json`,
 * Chromium main, the manifest is built from it) and per-browser-version ones
 * (`catalog/versions/<version>.json`, built from the matching Chromium release
 * tag) that tell what a given browser can know about at all.
 */
export class CatalogRepository {
  static readonly featureFiles = [
    'extensions/common/api/_permission_features.json',
    'chrome/common/extensions/api/_permission_features.json',
  ];
  static readonly versionsDir = fileURLToPath(new URL('../catalog/versions', import.meta.url));

  private readonly gitiles: GitilesRepository;

  constructor(gitiles: GitilesRepository = new GitilesRepository()) {
    this.gitiles = gitiles;
  }

  static versionPath(version: string): string {
    if (!/^\d+(\.\d+){3}$/.test(version)) throw new Error(`"${version}" is not a Chromium version like 151.0.7445.82`);
    return join(CatalogRepository.versionsDir, `${version}.json`);
  }

  main(): PermissionCatalog {
    return PermissionCatalog.load();
  }

  /** Catalog for the Chromium release the browser was built from; cached on disk after the first fetch. */
  async forVersion(version: string): Promise<PermissionCatalog> {
    const path = CatalogRepository.versionPath(version);
    if (existsSync(path)) return PermissionCatalog.load(path);
    const document = await this.build(`refs/tags/${version}`);
    mkdirSync(CatalogRepository.versionsDir, { recursive: true });
    writeFileSync(path, `${JSON.stringify(document, null, 2)}\n`);
    console.log(`[catalog] fetched Chromium ${version} permission features into ${path}`);
    return new PermissionCatalog(document);
  }

  /** Builds a catalog document from Chromium at `revision` (commit, refs/heads/..., refs/tags/...). */
  async build(revision: string): Promise<CatalogDocument> {
    const documents: FeatureDocument[] = [];
    for (const file of CatalogRepository.featureFiles) {
      documents.push(ChromiumJson.parse<FeatureDocument>(await this.gitiles.file(file, revision)));
    }
    const built = new CatalogBuilder(documents).build();
    return {
      source: { repository: this.gitiles.url, revision, fetchedAt: new Date().toISOString(), files: CatalogRepository.featureFiles },
      excluded: built.excluded,
      permissions: built.permissions,
    };
  }

  static readMain(): PermissionCatalog {
    return PermissionCatalog.load();
  }

  static exists(version: string): boolean {
    return existsSync(CatalogRepository.versionPath(version));
  }

  static readVersion(version: string): PermissionCatalog {
    return PermissionCatalog.load(CatalogRepository.versionPath(version));
  }

  static readFile(path: string): CatalogDocument {
    return JSON.parse(readFileSync(path, 'utf8')) as CatalogDocument;
  }
}
