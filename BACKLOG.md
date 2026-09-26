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
