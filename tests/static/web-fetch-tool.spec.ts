import { expect, test } from '@playwright/test';
import type { BrowserGate } from '../../plugin/server/growser.ts';
import type { ReadPage } from '../../plugin/server/page-fetcher.ts';
import type { PageSnapshot } from '../../plugin/server/page-scripts.ts';
import type { DigestAnswer, PageDigest } from '../../plugin/server/page-digest.ts';
import { WebFetchTool, type PageSource } from '../../plugin/server/web-fetch-tool.ts';

const page: PageSnapshot = {
  url: 'https://docs.example/final',
  title: 'Docs',
  contentType: 'text/html',
  text: 'abcdefghij',
  scope: 'main',
  status: 200,
  links: [
    { text: 'One', href: 'https://docs.example/1' },
    { text: '', href: 'https://docs.example/2' },
    { text: 'One again', href: 'https://docs.example/1' },
  ],
  challengeFrame: false,
};

class Recorder implements BrowserGate, PageSource, PageDigest {
  readonly calls: string[] = [];
  private readonly readAt: number;

  constructor(readAt = Date.now()) {
    this.readAt = readAt;
  }

  async ensureReady(): Promise<string> {
    this.calls.push('ensureReady');
    return 'Chrome/153';
  }

  async fetch(url: string, reuse: boolean): Promise<ReadPage> {
    this.calls.push(`fetch ${url}${reuse ? ' reuse' : ''}`);
    return { page, readAt: this.readAt };
  }

  async answer(prompt: string, read: PageSnapshot): Promise<DigestAnswer> {
    this.calls.push(`digest ${prompt} over ${read.text.length} chars`);
    return { text: 'The answer.', model: 'claude-haiku-test' };
  }
}

const call = (args: Record<string, unknown>, recorder = new Recorder()) => ({
  recorder,
  result: new WebFetchTool(recorder, recorder, recorder).call(args),
});

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
      [{ prompt: '  ' }, /prompt must be a non-empty string/],
      [{ prompt: 42 }, /prompt must be a non-empty string/],
      [{ prompt: 'x'.repeat(5001) }, /prompt is longer than 5000 characters/],
    ] as const) {
      await expect(call({ url: 'https://docs.example/', ...args }).result, JSON.stringify(args)).rejects.toThrow(message);
    }
  });

  test('starts the browser, reads the page fresh and returns its main content', async () => {
    const { recorder, result } = call({ url: '  https://docs.example/page  ' });
    expect(await result).toBe(
      'Title: Docs\nURL: https://docs.example/final\nContent: main content of the page, text/html\nText: characters 0-10 of 10\n\nabcdefghij',
    );
    expect(recorder.calls).toEqual(['ensureReady', 'fetch https://docs.example/page']);
  });

  test('names an HTTP status outside 2xx, and none the browser did not report', () => {
    const request = WebFetchTool.validate({ url: 'https://docs.example/' });
    const content = (status: number): string => WebFetchTool.format({ page: { ...page, status }, readAt: 0 }, request, 0).split('\n')[2];
    expect(content(404)).toBe('Content: main content of the page, text/html, HTTP 404');
    expect(content(503)).toBe('Content: main content of the page, text/html, HTTP 503');
    expect(content(204)).toBe('Content: main content of the page, text/html');
    expect(content(0)).toBe('Content: main content of the page, text/html');
  });

  test('slices long text, and a continuation may reuse the recent snapshot', async () => {
    expect(await call({ url: 'https://docs.example/', max_length: 4 }).result).toMatch(
      /Text: characters 0-4 of 10; call again with start_index=4 for more\n\nabcd$/,
    );
    const continuation = call({ url: 'https://docs.example/', max_length: 4, start_index: 8 }, new Recorder(Date.now() - 42_000));
    expect(await continuation.result).toMatch(/Content: main content of the page, text\/html, read 42 s ago\nText: characters 8-10 of 10\n\nij$/);
    expect(continuation.recorder.calls).toEqual(['ensureReady', 'fetch https://docs.example/ reuse']);
    await expect(call({ url: 'https://docs.example/', start_index: 10 }).result).rejects.toThrow(/start_index 10 is past the end of the text \(10 characters\)/);
  });

  test('lists unique links on request, keeping the first text of each', async () => {
    expect(await call({ url: 'https://docs.example/', include_links: true }).result).toMatch(
      /\n\nLinks: 2\n1\. One - https:\/\/docs\.example\/1\n2\. \(no text\) - https:\/\/docs\.example\/2$/,
    );
  });

  test("with a prompt, reads the page fresh and returns only the small model's answer", async () => {
    const { recorder, result } = call({ url: 'https://docs.example/', prompt: '  What is it?  ', start_index: 3, max_length: 2 });
    expect(await result).toBe(
      'Title: Docs\nURL: https://docs.example/final\nContent: main content of the page, text/html\n' +
        'Answer: by claude-haiku-test from 10 characters of the page\n\nThe answer.',
    );
    expect(recorder.calls).toEqual(['ensureReady', 'fetch https://docs.example/', 'digest What is it? over 10 chars']);
  });
});
