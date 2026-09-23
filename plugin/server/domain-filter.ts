/**
 * `allowed_domains` / `blocked_domains` of web_search, with the semantics of the
 * built-in WebSearch: a domain also covers its subdomains. The search engine is
 * asked through `site:` operators, and every result is checked again here.
 */
export class DomainFilter {
  static readonly maxDomains = 20;

  readonly allowed: readonly string[];
  readonly blocked: readonly string[];

  private constructor(allowed: readonly string[], blocked: readonly string[]) {
    this.allowed = allowed;
    this.blocked = blocked;
  }

  static parse(allowed: unknown, blocked: unknown): DomainFilter {
    return new DomainFilter(DomainFilter.list(allowed, 'allowed_domains'), DomainFilter.list(blocked, 'blocked_domains'));
  }

  /** DuckDuckGo ORs parenthesised `site:` terms and drops `-site:` ones. */
  siteOperators(): string {
    const allowed =
      this.allowed.length === 0 ? [] : this.allowed.length === 1 ? [`site:${this.allowed[0]}`] : [`(${this.allowed.map((domain) => `site:${domain}`).join(' OR ')})`];
    return [...allowed, ...this.blocked.map((domain) => `-site:${domain}`)].join(' ');
  }

  matches(url: string): boolean {
    let host: string;
    try {
      host = new URL(url).hostname.toLowerCase();
    } catch {
      return false;
    }
    if (this.allowed.length > 0 && !this.allowed.some((domain) => DomainFilter.covers(domain, host))) return false;
    return !this.blocked.some((domain) => DomainFilter.covers(domain, host));
  }

  private static covers(domain: string, host: string): boolean {
    return host === domain || host.endsWith(`.${domain}`);
  }

  private static list(value: unknown, name: string): string[] {
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value)) throw new Error(`${name} must be a list of domains`);
    if (value.length > DomainFilter.maxDomains) throw new Error(`${name} takes at most ${DomainFilter.maxDomains} domains`);
    return [...new Set(value.map((item) => DomainFilter.domain(item, name)))];
  }

  /** Accepts "example.com", "www.example.com", "*.example.com" or a URL; returns "example.com". */
  private static domain(item: unknown, name: string): string {
    if (typeof item !== 'string') throw new Error(`${name} must contain strings`);
    const trimmed = item.trim().toLowerCase();
    let host = trimmed.replace(/^\*\./, '');
    if (/^[a-z][a-z0-9+.-]*:\/\//.test(trimmed)) {
      try {
        host = new URL(trimmed).hostname;
      } catch {
        throw new Error(`${name}: "${item}" is not a domain`);
      }
    }
    host = host.split('/')[0].replace(/^www\./, '');
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host)) throw new Error(`${name}: "${item}" is not a domain`);
    return host;
  }
}
