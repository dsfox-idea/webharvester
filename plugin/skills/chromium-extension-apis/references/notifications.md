# notifications

**Permission string:** `notifications`
**API namespace:** `chrome.notifications`

## Interface (Chromium 153.0.8010.18)

Use the `chrome.notifications` API to create rich notifications using templates and show these notifications to users in the system tray.

**Functions**
- `notifications.create()` — Creates and displays a notification.
- `notifications.update()` — Updates an existing notification.
- `notifications.clear()` — Clears the specified notification.
- `notifications.getAll()` — Retrieves all the notifications of this app or extension.
- `notifications.getPermissionLevel()` — Retrieves whether the user has enabled notifications from this app or extension.

**Events**
- `notifications.onClosed` — The notification closed, either by the system or by user action.
- `notifications.onClicked` — The user clicked in a non-button area of the notification.
- `notifications.onButtonClicked` — The user pressed a button in the notification.
- `notifications.onPermissionLevelChanged` — The user changes the permission level.
- `notifications.onShowSettings` — The user clicked on a link for the app's notification settings.

## What it's for (broad)

Create rich system notifications (text, image, list, progress, buttons) and handle their interactions. Broadly: alerting, reminders, job-complete and error surfacing, and any push of information the user should see outside the current tab.
