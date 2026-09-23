import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { FallbackPass } from '../../plugin/server/fallback-pass.ts';

/** A clock the test moves by hand. */
class Clock {
  time = 1_000_000;

  readonly now = (): number => this.time;
}

const tempFile = () => join(mkdtempSync(join(tmpdir(), 'fallback-pass-')), 'pass.json');

test.describe('FallbackPass', () => {
  test('allows nothing without a grant, a missing file or a broken one', () => {
    const file = tempFile();
    expect(new FallbackPass(file).allows('WebSearch')).toBe(false);
    writeFileSync(file, 'not json');
    expect(new FallbackPass(file).allows('WebSearch')).toBe(false);
    writeFileSync(file, '{"tool":"WebSearch"}');
    expect(new FallbackPass(file).allows('WebSearch')).toBe(false);
  });

  test('a WebSearch grant covers any search and no fetch', () => {
    const pass = new FallbackPass(tempFile());
    pass.grant('WebSearch');
    expect(pass.allows('WebSearch')).toBe(true);
    expect(pass.allows('WebFetch', 'news.example')).toBe(false);
  });

  test('a WebFetch grant covers its host only, in any letter case', () => {
    const pass = new FallbackPass(tempFile());
    pass.grant('WebFetch', 'News.Example');
    expect(pass.allows('WebFetch', 'news.example')).toBe(true);
    expect(pass.allows('WebFetch', 'NEWS.EXAMPLE')).toBe(true);
    expect(pass.allows('WebFetch', 'other.example')).toBe(false);
    expect(pass.allows('WebFetch')).toBe(false);
    expect(pass.allows('WebSearch')).toBe(false);
  });

  test('another process sees the grant through the file', () => {
    const file = tempFile();
    new FallbackPass(file).grant('WebFetch', 'news.example');
    expect(new FallbackPass(file).allows('WebFetch', 'news.example')).toBe(true);
  });

  test('a grant expires after ten minutes and is dropped on the next grant', () => {
    const file = tempFile();
    const clock = new Clock();
    const pass = new FallbackPass(file, clock.now);
    pass.grant('WebSearch');
    clock.time += FallbackPass.ttlMs - 1;
    expect(pass.allows('WebSearch')).toBe(true);
    clock.time += 1;
    expect(pass.allows('WebSearch')).toBe(false);
    pass.grant('WebFetch', 'news.example');
    expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual([{ tool: 'WebFetch', host: 'news.example', until: clock.time + FallbackPass.ttlMs }]);
  });

  test('reads the host of a built-in tool call from its url', () => {
    expect(FallbackPass.hostOf('https://News.Example:8080/a?b=1')).toBe('news.example');
    expect(FallbackPass.hostOf('not a url')).toBeUndefined();
    expect(FallbackPass.hostOf(undefined)).toBeUndefined();
  });
});
