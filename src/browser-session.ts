import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { AvailabilityRules, type Channel, type Environment } from './availability.ts';
import { ChannelDetector } from './channel-detector.ts';
import { ExtensionIdentity } from './extension-id.ts';
import { ManifestBuilder } from './manifest-builder.ts';
import type { ProbeReport } from './probe-report.ts';

export interface SessionOptions {
  extensionPath: string;
  /** Browser binary; default: Playwright's bundled Chrome for Testing. Launch mode only. */
  executablePath?: string;
  /** Profile directory; default: a fresh one under .playwright-profile/. Launch mode only. */
  userDataDir?: string;
  /** DevTools endpoint of a running browser that already has the extension loaded. Selects attach mode. */
  cdpUrl?: string;
  headless: boolean;
  /** Overrides channel detection (needed in attach mode and on non-mac hosts with a custom binary). */
  channel?: Channel;
}

export type SessionMode = 'launch' | 'attach';

/**
 * Opens the browser the live tests talk to and loads the extension through the
 * CDP `Extensions.loadUnpacked` command, which needs
 * --enable-unsafe-extension-debugging and works in Chromium, Chrome for
 * Testing and branded Google Chrome (the latter dropped --load-extension in
 * 137). Launch mode starts the browser itself; attach mode connects to a
 * running one (CDP_URL) and loads the extension if that browser allows it,
 * otherwise expects it to have been loaded by hand.
 */
export class BrowserSession {
  static readonly extensionPath = fileURLToPath(new URL('../extension', import.meta.url));
  static readonly profileRoot = fileURLToPath(new URL('../.playwright-profile', import.meta.url));

  readonly options: SessionOptions;
  readonly mode: SessionMode;
  readonly extensionId: string;
  private browser?: Browser;
  private browserContext?: BrowserContext;
  private env?: Environment;

  constructor(options: SessionOptions) {
    this.options = options;
    this.mode = options.cdpUrl ? 'attach' : 'launch';
    this.extensionId = ExtensionIdentity.fromManifest(ManifestBuilder.readManifest(join(options.extensionPath, 'manifest.json')));
  }

  static fromEnv(env: NodeJS.ProcessEnv = process.env): BrowserSession {
    return new BrowserSession({
      extensionPath: BrowserSession.extensionPath,
      executablePath: env.CHROME_PATH || undefined,
      userDataDir: env.USER_DATA_DIR || undefined,
      cdpUrl: env.CDP_URL || undefined,
      headless: env.HEADED !== '1',
      channel: (env.CHANNEL as Channel | undefined) || undefined,
    });
  }

  get context(): BrowserContext {
    if (!this.browserContext) throw new Error('BrowserSession is not open');
    return this.browserContext;
  }

  get environment(): Environment {
    if (!this.env) throw new Error('BrowserSession is not open');
    return this.env;
  }

  async open(): Promise<void> {
    if (this.mode === 'attach') await this.attach();
    else await this.launch();
  }

  async close(): Promise<void> {
    await this.browserContext?.close();
    await this.browser?.close();
  }

  /** Opens probe.html and waits for the in-extension probe run to finish. */
  async runProbes(): Promise<ProbeReport> {
    const page = await this.openProbePage();
    await page.waitForFunction(() => (window as unknown as { __webharvester?: { lastReport: unknown } }).__webharvester?.lastReport, null, { timeout: 60_000 });
    const report = await page.evaluate(() => (window as unknown as { __webharvester: { lastReport: ProbeReport } }).__webharvester.lastReport);
    await page.close();
    return report;
  }

  async openProbePage(): Promise<Page> {
    const page = await this.context.newPage();
    await page.goto(`chrome-extension://${this.extensionId}/probe.html`);
    return page;
  }

  private async launch(): Promise<void> {
    const executablePath = this.options.executablePath ?? chromium.executablePath();
    const userDataDir = this.options.userDataDir ?? BrowserSession.freshProfileDir();
    console.log(`[session] launch ${executablePath}\n[session] profile ${userDataDir}\n[session] headless ${this.options.headless}`);
    this.browserContext = await chromium.launchPersistentContext(userDataDir, {
      headless: this.options.headless,
      channel: this.options.executablePath ? undefined : 'chromium',
      executablePath: this.options.executablePath,
      args: ['--enable-unsafe-extension-debugging'],
      // Playwright disables extensions by default; the loaded extension would exist but stay disabled.
      ignoreDefaultArgs: ['--disable-extensions'],
    });
    this.env = this.detectEnvironment(executablePath);
    await this.loadUnpacked();
    await this.waitForServiceWorker();
  }

  private async attach(): Promise<void> {
    console.log(`[session] attach ${this.options.cdpUrl}`);
    this.browser = await chromium.connectOverCDP(this.options.cdpUrl!);
    this.browserContext = this.browser.contexts()[0] ?? (await this.browser.newContext());
    this.env = this.detectEnvironment(undefined);
    try {
      await this.loadUnpacked();
    } catch (error) {
      console.warn(`[session] could not load the extension over CDP (${(error as Error).message}); assuming it was loaded by hand`);
    }
  }

  /** Asks the browser to load the unpacked extension; Chromium answers with the id or the manifest error. */
  private async loadUnpacked(): Promise<void> {
    const browser = this.browserContext?.browser() ?? this.browser;
    if (!browser) throw new Error('No Browser object to open a CDP session on');
    const cdp = await browser.newBrowserCDPSession();
    try {
      const { id } = await cdp.send('Extensions.loadUnpacked', { path: this.options.extensionPath });
      if (id !== this.extensionId) {
        throw new Error(`Loaded extension id ${id} differs from the id derived from manifest.key ${this.extensionId}`);
      }
      console.log(`[session] loaded unpacked extension ${id}`);
    } catch (error) {
      throw new Error(`Extensions.loadUnpacked failed for ${this.options.extensionPath}: ${(error as Error).message.split('\n')[0]}`);
    } finally {
      await cdp.detach();
    }
  }

  private async waitForServiceWorker(timeoutMs = 30_000): Promise<void> {
    const url = `chrome-extension://${this.extensionId}/background.js`;
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (this.context.serviceWorkers().some((worker) => worker.url() === url)) return;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    throw new Error(`Service worker ${url} did not start within ${timeoutMs}ms`);
  }

  private detectEnvironment(executablePath: string | undefined): Environment {
    let channel = this.options.channel;
    if (!channel && executablePath) channel = new ChannelDetector().detect(executablePath);
    if (!channel) {
      channel = 'stable';
      console.warn('[session] channel unknown; assuming stable. Set CHANNEL=unknown|canary|dev|beta|stable to override.');
    }
    const env = AvailabilityRules.chromeForTesting({ channel });
    console.log(`[session] environment ${JSON.stringify(env)}`);
    return env;
  }

  private static freshProfileDir(): string {
    const dir = join(BrowserSession.profileRoot, `profile-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    return dir;
  }
}
