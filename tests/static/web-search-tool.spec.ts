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

test.describe('WebSearchTool', () => {
  test('validates the query and the limit before touching the browser', async () => {
    const recorder = new Recorder(twoResults);
    const tool = new WebSearchTool(recorder, recorder);
    for (const args of [{}, { query: '' }, { query: '   ' }, { query: 42 }, { query: 'x'.repeat(501) }]) {
      await expect(tool.call(args), JSON.stringify(args).slice(0, 40)).rejects.toThrow(/query/);
    }
    for (const limit of [0, 21, 2.5, '5', true]) {
      await expect(tool.call({ query: 'q', limit }), String(limit)).rejects.toThrow(/limit must be an integer from 1 to 20/);
    }
    expect(recorder.calls).toEqual([]);
  });

  test('trims the query, defaults the limit, starts the browser first', async () => {
    const recorder = new Recorder(twoResults);
    await new WebSearchTool(recorder, recorder).call({ query: '  growser  ' });
    expect(recorder.calls).toEqual(['ensureReady', 'search growser 10']);
    expect(WebSearchTool.validate({ query: 'q', limit: 20 })).toEqual({ query: 'q', limit: 20 });
    expect(WebSearchTool.validate({ query: 'q', limit: null }).limit).toBe(10);
    expect(WebSearchTool.validate({ query: 'x'.repeat(500), limit: 1 }).limit).toBe(1);
  });

  test('formats numbered results, omitting empty snippets', async () => {
    const recorder = new Recorder(twoResults);
    expect(await new WebSearchTool(recorder, recorder).call({ query: 'q', limit: 2 })).toBe(
      'DuckDuckGo via Growser, "q": 2 results\n\n1. First\n   https://a.example/\n   about a\n\n2. Second\n   https://b.example/',
    );
  });

  test('says so when the engine found nothing', async () => {
    const recorder = new Recorder({ url: 'https://html.duckduckgo.com/html/?q=zz', results: [] });
    expect(await new WebSearchTool(recorder, recorder).call({ query: 'zz' })).toBe(
      'DuckDuckGo via Growser, "zz": no results (https://html.duckduckgo.com/html/?q=zz)',
    );
  });
});
