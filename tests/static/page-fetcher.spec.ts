import { expect, test } from '@playwright/test';
import type { OpenTab, TabHandle } from '../../plugin/server/extension-tabs.ts';
import { HumanCheck, PageFetcher, type ReadableTabs } from '../../plugin/server/page-fetcher.ts';
import { PageScripts, type PageSnapshot } from '../../plugin/server/page-scripts.ts';

const article: PageSnapshot = {
  url: 'https://news.example/a',
  title: 'An article',
  contentType: 'text/html',
  text: 'Body text of the article.',
  scope: 'main',
  links: [{ text: 'Home', href: 'https://news.example/' }],
  challengeFrame: false,
};

/** Records the calls and serves one snapshot, or fails the read. */
class FakeTabs implements ReadableTabs {
  readonly calls: string[] = [];
  private readonly page: PageSnapshot | Error;

  constructor(page: PageSnapshot | Error) {
    this.page = page;
  }

  async open(url: string): Promise<OpenTab> {
    this.calls.push(`open ${url}`);
    return { tabId: 9, previousTabId: 2, url };
  }

  async read<T>(tabId: number, pageFunction: string, args: readonly unknown[] = []): Promise<T> {
    this.calls.push(`read ${tabId} ${pageFunction === PageScripts.snapshot ? 'snapshot' : 'other'} ${JSON.stringify(args)}`);
    if (this.page instanceof Error) throw this.page;
    return this.page as T;
  }

  async close(tab: TabHandle): Promise<void> {
    this.calls.push(`close ${tab.tabId} back to ${tab.previousTabId}`);
  }

  async reveal(tabId: number): Promise<void> {
    this.calls.push(`reveal ${tabId}`);
  }
}

/** A clock the test moves by hand. */
class Clock {
  time = 1_000_000;

  readonly now = (): number => this.time;
}

test.describe('PageFetcher', () => {
  test('reads the rendered page, then closes the tab and gives focus back', async () => {
    const tabs = new FakeTabs(article);
    const clock = new Clock();
    expect(await new PageFetcher(tabs, clock.now).fetch('https://news.example/a')).toEqual({ page: article, readAt: clock.time });
    expect(tabs.calls).toEqual(['open https://news.example/a', 'read 9 snapshot [5000]', 'close 9 back to 2']);
  });

  test('a continuation reuses a snapshot younger than 15 minutes; a fresh read always opens the page', async () => {
    const tabs = new FakeTabs(article);
    const clock = new Clock();
    const fetcher = new PageFetcher(tabs, clock.now);
    const first = await fetcher.fetch('https://news.example/a');
    clock.time += PageFetcher.cacheTtlMs - 1;
    expect(await fetcher.fetch('https://news.example/a', true)).toBe(first);
    expect(tabs.calls.filter((call) => call.startsWith('open'))).toHaveLength(1);
    await fetcher.fetch('https://news.example/a');
    expect(tabs.calls.filter((call) => call.startsWith('open'))).toHaveLength(2);
    clock.time += PageFetcher.cacheTtlMs;
    expect((await fetcher.fetch('https://news.example/a', true)).readAt).toBe(clock.time);
    expect(tabs.calls.filter((call) => call.startsWith('open'))).toHaveLength(3);
  });

  test('keeps only the most recent snapshots', async () => {
    const tabs = new FakeTabs(article);
    const fetcher = new PageFetcher(tabs, new Clock().now);
    for (let index = 0; index <= PageFetcher.cacheSize; index += 1) await fetcher.fetch(`https://news.example/${index}`);
    await fetcher.fetch('https://news.example/0', true);
    await fetcher.fetch(`https://news.example/${PageFetcher.cacheSize}`, true);
    const opens = tabs.calls.filter((call) => call.startsWith('open'));
    expect(opens).toHaveLength(PageFetcher.cacheSize + 2);
    expect(opens.at(-1)).toBe('open https://news.example/0');
  });

  test('never caches a failed read', async () => {
    const tabs = new FakeTabs({ ...article, title: 'Just a moment...' });
    const fetcher = new PageFetcher(tabs, new Clock().now);
    await expect(fetcher.fetch('https://news.example/a')).rejects.toThrow(/human check/);
    await expect(fetcher.fetch('https://news.example/a', true)).rejects.toThrow(/human check/);
    expect(tabs.calls.filter((call) => call.startsWith('open'))).toHaveLength(2);
  });

  test('on a human check leaves the tab open and active and fails', async () => {
    const tabs = new FakeTabs({ ...article, title: 'Just a moment...', text: 'Verify you are human' });
    await expect(new PageFetcher(tabs).fetch('https://news.example/a')).rejects.toThrow(/human check.*Do not try to solve it.*web_fetch again/);
    expect(tabs.calls.at(-1)).toBe('reveal 9');
    expect(tabs.calls.some((call) => call.startsWith('close'))).toBe(false);
  });

  test('closes the tab when the page cannot be read', async () => {
    const tabs = new FakeTabs(new Error('Cannot access contents of url "chrome-error://chromewebdata/"'));
    await expect(new PageFetcher(tabs).fetch('https://nowhere.example/')).rejects.toThrow(/Could not read https:\/\/nowhere\.example\/ in Growser: Cannot access/);
    expect(tabs.calls.at(-1)).toBe('close 9 back to 2');
  });

  test('refuses a PDF after closing its tab', async () => {
    const tabs = new FakeTabs({ ...article, contentType: 'application/pdf', text: '' });
    await expect(new PageFetcher(tabs).fetch('https://docs.example/a.pdf')).rejects.toThrow(/is a PDF/);
    expect(tabs.calls.at(-1)).toBe('close 9 back to 2');
  });
});

test.describe('HumanCheck', () => {
  const page = (title: string, text = 'short', challengeFrame = false) => ({ title, text, challengeFrame });

  test('recognises interstitial titles, phrases and challenge frames', () => {
    expect(HumanCheck.detect(page('Just a moment...'))).toBe(true);
    expect(HumanCheck.detect(page('Attention Required! | Cloudflare'))).toBe(true);
    expect(HumanCheck.detect(page('Example', 'Please verify you are human to continue'))).toBe(true);
    expect(HumanCheck.detect(page('Example', 'Подтвердите, что вы не робот'))).toBe(true);
    expect(HumanCheck.detect(page('Example', 'content', true))).toBe(true);
  });

  test('does not flag a long article that merely talks about captchas', () => {
    const essay = `${'How sites ask: are you a robot? '.repeat(10)}${'Long body text. '.repeat(300)}`;
    expect(HumanCheck.detect(page('Why CAPTCHAs fail', essay))).toBe(false);
    expect(HumanCheck.detect(page('An article', 'plain text'))).toBe(false);
  });
});
