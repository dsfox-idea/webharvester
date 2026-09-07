/**
 * Regenerates extension/manifest.json from catalog/permissions.json minus
 * catalog/non-working.json. `--full` ignores the non-working list (use it to
 * re-measure a browser, then `npm run mark-non-working`).
 */
import { readFileSync } from 'node:fs';
import { PermissionCatalog } from '../src/catalog.ts';
import { ManifestBuilder } from '../src/manifest-builder.ts';
import { ExtensionIdentity } from '../src/extension-id.ts';
import { NonWorkingList } from '../src/non-working.ts';

const full = process.argv.includes('--full');
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string };
const nonWorking = full ? NonWorkingList.empty() : NonWorkingList.load();
const builder = new ManifestBuilder(PermissionCatalog.load(), nonWorking, ManifestBuilder.readPublicKey(), pkg.version);
builder.write();
const manifest = builder.build();
console.log(
  `wrote ${ManifestBuilder.manifestPath}: ${manifest.permissions.length} permissions` +
    (full ? ' (full)' : `, ${nonWorking.names.length} non-working left out`) +
    `, id ${ExtensionIdentity.fromManifest(manifest)}`,
);
