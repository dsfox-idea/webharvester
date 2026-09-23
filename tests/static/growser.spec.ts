import { expect, test } from '@playwright/test';
import { ExtensionTabs } from '../../plugin/server/extension-tabs.ts';
import type { ScriptRunner } from '../../plugin/server/extension-worker.ts';
import { GrowserEndpoint, GrowserLauncher } from '../../plugin/server/growser.ts';

/** Nothing listens on the discard port, so the endpoint never answers. */
const silent = new GrowserEndpoint('http://127.0.0.1:9');

class StubLauncher extends GrowserLauncher {
  private readonly running: boolean;

  constructor(endpoint: GrowserEndpoint, running: boolean, env: NodeJS.ProcessEnv = {}) {
    super(endpoint, env, 'linux');
    this.running = running;
  }

  override async isRunning(): Promise<boolean> {
    return this.running;
  }
}

test.describe('GrowserEndpoint', () => {
  test('reads port and locality from the url, defaulting to 127.0.0.1:9222', () => {
    expect(GrowserEndpoint.fromEnv({}).baseUrl).toBe('http://127.0.0.1:9222');
    const custom = GrowserEndpoint.fromEnv({ GROWSER_CDP_URL: 'http://localhost:9333/' });
    expect([custom.baseUrl, custom.port, custom.isLocal]).toEqual(['http://localhost:9333', 9333, true]);
    expect(new GrowserEndpoint('http://10.0.0.5:9222').isLocal).toBe(false);
  });

  test('reports an endpoint that does not answer as undefined', async () => {
    expect(await silent.version()).toBeUndefined();
  });
});

test.describe('GrowserLauncher', () => {
  test('passes the webharvester switch and the endpoint port', () => {
    expect(new GrowserLauncher(new GrowserEndpoint('http://127.0.0.1:9333')).arguments).toEqual([
      '--enable-webharvester',
      '--remote-debugging-port=9333',
    ]);
  });

  test('looks in GROWSER_PATH first, then the Store alias and installer paths on Windows', () => {
    const launcher = new GrowserLauncher(silent, { GROWSER_PATH: 'D:\\g.exe', LOCALAPPDATA: 'C:\\Users\\u\\AppData\\Local' }, 'win32');
    expect(launcher.candidates()).toEqual([
      'D:\\g.exe',
      'C:\\Users\\u\\AppData\\Local\\Microsoft\\WindowsApps\\growser.exe',
      'C:\\Users\\u\\AppData\\Local\\Growser\\Application\\growser.exe',
      'C:\\Program Files\\Growser\\Application\\growser.exe',
    ]);
  });

  test('looks in the app bundles on macOS and on PATH on Linux', () => {
    expect(new GrowserLauncher(silent, { HOME: '/Users/u' }, 'darwin').candidates()).toEqual([
      '/Applications/Growser.app/Contents/MacOS/Growser',
      '/Users/u/Applications/Growser.app/Contents/MacOS/Growser',
    ]);
    expect(new GrowserLauncher(silent, { PATH: '/usr/bin:/opt/g' }, 'linux').candidates()).toEqual([
      '/usr/bin/growser',
      '/usr/bin/growser-browser',
      '/opt/g/growser',
      '/opt/g/growser-browser',
    ]);
  });

  test('never relaunches a Growser that runs without the DevTools port', async () => {
    await expect(new StubLauncher(silent, true).ensureReady()).rejects.toThrow(/running without the DevTools port 9\. Close every Growser window/);
  });

  test('explains a missing binary instead of launching anything', async () => {
    await expect(new StubLauncher(silent, false, { PATH: '' }).ensureReady()).rejects.toThrow(/Growser not found .*set GROWSER_PATH/);
  });

  test('does not launch for a remote endpoint', async () => {
    const remote = new GrowserEndpoint('http://192.0.2.1:9222');
    await expect(new StubLauncher(remote, false).ensureReady()).rejects.toThrow(/Nothing answers at http:\/\/192\.0\.2\.1:9222/);
  });
});

class FakeRunner implements ScriptRunner {
  readonly expressions: string[] = [];
  private readonly replies: unknown[];

  constructor(...replies: unknown[]) {
    this.replies = replies;
  }

  /** A reply that is an Error is thrown, as a failed Runtime.evaluate would be. */
  async evaluate<T>(expression: string): Promise<T> {
    this.expressions.push(expression);
    const reply = this.replies.shift();
    if (reply instanceof Error) throw reply;
    return reply as T;
  }
}

test.describe('ExtensionTabs', () => {
  test('loads a page in a visible tab, brought to the front, and returns its html', async () => {
    const runner = new FakeRunner({ tabId: 3, previousTabId: 1, url: 'https://x.example/?q=%22' }, '<html></html>');
    expect(await new ExtensionTabs(runner).load('https://x.example/?q="')).toEqual({
      tabId: 3,
      previousTabId: 1,
      url: 'https://x.example/?q=%22',
      html: '<html></html>',
    });
    expect(runner.expressions[0]).toContain('url: "https://x.example/?q=\\""');
    expect(runner.expressions[0]).toContain('active: true');
    expect(runner.expressions[0]).toContain('chrome.windows.update(tab.windowId, { focused: true })');
    expect(runner.expressions[1]).toContain('target: { tabId: 3 }');
  });

  test('closes the tab and gives focus back when reading the page fails', async () => {
    const runner = new FakeRunner({ tabId: 5, previousTabId: 1, url: 'chrome-error://chromewebdata/' }, new Error('Cannot access contents'), undefined);
    await expect(new ExtensionTabs(runner).load('https://nowhere.example/')).rejects.toThrow(/Could not read https:\/\/nowhere\.example\/ .*Cannot access contents/);
    expect(runner.expressions[2]).toBe(ExtensionTabs.closeExpression({ tabId: 5, previousTabId: 1 }));
  });

  test('closes the tab it opened when loading fails', async () => {
    const runner = new FakeRunner({ tabId: 4, error: 'page did not finish loading within 20000 ms' }, undefined);
    await expect(new ExtensionTabs(runner).load('https://slow.example/')).rejects.toThrow(/Could not load https:\/\/slow\.example\/ .*20000 ms/);
    expect(runner.expressions[1]).toBe(ExtensionTabs.closeExpression({ tabId: 4 }));
    expect(runner.expressions[1]).toContain('chrome.tabs.remove(4)');
  });

  test('reports a failure before any tab existed without closing anything', async () => {
    const runner = new FakeRunner({ error: 'Error: No current window' });
    await expect(new ExtensionTabs(runner).load('https://x.example/')).rejects.toThrow(/No current window/);
    expect(runner.expressions).toHaveLength(1);
  });
});
