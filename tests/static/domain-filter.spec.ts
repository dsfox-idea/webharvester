import { expect, test } from '@playwright/test';
import { DomainFilter } from '../../plugin/server/domain-filter.ts';

test.describe('DomainFilter', () => {
  test('normalises domains given as host, www host, wildcard or URL, and drops duplicates', () => {
    const filter = DomainFilter.parse(['BMW-M.com', 'www.bmwusa.com', '*.bmw.de', 'https://www.auto-data.net/en/x', 'bmw-m.com'], undefined);
    expect(filter.allowed).toEqual(['bmw-m.com', 'bmwusa.com', 'bmw.de', 'auto-data.net']);
    expect(filter.blocked).toEqual([]);
  });

  test('rejects what is not a list of domains', () => {
    expect(() => DomainFilter.parse('bmw.com', undefined)).toThrow(/allowed_domains must be a list of domains/);
    expect(() => DomainFilter.parse(undefined, [42])).toThrow(/blocked_domains must contain strings/);
    for (const bad of ['', 'localhost', 'bmw com', 'site:bmw.com', 'http://']) {
      expect(() => DomainFilter.parse([bad], undefined), bad).toThrow(/is not a domain/);
    }
    expect(() => DomainFilter.parse(Array.from({ length: 21 }, (_, index) => `d${index}.com`), undefined)).toThrow(/at most 20/);
  });

  test('builds DuckDuckGo site operators: one, several ORed, and exclusions', () => {
    expect(DomainFilter.parse(undefined, undefined).siteOperators()).toBe('');
    expect(DomainFilter.parse(['a.com'], undefined).siteOperators()).toBe('site:a.com');
    expect(DomainFilter.parse(['a.com', 'b.org'], ['c.net']).siteOperators()).toBe('(site:a.com OR site:b.org) -site:c.net');
  });

  test('a domain covers its subdomains but not look-alikes', () => {
    const filter = DomainFilter.parse(['bmwusa.com'], ['shop.bmwusa.com']);
    expect(filter.matches('https://www.bmwusa.com/x')).toBe(true);
    expect(filter.matches('https://bmwusa.com/')).toBe(true);
    expect(filter.matches('https://shop.bmwusa.com/parts')).toBe(false);
    expect(filter.matches('https://notbmwusa.com/')).toBe(false);
    expect(filter.matches('https://bmwusa.com.evil.example/')).toBe(false);
    expect(filter.matches('not a url')).toBe(false);
    expect(DomainFilter.parse(undefined, undefined).matches('https://any.example/')).toBe(true);
  });
});
