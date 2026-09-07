import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** One availability alternative of a Chromium feature (a SimpleFeature). */
export interface FeatureAlternative {
  channel?: 'stable' | 'beta' | 'dev' | 'canary' | 'trunk';
  extension_types?: string[];
  platforms?: string[];
  location?: 'component' | 'external_component' | 'policy' | 'unpacked';
  allowlist?: string[];
  blocklist?: string[];
  min_manifest_version?: number;
  max_manifest_version?: number;
  session_types?: string[];
  feature_flag?: string;
  command_line_switch?: string;
  dependencies?: string[];
  developer_mode_only?: boolean;
}

/** A raw `_permission_features.json` document: name -> feature or list of alternatives. */
export type FeatureDocument = Record<string, FeatureAlternative | FeatureAlternative[]>;

export interface CatalogEntry {
  name: string;
  alternatives: FeatureAlternative[];
}

export interface CatalogSource {
  repository: string;
  revision: string;
  fetchedAt: string;
  files: string[];
}

export interface CatalogExclusions {
  private: string[];
  allowlistOnly: string[];
  notApiPermissions: string[];
}

export interface CatalogDocument {
  source: CatalogSource;
  excluded: CatalogExclusions;
  permissions: CatalogEntry[];
}

/** The single source of the permission list in this repo: `catalog/permissions.json`. */
export class PermissionCatalog {
  static readonly defaultPath = fileURLToPath(new URL('../catalog/permissions.json', import.meta.url));

  private readonly document: CatalogDocument;
  private readonly byName: Map<string, CatalogEntry>;

  constructor(document: CatalogDocument) {
    this.document = document;
    this.byName = new Map(document.permissions.map((entry) => [entry.name, entry]));
  }

  static load(path: string = PermissionCatalog.defaultPath): PermissionCatalog {
    return new PermissionCatalog(JSON.parse(readFileSync(path, 'utf8')) as CatalogDocument);
  }

  get source(): CatalogSource {
    return this.document.source;
  }

  get excluded(): CatalogExclusions {
    return this.document.excluded;
  }

  get entries(): CatalogEntry[] {
    return [...this.document.permissions];
  }

  get names(): string[] {
    return this.document.permissions.map((entry) => entry.name);
  }

  entry(name: string): CatalogEntry {
    const entry = this.byName.get(name);
    if (!entry) throw new Error(`Permission "${name}" is not in the catalog`);
    return entry;
  }

  has(name: string): boolean {
    return this.byName.has(name);
  }
}
