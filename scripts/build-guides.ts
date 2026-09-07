/**
 * Generates the Claude Code plugin: one Markdown guide per working permission
 * (official Chromium interface + authored broad-use note) and the skill index.
 * Schemas are read from Chromium at the revision recorded in
 * catalog/permissions.json, so the plugin regenerates deterministically.
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GuideBuilder, GuideIndex } from '../src/guide-builder.ts';
import { GitilesRepository } from '../src/gitiles.ts';
import { ManifestBuilder } from '../src/manifest-builder.ts';
import { NonWorkingList } from '../src/non-working.ts';
import { PermissionCatalog } from '../src/catalog.ts';

const skillDir = fileURLToPath(new URL('../plugin/skills/chromium-extension-apis', import.meta.url));
const referencesDir = join(skillDir, 'references');

async function main(): Promise<void> {
  const catalog = PermissionCatalog.load();
  const nonWorking = NonWorkingList.load();
  const declared = ManifestBuilder.readManifest().permissions;
  const gitiles = new GitilesRepository();
  const builder = new GuideBuilder({
    chromiumRevision: catalog.source.revision,
    chromiumVersion: nonWorking.measuredIn.chromiumVersion || catalog.source.revision.slice(0, 12),
    readFile: (path) => gitiles.file(path, catalog.source.revision),
  });

  mkdirSync(referencesDir, { recursive: true });
  for (const file of readdirSync(referencesDir)) rmSync(join(referencesDir, file));

  const rows: Array<{ permission: string; namespace: string; fileSlug: string }> = [];
  for (const permission of declared) {
    const guide = await builder.build(permission);
    writeFileSync(join(referencesDir, `${guide.fileSlug}.md`), guide.markdown);
    rows.push(GuideIndex.row(permission));
    console.log(`  ${permission} -> references/${guide.fileSlug}.md`);
  }

  writeFileSync(join(skillDir, 'SKILL.md'), renderSkill(rows, nonWorking, catalog));
  console.log(`wrote ${declared.length} guides and SKILL.md`);
}

function renderSkill(
  rows: Array<{ permission: string; namespace: string; fileSlug: string }>,
  nonWorking: NonWorkingList,
  catalog: PermissionCatalog,
): string {
  const measured = nonWorking.measuredIn;
  const table = rows.map((r) => `| \`${r.permission}\` | \`${r.namespace}\` | [${r.fileSlug}](references/${r.fileSlug}.md) |`).join('\n');
  const nonWorkingTable = nonWorking.permissions
    .map((p) => `| \`${p.name}\` | ${p.reason} | ${p.detail} |`)
    .join('\n');
  return `---
name: chromium-extension-apis
description: Reference for Chromium extension permissions that actually work on this machine — each permission's official API interface plus what it can be used for in the broadest sense. Use when choosing, explaining, or reviewing Chromium/Chrome/Brave extension permissions, deciding which permission an automation needs, or auditing what an extension could do.
---

# Chromium Extension APIs

One short guide per extension permission that a real browser here actually
grants, measured with the webharvester extension. Each guide has two parts:

- **Interface** — the official description, functions and events, taken from
  the Chromium API schema (\`_permission_features.json\` and the \`*.json\` /
  \`*.idl\` / \`*.webidl\` files developer.chrome.com is generated from), at
  Chromium revision \`${catalog.source.revision}\`.
- **What it's for (broad)** — an authored note on what the permission can do
  in the widest sense.

Measured in ${measured.versionLine || 'the target browser'} (Chromium ${measured.chromiumVersion || 'unknown'})${measured.measuredAt ? ` on ${measured.measuredAt.slice(0, 10)}` : ''}.

## How to use

Look up a permission in the table and open its reference file for the full
interface and use note. To pick a permission for a task, scan the "What it's
for" notes; to review an extension, read the guides for the permissions it
declares.

## Working permissions (${rows.length})

| Permission | Namespace | Guide |
| --- | --- | --- |
${table}

## Not granted here (${nonWorking.permissions.length})

Declared by the full extension but refused by this browser/OS, so left out of
the shipped manifest. Regenerate for another browser with the webharvester
measurement flow.

| Permission | Reason | Detail |
| --- | --- | --- |
${nonWorkingTable}
`;
}

await main();
