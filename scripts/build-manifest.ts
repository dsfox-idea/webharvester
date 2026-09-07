/** Regenerates extension/manifest.json from catalog/permissions.json. */
import { readFileSync } from 'node:fs';
import { PermissionCatalog } from '../src/catalog.ts';
import { ManifestBuilder } from '../src/manifest-builder.ts';
import { ExtensionIdentity } from '../src/extension-id.ts';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string };
const builder = new ManifestBuilder(PermissionCatalog.load(), ManifestBuilder.readPublicKey(), pkg.version);
builder.write();
const manifest = builder.build();
console.log(`wrote ${ManifestBuilder.manifestPath}: ${manifest.permissions.length} permissions, id ${ExtensionIdentity.fromManifest(manifest)}`);
