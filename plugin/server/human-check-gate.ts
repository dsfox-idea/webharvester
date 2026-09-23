import type { TabHandle } from './extension-tabs.ts';
import { type BuiltInTool, FallbackPass } from './fallback-pass.ts';
import { log } from './log.ts';

export interface GateTabs {
  reveal(tabId: number): Promise<void>;
  close(tab: TabHandle): Promise<void>;
  waitForLoad(tabId: number): Promise<void>;
}

/** The built-in tool that may repeat the call if the check stays, and the host it may reach. */
export interface Fallback {
  tool: BuiltInTool;
  host?: string;
}

/**
 * What happens when a site answers with a human check (CAPTCHA) instead of the
 * page: the tab is shown and read again for up to 15 s, which is enough for a
 * check that clears by itself or that the user completes in Growser. A check
 * that stays closes the tab and lets the built-in tool repeat the call; the
 * session is never stopped to ask. The check itself is never answered here.
 */
export class HumanCheckGate {
  static readonly waitMs = 15_000;
  static readonly pollMs = 1_000;

  private readonly tabs: GateTabs;
  private readonly fallbackPass: FallbackPass;
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(
    tabs: GateTabs,
    fallbackPass: FallbackPass = new FallbackPass(),
    now: () => number = Date.now,
    sleep: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  ) {
    this.tabs = tabs;
    this.fallbackPass = fallbackPass;
    this.now = now;
    this.sleep = sleep;
  }

  /** Resolves with the first reading that is not a check. */
  async pass<T>(tab: TabHandle, site: string, first: T, isCheck: (reading: T) => boolean, reread: () => Promise<T>, fallback: Fallback): Promise<T> {
    if (!isCheck(first)) return first;
    log(`${site}: human check, waiting up to ${HumanCheckGate.waitMs} ms`);
    await this.tabs.reveal(tab.tabId);
    const deadline = this.now() + HumanCheckGate.waitMs;
    while (this.now() < deadline) {
      await this.sleep(HumanCheckGate.pollMs);
      await this.tabs.waitForLoad(tab.tabId);
      const reading = await reread();
      if (!isCheck(reading)) {
        log(`${site}: human check cleared`);
        return reading;
      }
    }
    await this.tabs.close(tab).catch(() => undefined);
    this.fallbackPass.grant(fallback.tool, fallback.host);
    const scope = fallback.host ? ` for ${fallback.host}` : '';
    log(`${site}: human check stayed, ${fallback.tool} allowed${scope}`);
    throw new Error(
      `${site} showed a human check (CAPTCHA) that did not clear within ${HumanCheckGate.waitMs / 1000} s; the tab was closed. ` +
        `Repeat this call with the built-in ${fallback.tool}: the web-harvester hook allows it${scope} for ${FallbackPass.ttlMs / 60_000} minutes. ` +
        'Never solve a human check yourself.',
    );
  }
}
