import { expect, test } from '@playwright/test';
import { ChromiumJson } from '../../src/chromium-json.ts';

test.describe('ChromiumJson', () => {
  test('strips line and block comments outside strings', () => {
    const text = `{
      // leading comment
      "a": 1, /* inline */ "b": "x // not a comment",
      "c": "y /* nor this */"
    }`;
    expect(ChromiumJson.parse(text)).toEqual({ a: 1, b: 'x // not a comment', c: 'y /* nor this */' });
  });

  test('removes trailing commas in objects and arrays but keeps commas in strings', () => {
    const text = `{ "list": [1, 2, ], "s": "a, ]", "o": { "k": true, }, }`;
    expect(ChromiumJson.parse(text)).toEqual({ list: [1, 2], s: 'a, ]', o: { k: true } });
  });

  test('handles escaped quotes inside strings', () => {
    expect(ChromiumJson.parse(`{ "q": "say \\"hi\\" // still string" }`)).toEqual({ q: 'say "hi" // still string' });
  });

  test('rejects unterminated strings', () => {
    expect(() => ChromiumJson.parse(`{ "q": "open`)).toThrow(/Unterminated/);
  });
});
