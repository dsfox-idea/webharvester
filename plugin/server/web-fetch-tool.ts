import type { BrowserGate } from './growser.ts';
import type { ToolDefinition } from './mcp-server.ts';
import type { PageLink, PageSnapshot } from './page-scripts.ts';

export interface PageSource {
  fetch(url: string): Promise<PageSnapshot>;
}

interface FetchRequest {
  url: string;
  maxLength: number;
  startIndex: number;
  includeLinks: boolean;
}

/** The `web_fetch` MCP tool: a page's visible text, read through the user's Growser. */
export class WebFetchTool implements ToolDefinition {
  static readonly defaultMaxLength = 20_000;
  static readonly maxMaxLength = 100_000;
  static readonly maxLinks = 300;

  readonly name = 'web_fetch';
  readonly description =
    "Read a web page through the user's own Growser browser: opens the URL in a visible tab of the user's session " +
    '(their cookies and logins), waits for it to render, returns the title, final URL and visible text, and closes the ' +
    'tab. Prefer this over the built-in WebFetch. Long pages come in slices: call again with start_index to continue. ' +
    'Starts Growser if it is not running. If the site shows a human check, the tab is left open for the user and the ' +
    'call fails; never solve such a check yourself.';
  readonly inputSchema = {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'http or https URL of the page.' },
      max_length: {
        type: 'integer',
        minimum: 1,
        maximum: WebFetchTool.maxMaxLength,
        default: WebFetchTool.defaultMaxLength,
        description: 'Maximum number of characters of text to return.',
      },
      start_index: { type: 'integer', minimum: 0, default: 0, description: 'Character offset to start from, to continue a truncated page.' },
      include_links: { type: 'boolean', default: false, description: 'Append the page links (text and URL).' },
    },
    required: ['url'],
    additionalProperties: false,
  };

  private readonly browser: BrowserGate;
  private readonly pages: PageSource;

  constructor(browser: BrowserGate, pages: PageSource) {
    this.browser = browser;
    this.pages = pages;
  }

  static validate(args: Record<string, unknown>): FetchRequest {
    const raw = typeof args.url === 'string' ? args.url.trim() : '';
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      throw new Error('url must be an absolute http or https URL');
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error(`url must be http or https, not ${url.protocol}`);
    return {
      url: url.href,
      maxLength: WebFetchTool.integer(args.max_length, 'max_length', WebFetchTool.defaultMaxLength, 1, WebFetchTool.maxMaxLength),
      startIndex: WebFetchTool.integer(args.start_index, 'start_index', 0, 0, Number.MAX_SAFE_INTEGER),
      includeLinks: WebFetchTool.flag(args.include_links, 'include_links'),
    };
  }

  static format(page: PageSnapshot, request: FetchRequest): string {
    const total = page.text.length;
    if (request.startIndex > 0 && request.startIndex >= total) {
      throw new Error(`start_index ${request.startIndex} is past the end of the text (${total} characters)`);
    }
    const end = Math.min(total, request.startIndex + request.maxLength);
    const range =
      end < total
        ? `characters ${request.startIndex}-${end} of ${total}; call again with start_index=${end} for more`
        : `characters ${request.startIndex}-${end} of ${total}`;
    const parts = [`Title: ${page.title}`, `URL: ${page.url}`, `Text: ${range}`, '', page.text.slice(request.startIndex, end)];
    if (request.includeLinks) parts.push('', WebFetchTool.linkList(page));
    return parts.join('\n');
  }

  private static linkList(page: PageSnapshot): string {
    const firstByHref = new Map<string, PageLink>();
    for (const link of page.links) if (!firstByHref.has(link.href)) firstByHref.set(link.href, link);
    const unique = [...firstByHref.values()];
    const shown = unique.slice(0, WebFetchTool.maxLinks).map((link, index) => `${index + 1}. ${link.text || '(no text)'} - ${link.href}`);
    const more = unique.length > shown.length ? [`... ${unique.length - shown.length} more`] : [];
    return [`Links: ${unique.length}`, ...shown, ...more].join('\n');
  }

  private static integer(value: unknown, name: string, fallback: number, min: number, max: number): number {
    const number = value ?? fallback;
    if (typeof number !== 'number' || !Number.isInteger(number) || number < min || number > max) {
      throw new Error(`${name} must be an integer from ${min} to ${max}`);
    }
    return number;
  }

  private static flag(value: unknown, name: string): boolean {
    if (value === undefined || value === null) return false;
    if (typeof value !== 'boolean') throw new Error(`${name} must be true or false`);
    return value;
  }

  async call(args: Record<string, unknown>): Promise<string> {
    const request = WebFetchTool.validate(args);
    await this.browser.ensureReady();
    return WebFetchTool.format(await this.pages.fetch(request.url), request);
  }
}
