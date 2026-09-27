import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';
import { test as base } from '@playwright/test';
import { McpClient } from './mcp-client.ts';

interface SitePage {
  status: number;
  body: string;
}

const menu = `<header><nav>${'<a href="/menu">Menu item</a> '.repeat(40)}</nav></header>`;

/** Pages that exercise what web_fetch reads; each stands for a case seen on a real site. */
const pages: Record<string, SitePage> = {
  '/article': {
    status: 200,
    body: `<!doctype html><html><head><title>Test article</title></head><body>
<header><nav><a href="/">Home</a></nav></header>
<main>
<h1>Test article</h1>
<p>The secret number is 4817.</p>
<closed-card></closed-card>
<pre><code>def f(x):
    if x:
        return 1
    return 0</code></pre>
<pre>Markdown:
\`\`\`js
x()
\`\`\`</pre>
</main>
<script>
customElements.define('closed-card', class extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'closed' }).innerHTML = '<p>Text in a closed shadow root.</p>'; }
});
</script>
</body></html>`,
  },
  '/missing': { status: 404, body: '<!doctype html><title>Not here</title><main><h1>Not here</h1><p>No such page.</p></main>' },
  '/menu': {
    status: 404,
    body: `<!doctype html><title>Page not found</title><body>${menu}<div><h1>Page not found</h1><p>No such page here.</p></div><footer>${'Footer link '.repeat(20)}</footer></body>`,
  },
  '/counter': { status: 200, body: '<!doctype html><title>Counter</title><main><p>A page that counts its loads.</p></main>' },
};

/** Serves the pages on 127.0.0.1 (a port of its own) and counts the requests for each path. */
export class TestSite {
  readonly hits = new Map<string, number>();
  private readonly server = createServer((request, response) => {
    const path = new URL(request.url ?? '/', 'http://site').pathname;
    this.hits.set(path, (this.hits.get(path) ?? 0) + 1);
    const page = pages[path] ?? { status: 404, body: '' };
    response.writeHead(page.status, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }).end(page.body);
  });

  get baseUrl(): string {
    return `http://127.0.0.1:${(this.server.address() as AddressInfo).port}`;
  }

  url(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  async start(): Promise<void> {
    await new Promise<void>((resolve) => this.server.listen(0, '127.0.0.1', resolve));
  }

  async close(): Promise<void> {
    await new Promise<void>((resolve) => this.server.close(() => resolve()));
  }
}

const serverPath = fileURLToPath(new URL('../../plugin/server/main.ts', import.meta.url));

export const test = base.extend<{ serverLog: void }, { site: TestSite; mcp: McpClient }>({
  site: [
    async ({}, use) => {
      const site = new TestSite();
      await site.start();
      await use(site);
      await site.close();
    },
    { scope: 'worker' },
  ],
  mcp: [
    async ({}, use) => {
      const env = { ...process.env };
      delete env.CLAUDE_CODE_EXECPATH; // Claude Code gives its MCP servers no path to its binary
      const client = await McpClient.start(serverPath, env);
      await use(client);
      client.close();
    },
    { scope: 'worker' },
  ],
  serverLog: [
    async ({ mcp }, use, testInfo) => {
      mcp.takeLog();
      await use();
      await testInfo.attach('growser-mcp.log', { body: mcp.takeLog().join('\n'), contentType: 'text/plain' });
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';
