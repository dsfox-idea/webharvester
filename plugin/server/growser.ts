import { execFile, spawn } from 'node:child_process';
import { lstatSync } from 'node:fs';
import { posix, win32 } from 'node:path';
import { promisify } from 'node:util';
import { log } from './log.ts';

const execFileAsync = promisify(execFile);

/** What a tool needs before it touches the browser. */
export interface BrowserGate {
  /** Resolves once the browser answers; may start it. */
  ensureReady(): Promise<string>;
}

export interface CdpTarget {
  id: string;
  type: string;
  url: string;
  webSocketDebuggerUrl: string;
}

/** The DevTools HTTP endpoint of a running Growser (default http://127.0.0.1:9222, or GROWSER_CDP_URL). */
export class GrowserEndpoint {
  static readonly defaultUrl = 'http://127.0.0.1:9222';

  readonly baseUrl: string;

  constructor(baseUrl: string = GrowserEndpoint.defaultUrl) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  static fromEnv(env: NodeJS.ProcessEnv): GrowserEndpoint {
    return new GrowserEndpoint(env.GROWSER_CDP_URL || GrowserEndpoint.defaultUrl);
  }

  get port(): number {
    const url = new URL(this.baseUrl);
    return Number(url.port || (url.protocol === 'https:' ? 443 : 80));
  }

  get isLocal(): boolean {
    return ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(this.baseUrl).hostname);
  }

  /** The "Browser" line of /json/version, or undefined when nothing answers. */
  async version(): Promise<string | undefined> {
    try {
      const response = await fetch(`${this.baseUrl}/json/version`, { signal: AbortSignal.timeout(2_000) });
      if (!response.ok) return undefined;
      return ((await response.json()) as { Browser: string }).Browser;
    } catch {
      return undefined;
    }
  }

  async targets(): Promise<CdpTarget[]> {
    return (await this.request('/json/list')) as CdpTarget[];
  }

  /** Opens a tab; Chromium accepts /json/new only as PUT. */
  async newTab(url = 'about:blank'): Promise<CdpTarget> {
    return (await this.request(`/json/new?${url}`, 'PUT')) as CdpTarget;
  }

  async closeTarget(id: string): Promise<void> {
    await this.request(`/json/close/${id}`, 'GET', false);
  }

  private async request(path: string, method = 'GET', json = true): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}${path}`, { method, signal: AbortSignal.timeout(5_000) });
    if (!response.ok) throw new Error(`${method} ${this.baseUrl}${path} answered ${response.status}`);
    return json ? response.json() : response.text();
  }
}

/**
 * Starts Growser with the bundled extension and the DevTools port, but only
 * when Growser is not running at all: Chromium hands the arguments of a second
 * launch to the running process and silently drops the flags.
 */
export class GrowserLauncher implements BrowserGate {
  private readonly endpoint: GrowserEndpoint;
  private readonly env: NodeJS.ProcessEnv;
  private readonly platform: NodeJS.Platform;

  constructor(endpoint: GrowserEndpoint, env: NodeJS.ProcessEnv = process.env, platform: NodeJS.Platform = process.platform) {
    this.endpoint = endpoint;
    this.env = env;
    this.platform = platform;
  }

  get arguments(): string[] {
    return ['--enable-webharvester', `--remote-debugging-port=${this.endpoint.port}`];
  }

  /** Binary locations to try: GROWSER_PATH first, then where the Store, the installer or setup.sh put Growser. */
  candidates(): string[] {
    const explicit = this.env.GROWSER_PATH ? [this.env.GROWSER_PATH] : [];
    switch (this.platform) {
      case 'win32': {
        const local = this.env.LOCALAPPDATA ?? '';
        return [
          ...explicit,
          win32.join(local, 'Microsoft', 'WindowsApps', 'growser.exe'),
          win32.join(local, 'Growser', 'Application', 'growser.exe'),
          win32.join(this.env.ProgramFiles ?? 'C:\\Program Files', 'Growser', 'Application', 'growser.exe'),
        ];
      }
      case 'darwin':
        return [
          ...explicit,
          '/Applications/Growser.app/Contents/MacOS/Growser',
          posix.join(this.env.HOME ?? '', 'Applications', 'Growser.app', 'Contents', 'MacOS', 'Growser'),
        ];
      default:
        return [
          ...explicit,
          ...(this.env.PATH ?? '')
            .split(posix.delimiter)
            .filter(Boolean)
            .flatMap((dir) => [posix.join(dir, 'growser'), posix.join(dir, 'growser-browser')]),
        ];
    }
  }

  findBinary(): string | undefined {
    // lstat, not existsSync: a Microsoft Store app alias is a reparse point that stat() refuses with EACCES.
    return this.candidates().find((path) => {
      try {
        lstatSync(path);
        return true;
      } catch {
        return false;
      }
    });
  }

  async isRunning(): Promise<boolean> {
    try {
      if (this.platform === 'win32') {
        const { stdout } = await execFileAsync('tasklist', ['/FI', 'IMAGENAME eq growser.exe', '/FO', 'CSV', '/NH']);
        return /"growser\.exe"/i.test(stdout);
      }
      await execFileAsync('pgrep', ['-x', this.platform === 'darwin' ? 'Growser' : 'growser(-browser)?']);
      return true;
    } catch {
      return false; // pgrep exits 1 when nothing matches
    }
  }

  /** Makes sure the DevTools endpoint answers, starting Growser if it is not running. Returns the browser line. */
  async ensureReady(timeoutMs = 30_000): Promise<string> {
    const answering = await this.endpoint.version();
    if (answering) return answering;
    const flags = this.arguments.join(' ');
    if (!this.endpoint.isLocal) throw new Error(`Nothing answers at ${this.endpoint.baseUrl}; start Growser there with ${flags}`);
    if (await this.isRunning()) {
      throw new Error(
        `Growser is running without the DevTools port ${this.endpoint.port}. Close every Growser window and retry: ` +
          `web_search then starts it with ${flags}.`,
      );
    }
    const binary = this.findBinary();
    if (!binary) throw new Error(`Growser not found (tried ${this.candidates().join(', ')}); install it or set GROWSER_PATH`);
    return this.launch(binary, timeoutMs);
  }

  private async launch(binary: string, timeoutMs: number): Promise<string> {
    log(`launching ${binary} ${this.arguments.join(' ')}`);
    let spawnError: Error | undefined;
    const child = spawn(binary, this.arguments, { detached: true, stdio: 'ignore' });
    child.on('error', (error) => (spawnError = error));
    child.unref();
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (spawnError) throw new Error(`Could not start ${binary}: ${spawnError.message}`);
      const version = await this.endpoint.version();
      if (version) {
        log(`Growser answers: ${version}`);
        return version;
      }
    }
    throw new Error(`Started ${binary}, but ${this.endpoint.baseUrl} did not answer within ${timeoutMs} ms`);
  }
}
