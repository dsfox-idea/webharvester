import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

/** Serves a page with a same-origin iframe and an about:blank iframe, to observe content-script injection. */
export class TestServer {
  private server?: Server;

  static readonly pages: Record<string, string> = {
    '/': `<!doctype html><title>webharvester test page</title><h1>top</h1>
<iframe id="child" src="/frame"></iframe>
<iframe id="blank"></iframe>`,
    '/frame': `<!doctype html><title>frame</title><p>nested frame</p>`,
  };

  async start(): Promise<string> {
    this.server = createServer((request, response) => {
      const body = TestServer.pages[request.url ?? '/'];
      response.writeHead(body ? 200 : 404, { 'content-type': 'text/html; charset=utf-8' });
      response.end(body ?? 'not found');
    });
    await new Promise<void>((resolve) => this.server!.listen(0, '127.0.0.1', resolve));
    const { port } = this.server.address() as AddressInfo;
    return `http://127.0.0.1:${port}`;
  }

  async stop(): Promise<void> {
    const server = this.server;
    if (!server) return;
    server.closeAllConnections(); // keep-alive sockets would otherwise hold close() open
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}
