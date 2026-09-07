/**
 * Chromium feature files (`_permission_features.json`, `_api_features.json`)
 * are JSON with `//` and `/* *\/` comments and occasional trailing commas:
 * Chromium reads them with base::JSONReader in JSON_ALLOW_COMMENTS mode.
 * This parser strips both, respecting string literals.
 */
export class ChromiumJson {
  static parse<T>(text: string): T {
    return JSON.parse(ChromiumJson.strip(text)) as T;
  }

  static strip(text: string): string {
    return ChromiumJson.removeTrailingCommas(ChromiumJson.removeComments(text));
  }

  private static removeComments(text: string): string {
    let out = '';
    let i = 0;
    while (i < text.length) {
      const c = text[i];
      if (c === '"') {
        const end = ChromiumJson.stringEnd(text, i);
        out += text.slice(i, end);
        i = end;
      } else if (text.startsWith('//', i)) {
        i = ChromiumJson.lineEnd(text, i);
      } else if (text.startsWith('/*', i)) {
        const close = text.indexOf('*/', i + 2);
        i = close < 0 ? text.length : close + 2;
      } else {
        out += c;
        i += 1;
      }
    }
    return out;
  }

  private static removeTrailingCommas(text: string): string {
    let out = '';
    let i = 0;
    while (i < text.length) {
      const c = text[i];
      if (c === '"') {
        const end = ChromiumJson.stringEnd(text, i);
        out += text.slice(i, end);
        i = end;
      } else if (c === ',') {
        let j = i + 1;
        while (j < text.length && /\s/.test(text[j])) j += 1;
        if (text[j] === '}' || text[j] === ']') {
          i += 1; // drop the comma, keep the whitespace
        } else {
          out += c;
          i += 1;
        }
      } else {
        out += c;
        i += 1;
      }
    }
    return out;
  }

  private static stringEnd(text: string, start: number): number {
    let i = start + 1;
    while (i < text.length) {
      if (text[i] === '\\') {
        i += 2;
      } else if (text[i] === '"') {
        return i + 1;
      } else {
        i += 1;
      }
    }
    throw new Error(`Unterminated string literal at offset ${start}`);
  }

  private static lineEnd(text: string, start: number): number {
    const newline = text.indexOf('\n', start);
    return newline < 0 ? text.length : newline;
  }
}
