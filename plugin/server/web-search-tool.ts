import type { SearchOutcome } from './duckduckgo.ts';
import type { ToolDefinition } from './mcp-server.ts';

export interface Searcher {
  search(query: string, limit: number): Promise<SearchOutcome>;
}

export interface BrowserGate {
  /** Resolves once the browser answers; may start it. */
  ensureReady(): Promise<string>;
}

interface SearchRequest {
  query: string;
  limit: number;
}

/** The `web_search` MCP tool: DuckDuckGo results fetched through the user's Growser. */
export class WebSearchTool implements ToolDefinition {
  static readonly maxQueryLength = 500;
  static readonly defaultLimit = 10;
  static readonly maxLimit = 20;

  readonly name = 'web_search';
  readonly description =
    "Search the web through the user's own Growser browser: opens DuckDuckGo in a visible tab of the user's session, " +
    'reads titles, URLs and snippets, and closes the tab, so results match what the user sees. Prefer this over the ' +
    'built-in WebSearch. Starts Growser if it is not running. If the engine shows a human check, the tab is left open ' +
    'for the user and the call fails; never solve such a check yourself.';
  readonly inputSchema = {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query, any language.' },
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: WebSearchTool.maxLimit,
        default: WebSearchTool.defaultLimit,
        description: 'Maximum number of results.',
      },
    },
    required: ['query'],
    additionalProperties: false,
  };

  private readonly browser: BrowserGate;
  private readonly searcher: Searcher;

  constructor(browser: BrowserGate, searcher: Searcher) {
    this.browser = browser;
    this.searcher = searcher;
  }

  static validate(args: Record<string, unknown>): SearchRequest {
    const query = typeof args.query === 'string' ? args.query.trim() : '';
    if (query === '') throw new Error('query must be a non-empty string');
    if (query.length > WebSearchTool.maxQueryLength) throw new Error(`query is longer than ${WebSearchTool.maxQueryLength} characters`);
    const limit = args.limit ?? WebSearchTool.defaultLimit;
    if (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 1 || limit > WebSearchTool.maxLimit) {
      throw new Error(`limit must be an integer from 1 to ${WebSearchTool.maxLimit}`);
    }
    return { query, limit };
  }

  static format(query: string, outcome: SearchOutcome): string {
    const header = `DuckDuckGo via Growser, ${JSON.stringify(query)}: ${outcome.results.length} results`;
    const entries = outcome.results.map((result, index) =>
      [`${index + 1}. ${result.title}`, `   ${result.url}`, ...(result.snippet ? [`   ${result.snippet}`] : [])].join('\n'),
    );
    return [header, ...entries].join('\n\n');
  }

  async call(args: Record<string, unknown>): Promise<string> {
    const { query, limit } = WebSearchTool.validate(args);
    await this.browser.ensureReady();
    const outcome = await this.searcher.search(query, limit);
    if (outcome.results.length > 0) return WebSearchTool.format(query, outcome);
    return `DuckDuckGo via Growser, ${JSON.stringify(query)}: no results (${outcome.url})`;
  }
}
