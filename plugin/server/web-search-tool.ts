import { DomainFilter } from './domain-filter.ts';
import type { SearchOutcome } from './duckduckgo.ts';
import type { BrowserGate } from './growser.ts';
import type { ToolDefinition } from './mcp-server.ts';

export interface Searcher {
  search(query: string, limit: number): Promise<SearchOutcome>;
}

interface SearchRequest {
  query: string;
  limit: number;
  domains: DomainFilter;
}

/** The `web_search` MCP tool: DuckDuckGo results fetched through the user's Growser. */
export class WebSearchTool implements ToolDefinition {
  static readonly minQueryLength = 2;
  static readonly maxQueryLength = 500;
  /** DuckDuckGo's no-JS page lists about ten organic results. */
  static readonly maxLimit = 10;

  readonly name = 'web_search';
  readonly description =
    "Search the web through the user's own Growser browser: opens DuckDuckGo in a visible tab of the user's session, " +
    'reads titles, URLs and snippets, and closes the tab, so results match what the user sees. Prefer this over the ' +
    'built-in WebSearch. allowed_domains / blocked_domains filter results (a domain covers its subdomains). After ' +
    'answering from results, end with a "Sources:" list of the URLs you used as markdown links. Starts Growser if it ' +
    'is not running. If the engine shows a human check, the tab is left open for the user and the call fails; never ' +
    'solve such a check yourself.';
  readonly inputSchema = {
    type: 'object',
    properties: {
      query: { type: 'string', minLength: WebSearchTool.minQueryLength, description: 'Search query, any language.' },
      allowed_domains: { type: 'array', items: { type: 'string' }, description: 'Only include search results from these domains.' },
      blocked_domains: { type: 'array', items: { type: 'string' }, description: 'Never include search results from these domains.' },
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: WebSearchTool.maxLimit,
        default: WebSearchTool.maxLimit,
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
    if (query.length < WebSearchTool.minQueryLength) throw new Error(`query must be a string of at least ${WebSearchTool.minQueryLength} characters`);
    if (query.length > WebSearchTool.maxQueryLength) throw new Error(`query is longer than ${WebSearchTool.maxQueryLength} characters`);
    const limit = args.limit ?? WebSearchTool.maxLimit;
    if (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 1 || limit > WebSearchTool.maxLimit) {
      throw new Error(`limit must be an integer from 1 to ${WebSearchTool.maxLimit}`);
    }
    return { query, limit, domains: DomainFilter.parse(args.allowed_domains, args.blocked_domains) };
  }

  static format(query: string, outcome: SearchOutcome): string {
    const header = `DuckDuckGo via Growser, ${JSON.stringify(query)}: ${outcome.results.length} results`;
    const entries = outcome.results.map((result, index) =>
      [`${index + 1}. ${result.title}`, `   ${result.url}`, ...(result.snippet ? [`   ${result.snippet}`] : [])].join('\n'),
    );
    return [header, ...entries].join('\n\n');
  }

  async call(args: Record<string, unknown>): Promise<string> {
    const { query, limit, domains } = WebSearchTool.validate(args);
    const sent = [query, domains.siteOperators()].filter(Boolean).join(' ');
    await this.browser.ensureReady();
    const outcome = await this.searcher.search(sent, WebSearchTool.maxLimit);
    const results = outcome.results.filter((result) => domains.matches(result.url)).slice(0, limit);
    if (results.length > 0) return WebSearchTool.format(sent, { ...outcome, results });
    return `DuckDuckGo via Growser, ${JSON.stringify(sent)}: no results (${outcome.url})`;
  }
}
