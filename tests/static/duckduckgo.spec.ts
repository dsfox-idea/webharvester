import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { DuckDuckGoResults, DuckDuckGoSearch, HtmlText, type PageTabs } from '../../plugin/server/duckduckgo.ts';
import type { LoadedPage, TabHandle } from '../../plugin/server/extension-tabs.ts';

const fixture = (name: string) => readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf8');
const resultsPage = fixture('ddg-results.html');
const challengePage = fixture('ddg-challenge.html');

/** Records what the search asks of the browser; serves the given pages in turn (the last one repeats). */
class FakeTabs implements PageTabs {
  readonly calls: string[] = [];
  private readonly pages: string[];

  constructor(...pages: string[]) {
    this.pages = pages;
  }

  async load(url: string): Promise<LoadedPage> {
    this.calls.push(`load ${url}`);
    return { tabId: 7, previousTabId: 2, url, html: this.next() };
  }

  async html(tabId: number): Promise<string> {
    this.calls.push(`html ${tabId}`);
    return this.next();
  }

  async waitForLoad(tabId: number): Promise<void> {
    this.calls.push(`wait ${tabId}`);
  }

  async close(tab: TabHandle): Promise<void> {
    this.calls.push(`close ${tab.tabId} back to ${tab.previousTabId}`);
  }

  async reveal(tabId: number): Promise<void> {
    this.calls.push(`reveal ${tabId}`);
  }

  private next(): string {
    return this.pages.length > 1 ? this.pages.shift()! : this.pages[0];
  }
}

test.describe('DuckDuckGoResults on a captured page', () => {
  test('reads title, real url and snippet of every organic result', () => {
    const results = DuckDuckGoResults.parse(resultsPage, 20);
    expect(results).toHaveLength(9);
    expect(results[0]).toEqual({
      title: 'The extension service worker lifecycle | Chrome for Developers',
      url: 'https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle',
      snippet: expect.stringMatching(/^Extension service workers respond to both standard service worker events/),
    });
    for (const result of results) {
      expect(result.title).not.toBe('');
      expect(result.url).toMatch(/^https?:\/\//);
      expect(new URL(result.url).hostname).not.toMatch(/duckduckgo\.com$/);
    }
  });

  test('decodes the doubly escaped apostrophe DuckDuckGo puts in snippets', () => {
    const snippets = DuckDuckGoResults.parse(resultsPage, 20).map((result) => result.snippet);
    expect(snippets.some((snippet) => snippet.includes("extension's"))).toBe(true);
    expect(snippets.some((snippet) => /&#\d+;|&amp;/.test(snippet))).toBe(false);
  });

  test('respects the limit', () => {
    expect(DuckDuckGoResults.parse(resultsPage, 3)).toHaveLength(3);
    expect(DuckDuckGoResults.parse(resultsPage, 3)).toEqual(DuckDuckGoResults.parse(resultsPage, 20).slice(0, 3));
  });

  test('tells the human check apart from a results page', () => {
    expect(DuckDuckGoResults.isChallenge(challengePage)).toBe(true);
    expect(DuckDuckGoResults.isChallenge(resultsPage)).toBe(false);
    expect(DuckDuckGoResults.parse(challengePage)).toEqual([]);
  });
});

test.describe('DuckDuckGoResults on edge-case markup', () => {
  const result = (href: string, title: string, snippet: string) =>
    `<div class="result"><h2><a rel="nofollow" class="result__a" href="${href}">${title}</a></h2>` +
    `<a class="result__snippet" href="${href}">${snippet}</a></div>`;

  test('skips ads and internal links, drops duplicates', () => {
    const html = [
      result('https://duckduckgo.com/y.js?ad_domain=x', 'Ad', 'sponsored'),
      result('//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fa&amp;rut=1', 'First', 'one'),
      result('https://example.com/a', 'Same url again', 'dup'),
      result('/html/?q=next', 'Internal', 'relative'),
    ].join('');
    expect(DuckDuckGoResults.parse(html)).toEqual([{ title: 'First', url: 'https://example.com/a', snippet: 'one' }]);
  });

  test('keeps a result whose snippet never closed and one with no snippet', () => {
    const html =
      '<a class="result__a" href="https://a.example/">A</a>' +
      '<a class="result__a" href="https://b.example/">B <b>bold</b></a><div class="result__snippet">cut off';
    expect(DuckDuckGoResults.parse(html)).toEqual([
      { title: 'A', url: 'https://a.example/', snippet: '' },
      { title: 'B bold', url: 'https://b.example/', snippet: '' },
    ]);
  });

  test('matches class names as whole tokens', () => {
    expect(DuckDuckGoResults.parse('<a class="result__about" href="https://x.example/">not a result</a>')).toEqual([]);
    expect(DuckDuckGoResults.parse('<a class="x result__a y" href="https://x.example/">yes</a>')).toHaveLength(1);
  });

  test('yields nothing for empty or broken markup', () => {
    expect(DuckDuckGoResults.parse('')).toEqual([]);
    expect(DuckDuckGoResults.parse('<a class="result__a" href="')).toEqual([]);
    expect(DuckDuckGoResults.parse('<<<>>> < a >')).toEqual([]);
  });

  test('unwraps the uddg redirect and leaves plain links alone', () => {
    expect(DuckDuckGoResults.realUrl('//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fa%3Fb%3D1&rut=x')).toBe('https://example.com/a?b=1');
    expect(DuckDuckGoResults.realUrl('https://example.com/plain')).toBe('https://example.com/plain');
    expect(DuckDuckGoResults.realUrl('')).toBe('');
  });
});

test.describe('HtmlText', () => {
  test('decodes named, decimal and hex references, leaving unknown ones', () => {
    expect(HtmlText.decode('&lt;a&gt; &amp; &quot;q&quot; &#39;s &#x41; &nbsp;&bogus;')).toBe(`<a> & "q" 's A  &bogus;`);
  });

  test('leaves an out-of-range code point as written', () => {
    expect(HtmlText.decode('&#x110000;')).toBe('&#x110000;');
  });
});

test.describe('DuckDuckGoSearch', () => {
  test('loads the query in a tab, closes it and parses the page', async () => {
    const tabs = new FakeTabs(resultsPage);
    const outcome = await new DuckDuckGoSearch(tabs).search('кириллица & co', 2);
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent('кириллица & co')}`;
    expect(outcome).toEqual({ url, results: DuckDuckGoResults.parse(resultsPage, 2) });
    expect(tabs.calls).toEqual([`load ${url}`, 'close 7 back to 2']);
  });

  test('without a way to ask, a human check leaves the tab open and active and fails without parsing', async () => {
    const tabs = new FakeTabs(challengePage);
    await expect(new DuckDuckGoSearch(tabs).search('q', 5)).rejects.toThrow(/human check.*Do not try to solve it.*web_search again/);
    expect(tabs.calls).toEqual([`load ${DuckDuckGoSearch.url('q')}`, 'reveal 7']);
  });

  test('after the user completes the check, reads the same tab again and returns the results', async () => {
    const tabs = new FakeTabs(challengePage, resultsPage);
    const asked: string[] = [];
    const outcome = await new DuckDuckGoSearch(tabs).search('q', 3, async (message) => {
      asked.push(message);
      return 'accepted';
    });
    expect(outcome.results).toEqual(DuckDuckGoResults.parse(resultsPage, 3));
    expect(asked).toEqual([expect.stringMatching(/^DuckDuckGo shows a human check .* Complete it there yourself/)]);
    expect(tabs.calls).toEqual([`load ${DuckDuckGoSearch.url('q')}`, 'reveal 7', 'wait 7', 'html 7', 'close 7 back to 2']);
  });
});
