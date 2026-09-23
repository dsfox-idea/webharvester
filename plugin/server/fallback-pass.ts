import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export type BuiltInTool = 'WebSearch' | 'WebFetch';

interface Grant {
  tool: BuiltInTool;
  host?: string;
  until: number;
}

/**
 * Lets the built-in WebSearch or WebFetch through the web-gate hook after a
 * Growser tool met a human check it could not pass: WebSearch for any query,
 * WebFetch for the host of that page. The MCP server grants, the hook (another
 * process) checks, so the grants live in a small file in the temp directory.
 */
export class FallbackPass {
  static readonly ttlMs = 10 * 60_000;
  static readonly fileName = 'web-harvester-fallback.json';

  private readonly file: string;
  private readonly now: () => number;

  constructor(file: string = join(tmpdir(), FallbackPass.fileName), now: () => number = Date.now) {
    this.file = file;
    this.now = now;
  }

  /** The host a built-in tool call targets, from its `url` input; undefined for a search or an unreadable URL. */
  static hostOf(url: unknown): string | undefined {
    if (typeof url !== 'string') return undefined;
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return undefined;
    }
  }

  grant(tool: BuiltInTool, host?: string): void {
    const grants = this.live();
    grants.push({ tool, ...(host === undefined ? {} : { host: host.toLowerCase() }), until: this.now() + FallbackPass.ttlMs });
    writeFileSync(this.file, JSON.stringify(grants));
  }

  allows(tool: string, host?: string): boolean {
    return this.live().some((grant) => grant.tool === tool && (tool === 'WebSearch' || (host !== undefined && grant.host === host.toLowerCase())));
  }

  private live(): Grant[] {
    let stored: unknown;
    try {
      stored = JSON.parse(readFileSync(this.file, 'utf8'));
    } catch {
      return [];
    }
    if (!Array.isArray(stored)) return [];
    return stored.filter(
      (grant): grant is Grant =>
        grant !== null && typeof grant === 'object' && typeof grant.tool === 'string' && typeof grant.until === 'number' && grant.until > this.now(),
    );
  }
}
