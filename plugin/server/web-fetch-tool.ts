import type { BrowserGate } from './growser.ts';
import type { ToolDefinition } from './mcp-server.ts';
import type { PageDigest } from './page-digest.ts';
import type { ReadPage } from './page-fetcher.ts';
import type { PageLink, PageSnapshot } from './page-scripts.ts';

export interface PageSource {
  /** `reuse`: a recent snapshot of the URL will do. */
  fetch(url: string, reuse: boolean): Promise<ReadPage>;
}

interface FetchRequest {
  url: string;
  maxLength: number;
  startIndex: number;
  includeLinks: boolean;
  prompt: string | undefined;
}

/** The `web_fetch` MCP tool: a page's main content as Markdown, or an answer about it, read through the user's Growser. */
export class WebFetchTool implements ToolDefinition {
  static readonly defaultMaxLength = 20_000;
  static readonly maxMaxLength = 100_000;
  static readonly maxPromptLength = 5_000;
  static readonly maxLinks = 300;

  readonly name = 'web_fetch';
  readonly description =
    "Read a web page through the user's own Growser browser: opens the URL in a visible tab of the user's session " +
    '(their cookies and logins), waits for it to render, and returns the title, final URL, the HTTP status if it is ' +
    'not 2xx, and the main content as ' +
    'Markdown (headings, links, lists, code, tables; navigation and hidden parts left out), then closes the tab. With ' +
    '`prompt`, like the built-in WebFetch, the page goes to Claude Haiku and only its answer comes back (saves context, ' +
    'takes a few seconds more). JSON and plain-text URLs come back as raw text; PDFs are not supported. Prefer this ' +
    'over the built-in WebFetch. Long pages come in slices: call again with start_index to continue, which reuses the ' +
    'page read in the last 15 minutes. Starts Growser if it is not running. If the site shows a human check, the tool ' +
    'waits up to 15 s for it to clear (the user may complete it in Growser); if it stays, the tool says so and the ' +
    'built-in WebFetch may read that site instead. Never solve such a check yourself.';
  readonly inputSchema = {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'http or https URL of the page.' },
      prompt: {
        type: 'string',
        description:
          'Optional question or instruction about the page. The page (up to 200,000 characters) goes to Claude Haiku and ' +
          'only its answer is returned; max_length and start_index are then ignored.',
      },
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
  private readonly digest: PageDigest;

  constructor(browser: BrowserGate, pages: PageSource, digest: PageDigest) {
    this.browser = browser;
    this.pages = pages;
    this.digest = digest;
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
      prompt: WebFetchTool.prompt(args.prompt),
    };
  }

  static format({ page, readAt }: ReadPage, request: FetchRequest, now: number = Date.now()): string {
    const total = page.text.length;
    if (request.startIndex > 0 && request.startIndex >= total) {
      throw new Error(`start_index ${request.startIndex} is past the end of the text (${total} characters)`);
    }
    const end = Math.min(total, request.startIndex + request.maxLength);
    const range =
      end < total
        ? `characters ${request.startIndex}-${end} of ${total}; call again with start_index=${end} for more`
        : `characters ${request.startIndex}-${end} of ${total}`;
    const parts = [...WebFetchTool.header(page, readAt, now), `Text: ${range}`, '', page.text.slice(request.startIndex, end)];
    if (request.includeLinks) parts.push('', WebFetchTool.linkList(page));
    return parts.join('\n');
  }

  static formatAnswer({ page, readAt }: ReadPage, request: FetchRequest, answer: { text: string; model: string }, now: number = Date.now()): string {
    const parts = [...WebFetchTool.header(page, readAt, now), `Answer: by ${answer.model} from ${page.text.length} characters of the page`, '', answer.text];
    if (request.includeLinks) parts.push('', WebFetchTool.linkList(page));
    return parts.join('\n');
  }

  private static header(page: PageSnapshot, readAt: number, now: number): string[] {
    const age = Math.round((now - readAt) / 1000);
    // An error page reads like any other page; only its status tells.
    const status = page.status > 0 && (page.status < 200 || page.status > 299) ? `, HTTP ${page.status}` : '';
    return [
      `Title: ${page.title}`,
      `URL: ${page.url}`,
      `Content: ${page.scope === 'main' ? 'main content of the page' : 'whole page'}, ${page.contentType}${status}${age > 0 ? `, read ${age} s ago` : ''}`,
    ];
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

  private static prompt(value: unknown): string | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value !== 'string' || value.trim() === '') throw new Error('prompt must be a non-empty string');
    if (value.length > WebFetchTool.maxPromptLength) throw new Error(`prompt is longer than ${WebFetchTool.maxPromptLength} characters`);
    return value.trim();
  }

  async call(args: Record<string, unknown>): Promise<string> {
    const request = WebFetchTool.validate(args);
    await this.browser.ensureReady();
    const read = await this.pages.fetch(request.url, request.startIndex > 0 && request.prompt === undefined);
    if (request.prompt === undefined) return WebFetchTool.format(read, request);
    const shownAt = Date.now(); // the page's age is not the time the model took
    return WebFetchTool.formatAnswer(read, request, await this.digest.answer(request.prompt, read.page), shownAt);
  }
}
