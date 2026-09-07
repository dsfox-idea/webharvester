import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Channel } from './availability.ts';

/**
 * Mirrors chrome/common/channel_info_mac.mm: a bundle without KSProductID is
 * not Keystone-enabled and reports Channel::UNKNOWN (that is what Chromium and
 * Chrome for Testing do); otherwise KSChannelID names the channel, absent or
 * "arm64"/"universal" meaning stable.
 */
export class MacBundleChannelDetector {
  detect(executablePath: string): Channel | undefined {
    const bundle = MacBundleChannelDetector.bundlePath(executablePath);
    if (!bundle) return undefined;
    const plist = join(bundle, 'Contents', 'Info.plist');
    if (!existsSync(plist)) return undefined;
    const info = JSON.parse(execFileSync('plutil', ['-convert', 'json', '-o', '-', plist], { encoding: 'utf8' })) as Record<string, unknown>;
    if (!info.KSProductID) return 'unknown';
    return MacBundleChannelDetector.parseChannelId(typeof info.KSChannelID === 'string' ? info.KSChannelID : '');
  }

  static parseChannelId(channelId: string): Channel {
    if (channelId === '' || channelId === 'arm64' || channelId === 'universal') return 'stable';
    const name = channelId.replace(/^(arm64|universal)-/, '');
    if (name === 'extended') return 'stable';
    if (name === 'beta' || name === 'dev' || name === 'canary') return name;
    return 'unknown';
  }

  private static bundlePath(executablePath: string): string | undefined {
    const match = /^(.*?\.app)\/Contents\/MacOS\//.exec(executablePath);
    return match?.[1];
  }
}

/** Picks the right detector for the host; returns undefined when the channel cannot be read. */
export class ChannelDetector {
  detect(executablePath: string): Channel | undefined {
    if (process.platform === 'darwin') return new MacBundleChannelDetector().detect(executablePath);
    return undefined;
  }
}
