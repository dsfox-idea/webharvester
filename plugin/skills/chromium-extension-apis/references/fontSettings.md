# fontSettings

**Permission string:** `fontSettings`
**API namespace:** `chrome.fontSettings`

## Interface (Chromium 153.0.8010.18)

Use the `chrome.fontSettings` API to manage Chrome's font settings.

**Functions**
- `fontSettings.clearFont()` — Clears the font set by this extension, if any.
- `fontSettings.getFont()` — Gets the font for a given script and generic font family.
- `fontSettings.setFont()` — Sets the font for a given script and generic font family.
- `fontSettings.getFontList()` — Gets a list of fonts on the system.
- `fontSettings.clearDefaultFontSize()` — Clears the default font size set by this extension, if any.
- `fontSettings.getDefaultFontSize()` — Gets the default font size.
- `fontSettings.setDefaultFontSize()` — Sets the default font size.
- `fontSettings.clearDefaultFixedFontSize()` — Clears the default fixed font size set by this extension, if any.
- `fontSettings.getDefaultFixedFontSize()` — Gets the default size for fixed width fonts.
- `fontSettings.setDefaultFixedFontSize()` — Sets the default size for fixed width fonts.
- `fontSettings.clearMinimumFontSize()` — Clears the minimum font size set by this extension, if any.
- `fontSettings.getMinimumFontSize()` — Gets the minimum font size.
- `fontSettings.setMinimumFontSize()` — Sets the minimum font size.

**Events**
- `fontSettings.onFontChanged` — Fired when a font setting changes.
- `fontSettings.onDefaultFontSizeChanged` — Fired when the default font size setting changes.
- `fontSettings.onDefaultFixedFontSizeChanged` — Fired when the default fixed font size setting changes.
- `fontSettings.onMinimumFontSizeChanged` — Fired when the minimum font size setting changes.

## What it's for (broad)

Read and set the browser's font families and sizes per generic family and script. Broadly: readability and accessibility tooling, theming, and enforcing typography defaults across a fleet.
