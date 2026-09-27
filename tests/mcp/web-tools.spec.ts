import { GrowserEndpoint } from '../../plugin/server/growser.ts';
import { expect, test } from './fixtures.ts';

test.describe('growser MCP server through Growser', () => {
  test('announces web_search and web_fetch', async ({ mcp }) => {
    const { tools } = (await mcp.request('tools/list')) as { tools: Array<{ name: string }> };
    expect(tools.map((tool) => tool.name).sort()).toEqual(['web_fetch', 'web_search']);
  });

  test('reads a page as Markdown: main content, closed shadow DOM, code intact', async ({ mcp, site }) => {
    const reply = await mcp.call('web_fetch', { url: site.url('/article'), fresh: true });
    expect(reply.isError, reply.text).toBe(false);
    expect(reply.text).toContain('Title: Test article\n');
    expect(reply.text).toContain('Content: main content of the page, text/html\n');
    for (const part of [
      '# Test article',
      'The secret number is 4817.',
      'Text in a closed shadow root.',
      '```\ndef f(x):\n    if x:\n        return 1\n    return 0\n```',
      '````\nMarkdown:\n```js\nx()\n```\n````',
    ]) {
      expect(reply.text).toContain(part);
    }
    expect(reply.text).not.toContain('Home');
  });

  test('names a status outside 2xx', async ({ mcp, site }) => {
    const reply = await mcp.call('web_fetch', { url: site.url('/missing'), fresh: true });
    expect(reply.text).toContain('Content: main content of the page, text/html, HTTP 404\n');
  });

  test('keeps a short page under a big menu as Markdown', async ({ mcp, site }) => {
    const reply = await mcp.call('web_fetch', { url: site.url('/menu'), fresh: true });
    expect(reply.text).toContain('# Page not found\n\nNo such page here.');
    expect(reply.text).not.toContain('Menu item');
    expect(reply.text).not.toContain('Footer link');
  });

  test('reuses a read of the last 15 minutes and reads again with fresh: true', async ({ mcp, site }) => {
    const url = site.url('/counter');
    await mcp.call('web_fetch', { url, fresh: true });
    const loads = site.hits.get('/counter') ?? 0;
    expect(loads).toBeGreaterThan(0);
    for (const args of [{ max_length: 5 }, { start_index: 3 }]) {
      const reply = await mcp.call('web_fetch', { url, ...args });
      expect(reply.isError, reply.text).toBe(false);
    }
    expect(site.hits.get('/counter'), 'no load for a reused read').toBe(loads);
    await mcp.call('web_fetch', { url, fresh: true });
    expect(site.hits.get('/counter')).toBe(loads * 2);
  });

  test('fails at once for a host that does not exist', async ({ mcp }) => {
    const started = Date.now();
    const reply = await mcp.call('web_fetch', { url: 'https://no-such-host.webharvester-test.invalid/' });
    expect(reply.isError).toBe(true);
    expect(reply.text).toContain('the host no-such-host.webharvester-test.invalid does not exist (DNS answered NXDOMAIN)');
    expect(Date.now() - started).toBeLessThan(5_000);
  });

  test('answers a prompt with Claude Haiku through the Claude Code CLI', async ({ mcp, site }) => {
    const reply = await mcp.call('web_fetch', { url: site.url('/article'), prompt: 'What is the secret number on this page? Reply with the number only.' });
    expect(reply.isError, reply.text).toBe(false);
    expect(reply.text).toMatch(/\nAnswer: by claude-haiku[^\n]* from \d+ characters of the page\n/);
    expect(reply.text).toContain('4817');
  });

  test('searches the web through DuckDuckGo', async ({ mcp }) => {
    const reply = await mcp.call('web_search', { query: 'Chromium extension manifest permissions', limit: 3 });
    test.skip(reply.isError && /human check/.test(reply.text), 'DuckDuckGo asked for a human check');
    expect(reply.isError, reply.text).toBe(false);
    expect(reply.text).toMatch(/^DuckDuckGo via Growser, "Chromium extension manifest permissions": [1-3] results\n/);
  });

  test('leaves no tab of its own open', async ({ site }) => {
    const targets = await GrowserEndpoint.fromEnv(process.env).targets();
    expect(targets.filter((target) => target.url.startsWith(site.baseUrl)).map((target) => target.url)).toEqual([]);
  });
});
