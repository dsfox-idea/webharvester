# userScripts

**Permission string:** `userScripts`
**API namespace:** `chrome.userScripts`

## Interface (Chromium 153.0.8010.18)

Use the `userScripts` API to execute user scripts in the User Scripts context.

**Functions**
- `userScripts.register()` — Registers one or more user scripts for this extension.
- `userScripts.getScripts()` — Returns all dynamically-registered user scripts for this extension.
- `userScripts.unregister()` — Unregisters all dynamically-registered user scripts for this extension.
- `userScripts.update()` — Updates one or more user scripts for this extension.
- `userScripts.execute()` — Injects a script into a target context.
- `userScripts.configureWorld()` — Configures the `USER_SCRIPT` execution environment.
- `userScripts.getWorldConfigurations()` — Retrieves all registered world configurations.
- `userScripts.resetWorldConfiguration()` — Resets the configuration for a user script world.

## What it's for (broad)

Register and run arbitrary user-provided scripts in page contexts, including the MAIN world, through a dedicated API. Broadly: userscript managers and any platform that lets users bring their own page-modifying code (subject to the developer-mode/user-scripts toggle).
