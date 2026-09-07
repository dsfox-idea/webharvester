# downloads

**Permission string:** `downloads`
**API namespace:** `chrome.downloads`

## Interface (Chromium 153.0.8010.18)

Use the `chrome.downloads` API to programmatically initiate, monitor, manipulate, and search for downloads.

**Functions**
- `downloads.download()` — Download a URL.
- `downloads.search()` — Find `DownloadItem`.
- `downloads.pause()` — Pause the download.
- `downloads.resume()` — Resume a paused download.
- `downloads.cancel()` — Cancel a download.
- `downloads.getFileIcon()` — Retrieve an icon for the specified download.
- `downloads.open()` — Opens the downloaded file now if the `DownloadItem` is complete; otherwise returns an error through `runtime.lastError`.
- `downloads.show()` — Show the downloaded file in its folder in a file manager.
- `downloads.showDefaultFolder()` — Show the default Downloads folder in a file manager.
- `downloads.erase()` — Erase matching `DownloadItem` from history without deleting the downloaded file.
- `downloads.removeFile()` — Remove the downloaded file if it exists and the `DownloadItem` is complete; otherwise return an error through `runtime.lastError`.
- `downloads.acceptDanger()` — Prompt the user to accept a dangerous download.
- `downloads.setShelfEnabled()` — Enable or disable the gray shelf at the bottom of every window associated with the current browser profile.
- `downloads.setUiOptions()` — Change the download UI of every window associated with the current browser profile.

**Events**
- `downloads.onCreated` — This event fires with the `DownloadItem` object when a download begins.
- `downloads.onErased` — Fires with the `downloadId` when a download is erased from history.
- `downloads.onChanged` — When any of a `DownloadItem`'s properties except `bytesReceived` and `estimatedEndTime` changes, this event fires with the `downloadId` and an object containing the properties that changed.
- `downloads.onDeterminingFilename` — During the filename determination process, extensions will be given the opportunity to override the target `DownloadItem.filename`.

## What it's for (broad)

Programmatically start, search, pause, resume, cancel, and inspect downloads, and react to their lifecycle. Broadly: download managers, bulk/batch downloaders, "save all" and archiving tools, and pipelines that fetch generated files to disk.
