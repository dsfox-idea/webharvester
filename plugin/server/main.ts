import { readFileSync } from 'node:fs';
import { DuckDuckGoSearch } from './duckduckgo.ts';
import { ExtensionTabs } from './extension-tabs.ts';
import { ExtensionWorker } from './extension-worker.ts';
import { GrowserEndpoint, GrowserLauncher } from './growser.ts';
import { log } from './log.ts';
import { McpServer } from './mcp-server.ts';
import { WebSearchTool } from './web-search-tool.ts';

const instructions =
  "Web search goes through the user's own Growser browser. For every web search call this server's web_search tool " +
  '(mcp__plugin_web-harvester_growser__web_search; load its schema with ToolSearch if it is deferred). The built-in ' +
  'WebSearch is blocked by the web-harvester plugin. If web_search fails, report the error to the user instead of ' +
  'looking for another search route. If it reports a human check (CAPTCHA), ask the user to complete it in Growser ' +
  'and wait; never solve it yourself.';

const plugin = JSON.parse(readFileSync(new URL('../.claude-plugin/plugin.json', import.meta.url), 'utf8')) as { version: string };
const endpoint = GrowserEndpoint.fromEnv(process.env);
const server = new McpServer(
  { name: 'growser', version: plugin.version },
  [new WebSearchTool(new GrowserLauncher(endpoint), new DuckDuckGoSearch(new ExtensionTabs(new ExtensionWorker(endpoint))))],
  instructions,
);

log(`serving on stdio, Growser DevTools endpoint ${endpoint.baseUrl}`);
await server.serve(process.stdin, process.stdout);
