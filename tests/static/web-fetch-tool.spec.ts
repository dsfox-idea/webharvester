import { expect, test } from '@playwright/test';
import type { BrowserGate } from '../../plugin/server/growser.ts';
import type { PageSnapshot } from '../../plugin/server/page-scripts.ts';
import { WebFetchTool, type PageSource } from '../../plugin/server/web-fetch-tool.ts';

const page: PageSnapshot = {
  url: 'https://docs.example/final',
  title: 'Docs',
  contentType: 'text/html',
  text: 'abcdefghij',
  links: [
    { text: 'One', href: 'https://docs.example/1' },
    { text: '', href: 'https://docs.example/2' },
    { text: 'One again', href: 'https://docs.example/1' },
  ],
  challengeFrame: false,
};

class Recorder implements BrowserGate, PageSource {
  readonly calls: string[] = [];

  async ensureReady(): Promise<string> {
    this.calls.push('ensureReady');
    return 'Chrome/153';
  }

  async fetch(url: string): Promise<PageSnapshot> {
    this.calls.push(`fetch ${url}`);
    return page;
  }
}

const call = (args: Record<string, unknown>) => {
  const recorder = new Recorder();
  return { recorder, result: new WebFetchTool(recorder, recorder).call(args) };
};

test.describe('WebFetchTool', () => {
  test('accepts only absolute http and https URLs, before touching the browser', async () => {
    for (const url of [undefined, '', 'docs.example/page', '/relative', 'ftp://x.example/', 'javascript:alert(1)', 'chrome://settings', 'file:///C:/x']) {
      const { recorder, result } = call({ url });
      await expect(result, String(url)).rejects.toThrow(/url must be/);
      expect(recorder.calls).toEqual([]);
    }
  });

  test('validates max_length, start_index and include_links', async () => {
    for (const [args, message] of [
      [{ max_length: 0 }, /max_length must be an integer from 1 to 100000/],
      [{ max_length: 100_001 }, /max_length/],
      [{ max_length: 1.5 }, /max_length/],
      [{ start_index: -1 }, /start_index must be an integer/],
      [{ start_index: '3' }, /start_index/],
      [{ include_links: 'yes' }, /include_links must be true or false/],
    ] as const) {
      await expect(call({ url: 'https://docs.example/', ...args }).result, JSON.stringify(args)).rejects.toThrow(message);
    }
  });

  test('starts the browser, then returns title, final url and the whole short text', async () => {
    const { recorder, result } = call({ url: '  https://docs.example/page  ' });
    expect(await result).toBe('Title: Docs\nURL: https://docs.example/final\nText: characters 0-10 of 10\n\nabcdefghij');
    expect(recorder.calls).toEqual(['ensureReady', 'fetch https://docs.example/page']);
  });

  test('slices long text and says where to continue', async () => {
    expect(await call({ url: 'https://docs.example/', max_length: 4 }).result).toMatch(
      /Text: characters 0-4 of 10; call again with start_index=4 for more\n\nabcd$/,
    );
    expect(await call({ url: 'https://docs.example/', max_length: 4, start_index: 8 }).result).toMatch(/Text: characters 8-10 of 10\n\nij$/);
    await expect(call({ url: 'https://docs.example/', start_index: 10 }).result).rejects.toThrow(/start_index 10 is past the end of the text \(10 characters\)/);
  });

  test('lists unique links on request', async () => {
    expect(await call({ url: 'https://docs.example/', include_links: true }).result).toMatch(
      /\n\nLinks: 2\n1\. One - https:\/\/docs\.example\/1\n2\. \(no text\) - https:\/\/docs\.example\/2$/,
    );
  });
});
