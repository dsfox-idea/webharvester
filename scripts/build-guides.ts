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

const skillDir = fileURLToPath(new URL('../plugin/skills/web-discover', import.meta.url));
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
name: web-discover
description: Explore and act on the live web through the user's own real, logged-in browser — with their cookies and sessions and none of the headless or bot-wall limits of a plain fetch. Take screenshots, read a page and move or capture data between tabs, click and fill forms on the user's behalf, open and close tabs, and check pages on a timer — so Claude Code can act autonomously on the user's behalf and carry a task through on real sites end to end. Use whenever a task needs to SEE or DO something on a real website as the user would: inspect or extract from a page that needs a login, act inside a web app, capture what is on screen, monitor a page over time, or drive a multi-tab flow — instead of a plain HTTP fetch, a web search, or a headless browser. This is the capability reference for the bundled all-permissions browser extension (web-harvester / Growser --enable-webharvester).
---

# web-discover

Let Claude Code explore and act on the live web the way the user does — in the
user's real, logged-in browser instead of a sandboxed fetch, a headless
session, or a web search. With the user's own cookies and sessions and none of
the headless / bot-wall limits, it can take screenshots, read a page and move
or capture data between tabs, click and fill forms on the user's behalf, open
and close tabs, and check pages on a timer. The point is to let Claude Code act
autonomously: see the web through the user's eyes and take the actions a task
needs on its own — carrying it through end to end rather than handing steps
back to the user.

Under the hood this is the **web-harvester** browser extension, which holds
every capability a Chromium extension can. This skill is the capability
reference: one short guide per permission the extension actually gets, so
Claude knows which capability to reach for. Each guide has two parts:

- **Interface** — the official description, functions and events, taken from
  the Chromium API schema (\`_permission_features.json\` and the \`*.json\` /
  \`*.idl\` / \`*.webidl\` files developer.chrome.com is generated from), at
  Chromium revision \`${catalog.source.revision}\`.
- **What it's for (broad)** — an authored note on what the capability enables
  in the widest sense.

Measured in ${measured.versionLine || 'the target browser'} (Chromium ${measured.chromiumVersion || 'unknown'})${measured.measuredAt ? ` on ${measured.measuredAt.slice(0, 10)}` : ''}.

## Running webharvester

The webharvester extension (which declares every working permission) can run
two ways:

- **Standalone, manual.** Load the extension into any Chromium browser:
  chrome://extensions -> Developer mode -> Load unpacked, or launch with
  \`--load-extension=<path>\`. Install this skill/plugin separately. A
  command-line-loaded unpacked extension does not persist across restarts, so
  either keep launching with the flag or use the one-time Load unpacked.
- **With Growser (default).** [Growser](https://growser.org) is the default
  browser of the webharvester tool for Claude Code (Windows, macOS, Linux). It
  ships the extension bundled and enables it with a single launch argument,
  \`--enable-webharvester\` — no unpacked-extension step, and it persists like a
  normal installed extension. This is the out-of-the-box path.

To set either up, run the repo's \`setup.sh\` (macOS/Linux) or \`setup.ps1\`
(Windows); \`--measure\` / \`-Measure\` installs Growser and regenerates these
guides from that browser.

## How to use

Reach for a capability by what the task needs, then open its reference for the
exact API and use note:

- **Act as the user in a page** — \`scripting\`, \`userScripts\`, \`tabs\`, \`debugger\`, \`activeTab\`.
- **Capture what is on screen** — \`tabCapture\`, \`desktopCapture\`, \`pageCapture\`, \`favicon\`.
- **Move or keep data** — \`storage\`, \`unlimitedStorage\`, \`cookies\`, \`downloads\`, \`clipboardRead\`/\`clipboardWrite\`.
- **Reach across the browser** — \`tabGroups\`, \`sessions\`, \`history\`, \`bookmarks\`, \`sidePanel\`, \`webNavigation\`.
- **Watch or wait** — \`alarms\`, \`idle\`, \`webRequest\`, \`declarativeNetRequest\`.
- **Reach local software or identity** — \`nativeMessaging\`, \`identity\`, \`proxy\`.

The two tables below list every capability the extension gets here and the ones
this browser/OS refuses.

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
