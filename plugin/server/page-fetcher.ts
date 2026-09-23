import type { OpenTab, TabHandle } from './extension-tabs.ts';
import { log } from './log.ts';
import { PageScripts, type PageSnapshot } from './page-scripts.ts';

/** What reading a page needs from the browser. */
export interface ReadableTabs {
  open(url: string): Promise<OpenTab>;
  read<T>(tabId: number, pageFunction: string, args?: readonly unknown[]): Promise<T>;
  close(tab: TabHandle): Promise<void>;
  reveal(tabId: number): Promise<void>;
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
 * A human check is never answered here: the tab is left open for the user.
 */
export class PageFetcher {
  static readonly settleTimeoutMs = 5_000;

  private readonly tabs: ReadableTabs;

  constructor(tabs: ReadableTabs) {
    this.tabs = tabs;
  }

  async fetch(url: string): Promise<PageSnapshot> {
    const tab = await this.tabs.open(url);
    let page: PageSnapshot;
    try {
      page = await this.tabs.read<PageSnapshot>(tab.tabId, PageScripts.snapshot, [PageFetcher.settleTimeoutMs]);
    } catch (error) {
      await this.tabs.close(tab).catch(() => undefined);
      throw new Error(`Could not read ${tab.url} in Growser: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (HumanCheck.detect(page)) {
      await this.tabs.reveal(tab.tabId);
      log(`fetch ${url}: human check, tab ${tab.tabId} left open for the user`);
      throw new Error(
        `${page.url} answered with a human check (CAPTCHA) instead of the page. It is open in the active Growser tab. ` +
          'Do not try to solve it: ask the user to complete it there, then run web_fetch again.',
      );
    }
    await this.tabs.close(tab);
    if (page.contentType === 'application/pdf') throw new Error(`${page.url} is a PDF; web_fetch reads HTML and text pages only`);
    log(`fetch ${url}: ${page.contentType}, ${page.text.length} chars, ${page.links.length} links`);
    return page;
  }
}
