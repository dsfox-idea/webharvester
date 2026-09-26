# Backlog

## Submit the plugin to the community marketplace (deferred)

Deferred on 2026-09-08. Submit `web-harvester` to Anthropic's
community marketplace when ready.

- Channel: the in-app form only. Console (individual authors):
  `platform.claude.com/plugins/submit`; or claude.ai (Team/Enterprise with
  directory management): `claude.ai/admin-settings/directory/submissions/plugins/new`.
- It feeds `claude-plugins-community` after review + automated safety screening,
  then the public catalog syncs nightly and pins a commit SHA (CI bumps it on push).
- The official marketplace `claude-plugins-official` is Anthropic-curated; there
  is no application and the form does not add to it.
- Not automatable here: the form is authenticated under the owner's Anthropic
  account; there is no submission connector/tool.

Ready-to-paste values (validation `claude plugin validate ./plugin --strict`
passes):

| Field | Value |
| --- | --- |
| Repo | https://github.com/dsfox-idea/webharvester |
| Plugin subdir | `plugin` |
| Name | `web-harvester` |
| Category | reference (or developer-tools) |
| Homepage | https://webharvester.org |
| License | MIT |

Before submitting: run `claude plugin validate ./plugin --strict`, and if the
permission set was re-measured, `npm run build-guides` first.

## Defects found in the 2026-09-23 project review (not fixed)

- **`setup.ps1` ignores native command failures.** `$ErrorActionPreference =
  'Stop'` does not apply to external programs (PowerShell 7.6:
  `$PSNativeCommandUseErrorActionPreference` is `False`). So
  `try { claude plugin marketplace add } catch { ... update }` never reaches
  `catch`, and in `-Measure` a failed `npm install` / `test:live` still runs
  `mark-non-working`, `build-manifest` and `build-guides` on a stale or
  missing report. `setup.sh` chains the same steps with `&&` and stops.
- **Wrong Node minimum.** `setup.sh` and `setup.ps1` ask for "Node 20+", but
  `node scripts/*.ts` needs built-in type stripping, on by default only since
  Node 22.18 / 23.6. `package.json` has no `engines`.
- **Broken install command in `plugin/README.md`.**
  `claude plugin install web-harvester --marketplace <this-repo>`: the CLI has
  no `--marketplace` option; the root README's
  `claude plugin install web-harvester@webharvester` is the working form.
- **`--load-extension` advice contradicts CLAUDE.md.** README ("Two ways to
  use", "Install") offers `--load-extension=extension` for any Chromium
  browser, while CLAUDE.md records that branded Chrome 137+ ignores it.
