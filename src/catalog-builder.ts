import type { CatalogEntry, CatalogExclusions, FeatureAlternative, FeatureDocument } from './catalog.ts';

export interface BuiltCatalog {
  permissions: CatalogEntry[];
  excluded: CatalogExclusions;
}

/**
 * Derives the list of manifest-declarable extension permissions from Chromium's
 * `_permission_features.json` documents. Mirrors what
 * `extensions/common/manifest_handlers/permissions_parser.cc` accepts for a
 * regular extension: a name must be an API permission, must have at least one
 * alternative for `extension_types: ["extension"]`, and must not be gated
 * exclusively behind a Google-internal allowlist.
 */
export class CatalogBuilder {
  /**
   * Names that appear in `_permission_features.json` for extensions but are not
   * API permissions (absent from `extensions_api_permissions.cc` and
   * `chrome_api_permissions.cc`), so they cannot be declared in a manifest.
   */
  static readonly notApiPermissions: readonly string[] = ['plugin', 'runtime'];

  private readonly documents: FeatureDocument[];

  constructor(documents: FeatureDocument[]) {
    this.documents = documents;
  }

  build(): BuiltCatalog {
    const merged = this.mergeDocuments();
    const excluded: CatalogExclusions = { private: [], allowlistOnly: [], notApiPermissions: [] };
    const permissions: CatalogEntry[] = [];

    for (const name of [...merged.keys()].sort()) {
      const alternatives = merged.get(name)!.filter(CatalogBuilder.appliesToExtensions);
      if (alternatives.length === 0) continue;
      if (CatalogBuilder.isPrivate(name)) {
        excluded.private.push(name);
      } else if (alternatives.every((alternative) => (alternative.allowlist?.length ?? 0) > 0)) {
        excluded.allowlistOnly.push(name);
      } else if (CatalogBuilder.notApiPermissions.includes(name)) {
        excluded.notApiPermissions.push(name);
      } else {
        permissions.push({ name, alternatives });
      }
    }
    return { permissions, excluded };
  }

  private mergeDocuments(): Map<string, FeatureAlternative[]> {
    const merged = new Map<string, FeatureAlternative[]>();
    for (const document of this.documents) {
      for (const [name, value] of Object.entries(document)) {
        merged.set(name, Array.isArray(value) ? value : [value]);
      }
    }
    return merged;
  }

  private static appliesToExtensions(alternative: FeatureAlternative): boolean {
    return (alternative.extension_types ?? []).includes('extension');
  }

  private static isPrivate(name: string): boolean {
    return name.endsWith('Private') || name.includes('Private.');
  }
}
