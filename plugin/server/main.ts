import { readFileSync } from 'node:fs';
import { DuckDuckGoSearch } from './duckduckgo.ts';
import { ExtensionTabs } from './extension-tabs.ts';
import { ExtensionWorker } from './extension-worker.ts';
import { GrowserEndpoint, GrowserLauncher } from './growser.ts';
import { log } from './log.ts';
import { McpServer } from './mcp-server.ts';
import { ClaudeCliDigest } from './page-digest.ts';
import { PageFetcher } from './page-fetcher.ts';
import { WebFetchTool } from './web-fetch-tool.ts';
import { WebSearchTool } from './web-search-tool.ts';

const instructions =
  "The web is reached through the user's own Growser browser. For every web search call this server's web_search tool " +
  '(mcp__plugin_web-harvester_growser__web_search), and to read a page call its web_fetch tool ' +
  '(mcp__plugin_web-harvester_growser__web_fetch); load their schemas with ToolSearch if they are deferred. The built-in ' +
  'WebSearch and WebFetch are blocked by the web-harvester plugin, with one exception: when a tool reports a human check ' +
  '(CAPTCHA) that did not clear within 15 s, repeat that call with the built-in tool it names, which the plugin then ' +
  'allows for that search or site for 10 minutes; do not stop to ask the user. If a tool fails for another reason, ' +
  'report the error to the user instead of looking for another route. Never solve a human check yourself.';

const plugin = JSON.parse(readFileSync(new URL('../.claude-plugin/plugin.json', import.meta.url), 'utf8')) as { version: string };
const endpoint = GrowserEndpoint.fromEnv(process.env);
const launcher = new GrowserLauncher(endpoint);
const tabs = new ExtensionTabs(new ExtensionWorker(endpoint));
const server = new McpServer(
  { name: 'growser', version: plugin.version },
  [new WebSearchTool(launcher, new DuckDuckGoSearch(tabs)), new WebFetchTool(launcher, new PageFetcher(tabs), new ClaudeCliDigest())],
  instructions,
);

log(`serving on stdio, Growser DevTools endpoint ${endpoint.baseUrl}`);
await server.serve(process.stdin, process.stdout);
