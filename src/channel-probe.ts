import type { BrowserContext } from '@playwright/test';
import type { Channel } from './availability.ts';

/**
 * Measures the browser's release channel instead of reading branding files:
 * `system.storage.getAvailableCapacity` is the one extension API that is
 * gated only by channel (`"channel": "dev"` in _api_features.json) and needs
 * no permission beyond `system.storage`. Its presence means the channel is
 * dev, canary or unknown (Chromium, Chrome for Testing, developer builds of
 * Brave-based browsers); its absence means beta or stable. The static test
 * "two channel buckets suffice" proves the catalog needs no finer split.
 */
export class ChannelProbe {
  static async detect(context: BrowserContext, extensionId: string): Promise<Channel> {
    const page = await context.newPage();
    try {
      await page.goto(`chrome-extension://${extensionId}/probe.html`);
      const devApiPresent = await page.evaluate(
        () => typeof (globalThis as unknown as { chrome: { system?: { storage?: { getAvailableCapacity?: unknown } } } }).chrome.system?.storage?.getAvailableCapacity === 'function',
      );
      return devApiPresent ? 'unknown' : 'stable';
    } finally {
      await page.close();
    }
  }
}
