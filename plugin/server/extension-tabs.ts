import type { ScriptRunner } from './extension-worker.ts';

export interface LoadedPage {
  tabId: number;
  url: string;
  html: string;
}

interface LoadReply {
  tabId?: number;
  url?: string;
  html?: string;
  error?: string;
}

/** Tabs of the user's Growser, driven through the extension's `tabs` and `scripting` permissions. */
export class ExtensionTabs {
  private readonly runner: ScriptRunner;

  constructor(runner: ScriptRunner) {
    this.runner = runner;
  }

  /**
   * Runs in the extension worker: opens the page as the active tab and brings its window to the front, so
   * the user watches what the tool does; waits for the load and returns the rendered HTML.
   */
  static loadExpression(url: string, timeoutMs: number): string {
    return `(async () => {
  let tab;
  try {
    tab = await chrome.tabs.create({ url: ${JSON.stringify(url)}, active: true });
    await chrome.windows.update(tab.windowId, { focused: true });
    const deadline = Date.now() + ${timeoutMs};
    while ((await chrome.tabs.get(tab.id)).status !== 'complete') {
      if (Date.now() > deadline) return { tabId: tab.id, error: 'page did not finish loading within ${timeoutMs} ms' };
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    const [injection] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => document.documentElement.outerHTML });
    return { tabId: tab.id, url: (await chrome.tabs.get(tab.id)).url, html: injection?.result ?? '' };
  } catch (error) {
    return { tabId: tab?.id, error: String(error) };
  }
})()`;
  }

  async load(url: string, timeoutMs = 20_000): Promise<LoadedPage> {
    const reply = await this.runner.evaluate<LoadReply>(ExtensionTabs.loadExpression(url, timeoutMs));
    if (reply.error !== undefined || reply.tabId === undefined) {
      if (reply.tabId !== undefined) await this.close(reply.tabId).catch(() => undefined);
      throw new Error(`Could not load ${url} in a Growser tab: ${reply.error ?? 'no tab was created'}`);
    }
    return { tabId: reply.tabId, url: reply.url ?? url, html: reply.html ?? '' };
  }

  async close(tabId: number): Promise<void> {
    await this.runner.evaluate(`chrome.tabs.remove(${tabId})`);
  }

  /** Makes the tab the active one of its window so the user finds it; the window itself is not focused. */
  async reveal(tabId: number): Promise<void> {
    await this.runner.evaluate(`chrome.tabs.update(${tabId}, { active: true }).then(() => undefined)`);
  }
}
