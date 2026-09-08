# printerProvider

**Permission string:** `printerProvider`
**API namespace:** `chrome.printerProvider`

## Interface (Chromium 153.0.8010.18)

The `chrome.printerProvider` API exposes events used by print manager to query printers controlled by extensions, to query their capabilities and to submit print jobs to these printers.

**Events**
- `printerProvider.onGetPrintersRequested` — Event fired when print manager requests printers provided by extensions.
- `printerProvider.onGetUsbPrinterInfoRequested` — Event fired when print manager requests information about a USB device that may be a printer.
- `printerProvider.onGetCapabilityRequested` — Event fired when print manager requests printer capabilities.
- `printerProvider.onPrintRequested` — Event fired when print manager requests printing.

## What it's for (broad)

Implement a printer: receive print jobs and report capabilities to the browser. Broadly: bridge the browser to cloud, virtual, or otherwise non-native printers and "print to" pipelines.
