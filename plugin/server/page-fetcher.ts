import type { OpenTab, TabHandle } from './extension-tabs.ts';
import { HumanCheckGate } from './human-check-gate.ts';
import { log } from './log.ts';
import type { AskUser } from './mcp-server.ts';
import { PageScripts, type PageSnapshot } from './page-scripts.ts';

/** What reading a page needs from the browser. */
export interface ReadableTabs {
  open(url: string): Promise<OpenTab>;
  read<T>(tabId: number, pageFunction: string, args?: readonly unknown[]): Promise<T>;
  waitForLoad(tabId: number): Promise<void>;
  close(tab: TabHandle): Promise<void>;
  reveal(tabId: number): Promise<void>;
}

/** A snapshot and when it was read (epoch ms). */
export interface ReadPage {
  page: PageSnapshot;
  readAt: number;
}

/** Interstitials that ask the visitor to prove they are human instead of showing the page. */
export class HumanCheck {
  private static readonly titles = /^(just a moment|attention required|verify you are human|are you a robot|security check|checking your browser|один момент|проверка)/i;
  private static readonly phrases = /verify you are human|confirm you are (a )?human|are you a robot|checking your browser|complete the security check|вы не робот/i;
  /** A real article may mention these phrases; an interstitial is short. */
  private static readonly interstitialMaxLength = 3_000;

  static detect(page: Pick<PageSnapshot, 'title' | 'text' | 'challengeFrame'>): boolean {
    if (page.challengeFrame || HumanCheck.titles.test(page.title.trim())) return true;
    return page.text.length <= HumanCheck.interstitialMaxLength && HumanCheck.phrases.test(page.text);
  }
}

/**
 * Reads a page in a visible tab of the user's Growser, with the user's session.
 * A human check is never answered here: HumanCheckGate hands it to the user.
 * Snapshots are kept for 15 minutes (as the built-in WebFetch caches pages) so
 * that reading the rest of a long page does not open it again.
 */
export class PageFetcher {
  static readonly settleTimeoutMs = 5_000;
  static readonly cacheTtlMs = 15 * 60_000;
  static readonly cacheSize = 20;

  private readonly tabs: ReadableTabs;
  private readonly now: () => number;
  private readonly cache = new Map<string, ReadPage>();

  constructor(tabs: ReadableTabs, now: () => number = Date.now) {
    this.tabs = tabs;
    this.now = now;
  }

  /** `reuse`: a snapshot of this URL from the last 15 minutes will do (continuing a long page). */
  async fetch(url: string, reuse = false, askUser: AskUser = HumanCheckGate.cannotAsk): Promise<ReadPage> {
    const cached = this.cache.get(url);
    if (reuse && cached && this.now() - cached.readAt < PageFetcher.cacheTtlMs) {
      log(`fetch ${url}: reusing the snapshot read ${Math.round((this.now() - cached.readAt) / 1000)} s ago`);
      return cached;
    }
    const read = { page: await this.read(url, askUser), readAt: this.now() };
    this.cache.delete(url);
    this.cache.set(url, read);
    if (this.cache.size > PageFetcher.cacheSize) this.cache.delete(this.cache.keys().next().value!);
    return read;
  }

  private async read(url: string, askUser: AskUser): Promise<PageSnapshot> {
    const tab = await this.tabs.open(url);
    const first = await this.snapshot(tab);
    const page = await new HumanCheckGate(this.tabs, askUser).pass(tab, first.url, first, HumanCheck.detect, () => this.snapshot(tab), 'web_fetch');
    await this.tabs.close(tab);
    if (page.contentType === 'application/pdf') throw new Error(`${page.url} is a PDF; web_fetch reads HTML and text pages only`);
    log(`fetch ${url}: ${page.contentType}, ${page.scope} content, ${page.text.length} chars, ${page.links.length} links`);
    return page;
  }

  /** Reads the tab; a tab that cannot be read is closed. */
  private async snapshot(tab: OpenTab): Promise<PageSnapshot> {
    try {
      return await this.tabs.read<PageSnapshot>(tab.tabId, PageScripts.snapshot, [PageFetcher.settleTimeoutMs]);
    } catch (error) {
      await this.tabs.close(tab).catch(() => undefined);
      throw new Error(`Could not read ${tab.url} in Growser: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
