# management

**Permission string:** `management`
**API namespace:** `chrome.management`

## Interface (Chromium 153.0.8010.18)

The `chrome.management` API provides ways to manage installed apps and extensions.

**Functions**
- `management.getAll()` — Returns a list of information about installed extensions and apps.
- `management.get()` — Returns information about the installed extension, app, or theme that has the given ID.
- `management.getSelf()` — Returns information about the calling extension, app, or theme.
- `management.getPermissionWarningsById()` — Returns a list of permission warnings for the given extension id.
- `management.getPermissionWarningsByManifest()` — Returns a list of permission warnings for the given extension manifest string.
- `management.setEnabled()` — Enables or disables an app or extension.
- `management.uninstall()` — Uninstalls a currently installed app or extension.
- `management.uninstallSelf()` — Uninstalls the calling extension.
- `management.launchApp()` — Launches an application.
- `management.createAppShortcut()` — Display options to create shortcuts for an app.
- `management.setLaunchType()` — Set the launch type of an app.
- `management.generateAppForLink()` — Generate an app for a URL.
- `management.installReplacementWebApp()` — Launches the replacement_web_app specified in the manifest.

**Events**
- `management.onInstalled` — Fired when an app or extension has been installed.
- `management.onUninstalled` — Fired when an app or extension has been uninstalled.
- `management.onEnabled` — Fired when an app or extension has been enabled.
- `management.onDisabled` — Fired when an app or extension has been disabled.

## What it's for (broad)

Enumerate installed extensions and apps and query/react to the extension's own install state and launch. Broadly: security and compliance inventory, conflict detection, enterprise self-management, and launcher/dashboard UIs.
