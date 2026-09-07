# system.display

**Permission string:** `system.display`
**API namespace:** `chrome.system.display`

## Interface (Chromium 153.0.8010.18)

Use the `system.display` API to query display metadata.

**Functions**
- `system.display.getInfo()` — Requests the information for all attached display devices.
- `system.display.getDisplayLayout()` — NOTE: This is only available to ChromeOS Kiosk apps.
- `system.display.setDisplayProperties()` — NOTE: This is only available to ChromeOS Kiosk apps.
- `system.display.setDisplayLayout()` — NOTE: This is only available to ChromeOS Kiosk apps.
- `system.display.enableUnifiedDesktop()` — NOTE: This is only available to ChromeOS Kiosk apps.
- `system.display.overscanCalibrationStart()` — NOTE: This is only available to ChromeOS Kiosk apps.
- `system.display.overscanCalibrationAdjust()` — NOTE: This is only available to ChromeOS Kiosk apps.
- `system.display.overscanCalibrationReset()` — NOTE: This is only available to ChromeOS Kiosk apps.
- `system.display.overscanCalibrationComplete()` — NOTE: This is only available to ChromeOS Kiosk apps.
- `system.display.showNativeTouchCalibration()` — NOTE: This is only available to ChromeOS Kiosk apps.
- `system.display.startCustomTouchCalibration()` — NOTE: This is only available to ChromeOS Kiosk apps.
- `system.display.completeCustomTouchCalibration()` — NOTE: This is only available to ChromeOS Kiosk apps.
- `system.display.clearTouchCalibration()` — NOTE: This is only available to ChromeOS Kiosk apps.
- `system.display.setMirrorMode()` — NOTE: This is only available to ChromeOS Kiosk apps.

**Events**
- `system.display.onDisplayChanged` — Fired when anything changes to the display configuration.

## What it's for (broad)

Enumerate displays with geometry, DPI, rotation, and work area. Broadly: multi-monitor window placement, presentation/kiosk layout, and screen-aware capture and UI.
