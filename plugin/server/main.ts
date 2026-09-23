import { readFileSync } from 'node:fs';
import { DuckDuckGoSearch } from './duckduckgo.ts';
import { ExtensionTabs } from './extension-tabs.ts';
import { ExtensionWorker } from './extension-worker.ts';
import { GrowserEndpoint, GrowserLauncher } from './growser.ts';
import { log } from './log.ts';
import { McpServer } from './mcp-server.ts';
import { WebSearchTool } from './web-search-tool.ts';

const plugin = JSON.parse(readFileSync(new URL('../.claude-plugin/plugin.json', import.meta.url), 'utf8')) as { version: string };
const endpoint = GrowserEndpoint.fromEnv(process.env);
const server = new McpServer({ name: 'growser', version: plugin.version }, [
  new WebSearchTool(new GrowserLauncher(endpoint), new DuckDuckGoSearch(new ExtensionTabs(new ExtensionWorker(endpoint)))),
]);

log(`serving on stdio, Growser DevTools endpoint ${endpoint.baseUrl}`);
await server.serve(process.stdin, process.stdout);
