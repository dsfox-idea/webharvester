/**
 * Regenerates the permission catalog from Chromium.
 *   node scripts/sync-catalog.ts                 -> catalog/permissions.json from main HEAD
 *   node scripts/sync-catalog.ts <commit>        -> catalog/permissions.json from that commit
 *   node scripts/sync-catalog.ts --version 151.0.7445.82 -> catalog/versions/151.0.7445.82.json
 */
import { writeFileSync } from 'node:fs';
import { CatalogRepository } from '../src/catalog-repository.ts';
import { PermissionCatalog } from '../src/catalog.ts';
import { GitilesRepository } from '../src/gitiles.ts';

async function main(): Promise<void> {
  const gitiles = new GitilesRepository();
  const repository = new CatalogRepository(gitiles);
  const [first, second] = process.argv.slice(2);

  if (first === '--version') {
    if (!second) throw new Error('--version needs a Chromium version like 151.0.7445.82');
    const catalog = await repository.forVersion(second);
    console.log(`permissions in Chromium ${second}: ${catalog.names.length}`);
    return;
  }

  const revision = first ?? (await gitiles.headRevision());
  console.log(`Chromium revision ${revision}`);
  const document = await repository.build(revision);
  writeFileSync(PermissionCatalog.defaultPath, `${JSON.stringify(document, null, 2)}\n`);
  console.log(`wrote ${PermissionCatalog.defaultPath}`);
  console.log(`permissions: ${document.permissions.length}`);
  const excluded = document.excluded;
  console.log(
    `excluded private: ${excluded.private.length}, allowlist-only: ${excluded.allowlistOnly.length}, ` +
      `not API permissions: ${excluded.notApiPermissions.join(', ')}, internal: ${excluded.internal.join(', ')}, ` +
      `incompatible: ${excluded.incompatible.map((e) => e.name).join(', ')}`,
  );
}

await main();
