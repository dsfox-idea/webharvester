import type { LoadedPage, TabHandle } from './extension-tabs.ts';
import { HumanCheckGate } from './human-check-gate.ts';
import { log } from './log.ts';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchOutcome {
  url: string;
  results: SearchResult[];
}

/** What the search needs from the browser: load a page in a tab, read it again, close it or hand it to the user. */
export interface PageTabs {
  load(url: string): Promise<LoadedPage>;
  html(tabId: number): Promise<string>;
  waitForLoad(tabId: number): Promise<void>;
  close(tab: TabHandle): Promise<void>;
  reveal(tabId: number): Promise<void>;
}

/** HTML character references in text and attribute values. */
export class HtmlText {
  private static readonly named: Readonly<Record<string, string>> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

  static decode(text: string): string {
    return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, body: string) => {
      if (body.startsWith('#')) {
        const code = /^#x/i.test(body) ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
        return code <= 0x10ffff ? String.fromCodePoint(code) : entity;
      }
      return HtmlText.named[body.toLowerCase()] ?? entity;
    });
  }

  /** Decodes twice: DuckDuckGo escapes result text twice (`extension&amp;#39;s`). */
  static clean(text: string): string {
    return HtmlText.decode(HtmlText.decode(text)).replace(/\s+/g, ' ').trim();
  }
}

/**
 * Pulls results out of DuckDuckGo's no-JS page (html.duckduckgo.com/html/):
 * `a.result__a` carries the title and a redirect link, the next
 * `.result__snippet` element carries the snippet. Ported from the parser of
 * dsfox-idea/multitool (bridge/import_web.py), with class names compared as
 * tokens rather than substrings.
 */
export class DuckDuckGoResults {
  private static readonly token = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w-]*)([^>]*)>|([^<]+)|</g;
  private static readonly attribute = /([^\s=/]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  private static readonly snippetEnds = new Set(['a', 'div', 'span']);

  private readonly results: SearchResult[] = [];
  private current: SearchResult | undefined;
  private mode: 'title' | 'snippet' | undefined;
  private buffer: string[] = [];

  static parse(html: string, limit = 10): SearchResult[] {
    const seen = new Set<string>();
    const kept: SearchResult[] = [];
    for (const result of new DuckDuckGoResults().scan(html)) {
      if (!result.url || seen.has(result.url) || DuckDuckGoResults.isDuckDuckGo(result.url)) continue;
      seen.add(result.url);
      kept.push(result);
      if (kept.length >= limit) break;
    }
    return kept;
  }

  /** DuckDuckGo's "Unfortunately, bots use DuckDuckGo too" page: a human check in place of results. */
  static isChallenge(html: string): boolean {
    return /\banomaly-modal\b/.test(html) || /confirm this search was made by a human/i.test(html);
  }

  /** DuckDuckGo wraps result links as //duckduckgo.com/l/?uddg=<real url>&rut=... */
  static realUrl(href: string): string {
    if (!href.includes('uddg=')) return href;
    try {
      return new URL(href.startsWith('//') ? `https:${href}` : href, 'https://duckduckgo.com/').searchParams.get('uddg') || href;
    } catch {
      return href;
    }
  }

  /** Ads (duckduckgo.com/y.js) and internal links; a relative or broken url counts as internal. */
  private static isDuckDuckGo(url: string): boolean {
    try {
      return /(^|\.)duckduckgo\.com$/.test(new URL(url).hostname);
    } catch {
      return true;
    }
  }

  private static attributes(source: string): Map<string, string> {
    const attributes = new Map<string, string>();
    for (const [, name, doubleQuoted, singleQuoted, bare] of source.matchAll(DuckDuckGoResults.attribute)) {
      attributes.set(name.toLowerCase(), HtmlText.decode(doubleQuoted ?? singleQuoted ?? bare ?? ''));
    }
    return attributes;
  }

  private scan(html: string): SearchResult[] {
    for (const [whole, closing, tag, attributes, text] of html.matchAll(DuckDuckGoResults.token)) {
      if (text !== undefined || whole === '<') {
        if (this.mode) this.buffer.push(text ?? whole);
      } else if (tag !== undefined) {
        if (closing) this.endTag(tag.toLowerCase());
        else this.startTag(tag.toLowerCase(), DuckDuckGoResults.attributes(attributes));
      }
    }
    this.flushPending();
    return this.results;
  }

  private startTag(tag: string, attributes: Map<string, string>): void {
    const classes = (attributes.get('class') ?? '').split(/\s+/);
    if (tag === 'a' && classes.includes('result__a')) {
      this.flushPending();
      this.current = { title: '', url: DuckDuckGoResults.realUrl(attributes.get('href') ?? ''), snippet: '' };
      this.begin('title');
    } else if (classes.includes('result__snippet')) {
      this.begin('snippet');
    }
  }

  private endTag(tag: string): void {
    if (this.mode === 'title' && tag === 'a') {
      if (this.current) this.current.title = HtmlText.clean(this.buffer.join(''));
      this.mode = undefined;
    } else if (this.mode === 'snippet' && DuckDuckGoResults.snippetEnds.has(tag)) {
      if (this.current) {
        this.current.snippet = HtmlText.clean(this.buffer.join(''));
        this.results.push(this.current);
        this.current = undefined;
      }
      this.mode = undefined;
    }
  }

  private begin(mode: 'title' | 'snippet'): void {
    this.mode = mode;
    this.buffer = [];
  }

  /** Keeps a result whose snippet never closed: a title and url still have value. */
  private flushPending(): void {
    if (this.current?.title) this.results.push(this.current);
    this.current = undefined;
  }
}

/**
 * Searches DuckDuckGo's no-JS page in a visible tab of the user's Growser,
 * the way the user would, and parses the rendered HTML here. A human check is
 * never answered by this code: HumanCheckGate waits for it or falls back.
 */
export class DuckDuckGoSearch {
  static readonly endpoint = 'https://html.duckduckgo.com/html/';

  private readonly tabs: PageTabs;
  private readonly gate: HumanCheckGate;

  constructor(tabs: PageTabs, gate: HumanCheckGate = new HumanCheckGate(tabs)) {
    this.tabs = tabs;
    this.gate = gate;
  }

  static url(query: string): string {
    return `${DuckDuckGoSearch.endpoint}?q=${encodeURIComponent(query)}`;
  }

  async search(query: string, limit: number): Promise<SearchOutcome> {
    const url = DuckDuckGoSearch.url(query);
    const page = await this.tabs.load(url);
    const html = await this.gate.pass(page, 'DuckDuckGo', page.html, DuckDuckGoResults.isChallenge, () => this.tabs.html(page.tabId), {
      tool: 'WebSearch',
    });
    await this.tabs.close(page);
    const results = DuckDuckGoResults.parse(html, limit);
    log(`ddg ${JSON.stringify(query)}: ${html.length} chars, ${results.length} results`);
    return { url, results };
  }
}
