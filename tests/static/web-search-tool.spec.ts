import { expect, test } from '@playwright/test';
import type { SearchOutcome } from '../../plugin/server/duckduckgo.ts';
import type { BrowserGate } from '../../plugin/server/growser.ts';
import { WebSearchTool, type Searcher } from '../../plugin/server/web-search-tool.ts';

class Recorder implements BrowserGate, Searcher {
  readonly calls: string[] = [];
  private readonly outcome: SearchOutcome;

  constructor(outcome: SearchOutcome) {
    this.outcome = outcome;
  }

  async ensureReady(): Promise<string> {
    this.calls.push('ensureReady');
    return 'Chrome/153';
  }

  async search(query: string, limit: number): Promise<SearchOutcome> {
    this.calls.push(`search ${query} ${limit}`);
    return this.outcome;
  }
}

const twoResults: SearchOutcome = {
  url: 'https://html.duckduckgo.com/html/?q=x',
  results: [
    { title: 'First', url: 'https://a.example/', snippet: 'about a' },
    { title: 'Second', url: 'https://b.example/', snippet: '' },
  ],
};

const mixed: SearchOutcome = {
  url: 'https://html.duckduckgo.com/html/?q=m',
  results: [
    { title: 'Maker', url: 'https://www.bmwusa.com/m440i', snippet: '' },
    { title: 'Dealer', url: 'https://www.autotrader.com/bmw', snippet: '' },
    { title: 'Shop', url: 'https://shop.bmwusa.com/parts', snippet: '' },
  ],
};

test.describe('WebSearchTool', () => {
  test('validates the query and the limit before touching the browser', async () => {
    const recorder = new Recorder(twoResults);
    const tool = new WebSearchTool(recorder, recorder);
    for (const args of [{}, { query: '' }, { query: ' x ' }, { query: 42 }, { query: 'x'.repeat(501) }]) {
      await expect(tool.call(args), JSON.stringify(args).slice(0, 40)).rejects.toThrow(/query/);
    }
    for (const limit of [0, 11, 2.5, '5', true]) {
      await expect(tool.call({ query: 'q q', limit }), String(limit)).rejects.toThrow(/limit must be an integer from 1 to 10/);
    }
    await expect(tool.call({ query: 'q q', allowed_domains: ['not a domain'] })).rejects.toThrow(/allowed_domains: "not a domain" is not a domain/);
    expect(recorder.calls).toEqual([]);
  });

  test('trims the query, asks the engine for a full page, starts the browser first', async () => {
    const recorder = new Recorder(twoResults);
    await new WebSearchTool(recorder, recorder).call({ query: '  growser  ' });
    expect(recorder.calls).toEqual(['ensureReady', 'search growser 10']);
    expect(WebSearchTool.validate({ query: 'qq', limit: null }).limit).toBe(10);
    expect(WebSearchTool.validate({ query: 'x'.repeat(500), limit: 1 }).limit).toBe(1);
  });

  test('formats numbered results, omitting empty snippets, and applies the limit', async () => {
    const recorder = new Recorder(twoResults);
    expect(await new WebSearchTool(recorder, recorder).call({ query: 'qq', limit: 1 })).toBe(
      'DuckDuckGo via Growser, "qq": 1 results\n\n1. First\n   https://a.example/\n   about a',
    );
    expect(await new WebSearchTool(recorder, recorder).call({ query: 'qq' })).toMatch(/2 results[\s\S]*2\. Second\n   https:\/\/b\.example\/$/);
  });

  test('sends site operators and drops results outside the allowed or inside the blocked domains', async () => {
    const recorder = new Recorder(mixed);
    const answer = await new WebSearchTool(recorder, recorder).call({ query: 'm440i', allowed_domains: ['bmwusa.com'], blocked_domains: ['shop.bmwusa.com'] });
    expect(recorder.calls).toEqual(['ensureReady', 'search m440i site:bmwusa.com -site:shop.bmwusa.com 10']);
    expect(answer).toBe('DuckDuckGo via Growser, "m440i site:bmwusa.com -site:shop.bmwusa.com": 1 results\n\n1. Maker\n   https://www.bmwusa.com/m440i');
  });

  test('says so when nothing is left', async () => {
    const recorder = new Recorder({ url: 'https://html.duckduckgo.com/html/?q=zz', results: [] });
    expect(await new WebSearchTool(recorder, recorder).call({ query: 'zz' })).toBe(
      'DuckDuckGo via Growser, "zz": no results (https://html.duckduckgo.com/html/?q=zz)',
    );
    const filtered = new Recorder(mixed);
    expect(await new WebSearchTool(filtered, filtered).call({ query: 'm440i', allowed_domains: ['example.org'] })).toMatch(/: no results \(/);
  });
});
