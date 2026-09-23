import { CdpConnection } from './cdp.ts';
import type { CdpTarget, GrowserEndpoint } from './growser.ts';
import { log } from './log.ts';

interface EvaluateReply {
  result?: { value?: unknown };
  exceptionDetails?: { text: string; exception?: { description?: string } };
}

/** Anything that can run an expression in the extension and hand back its JSON value. */
export interface ScriptRunner {
  evaluate<T>(expression: string): Promise<T>;
}

/**
 * The service worker of the webharvester extension bundled in Growser. An MV3
 * worker stops after ~30 s idle and its target leaves /json/list;
 * ServiceWorker.startWorker, sent through any page target, starts it again
 * without side effects (no tab, no extension code change).
 */
export class ExtensionWorker implements ScriptRunner {
  /** Fixed by the manifest `key`; tests/static/manifest.spec.ts pins it to extension/manifest.json. */
  static readonly webharvesterId = 'epejhconcffjigpklgfljmdfbmhodacj';

  readonly extensionId: string;
  private readonly endpoint: GrowserEndpoint;

  constructor(endpoint: GrowserEndpoint, extensionId: string = ExtensionWorker.webharvesterId) {
    this.endpoint = endpoint;
    this.extensionId = extensionId;
  }

  get scopeUrl(): string {
    return `chrome-extension://${this.extensionId}/`;
  }

  async target(): Promise<CdpTarget | undefined> {
    return (await this.endpoint.targets()).find((target) => target.type === 'service_worker' && target.url.startsWith(this.scopeUrl));
  }

  async wake(timeoutMs = 5_000): Promise<CdpTarget> {
    const running = await this.target();
    if (running) return running;
    const started = Date.now();
    const worker = await this.withPageTarget(async (page) => {
      const cdp = await CdpConnection.open(page.webSocketDebuggerUrl);
      try {
        await cdp.send('ServiceWorker.enable');
        await cdp.send('ServiceWorker.startWorker', { scopeURL: this.scopeUrl });
        return await this.waitForTarget(started + timeoutMs);
      } finally {
        await cdp.send('ServiceWorker.disable').catch(() => undefined);
        cdp.close();
      }
    });
    if (!worker) {
      throw new Error(`webharvester worker ${this.extensionId} did not start within ${timeoutMs} ms; is Growser running with --enable-webharvester?`);
    }
    log(`woke the webharvester worker in ${Date.now() - started} ms`);
    return worker;
  }

  async evaluate<T>(expression: string, timeoutMs = 30_000): Promise<T> {
    const worker = await this.wake();
    const cdp = await CdpConnection.open(worker.webSocketDebuggerUrl);
    try {
      const reply = await cdp.send<EvaluateReply>('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, timeoutMs);
      if (reply.exceptionDetails) throw new Error(reply.exceptionDetails.exception?.description ?? reply.exceptionDetails.text);
      return reply.result?.value as T;
    } finally {
      cdp.close();
    }
  }

  private async waitForTarget(deadline: number): Promise<CdpTarget | undefined> {
    while (Date.now() < deadline) {
      const worker = await this.target();
      if (worker) return worker;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return undefined;
  }

  /** Runs `action` on an open tab, or on a temporary blank one when the browser has none. */
  private async withPageTarget<T>(action: (page: CdpTarget) => Promise<T>): Promise<T> {
    const existing = (await this.endpoint.targets()).find((target) => target.type === 'page');
    if (existing) return action(existing);
    log('no open tab to reach the ServiceWorker domain; using a temporary blank tab');
    const blank = await this.endpoint.newTab();
    try {
      return await action(blank);
    } finally {
      await this.endpoint.closeTarget(blank.id);
    }
  }
}
