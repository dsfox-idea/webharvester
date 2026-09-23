import type { ScriptRunner } from './extension-worker.ts';

/** A tab the tool opened, and the tab that was active before it (to give focus back on close). */
export interface TabHandle {
  tabId: number;
  previousTabId?: number;
}

export interface LoadedPage extends TabHandle {
  url: string;
  html: string;
}

interface LoadReply {
  tabId?: number;
  previousTabId?: number;
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
   * Runs in the extension worker: opens the page as the active tab and asks for its window to be focused,
   * so the user watches what the tool does; waits for the load and returns the rendered HTML.
   */
  static loadExpression(url: string, timeoutMs: number): string {
    return `(async () => {
  let tab;
  let previous;
  try {
    [previous] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    tab = await chrome.tabs.create({ url: ${JSON.stringify(url)}, active: true });
    await chrome.windows.update(tab.windowId, { focused: true });
    const deadline = Date.now() + ${timeoutMs};
    while ((await chrome.tabs.get(tab.id)).status !== 'complete') {
      if (Date.now() > deadline) return { tabId: tab.id, previousTabId: previous?.id, error: 'page did not finish loading within ${timeoutMs} ms' };
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    const [injection] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => document.documentElement.outerHTML });
    return { tabId: tab.id, previousTabId: previous?.id, url: (await chrome.tabs.get(tab.id)).url, html: injection?.result ?? '' };
  } catch (error) {
    return { tabId: tab?.id, previousTabId: previous?.id, error: String(error) };
  }
})()`;
  }

  /**
   * Closing an active tab makes Chromium activate a neighbour, not the tab the user had open; give focus
   * back to that tab, unless the user already moved away from ours. A tab the user closed is fine.
   */
  static closeExpression({ tabId, previousTabId }: TabHandle): string {
    const restore = previousTabId === undefined ? '' : `if (closing.active) await chrome.tabs.update(${previousTabId}, { active: true }).catch(() => undefined);`;
    return `(async () => {
  const closing = await chrome.tabs.get(${tabId}).catch(() => undefined);
  if (!closing) return;
  await chrome.tabs.remove(${tabId});
  ${restore}
})()`;
  }

  async load(url: string, timeoutMs = 20_000): Promise<LoadedPage> {
    const reply = await this.runner.evaluate<LoadReply>(ExtensionTabs.loadExpression(url, timeoutMs));
    if (reply.error !== undefined || reply.tabId === undefined) {
      if (reply.tabId !== undefined) await this.close({ tabId: reply.tabId, previousTabId: reply.previousTabId }).catch(() => undefined);
      throw new Error(`Could not load ${url} in a Growser tab: ${reply.error ?? 'no tab was created'}`);
    }
    return { tabId: reply.tabId, previousTabId: reply.previousTabId, url: reply.url ?? url, html: reply.html ?? '' };
  }

  async close(tab: TabHandle): Promise<void> {
    await this.runner.evaluate(ExtensionTabs.closeExpression(tab));
  }

  /** Makes the tab the active one of its window so the user finds it. */
  async reveal(tabId: number): Promise<void> {
    await this.runner.evaluate(`chrome.tabs.update(${tabId}, { active: true }).then(() => undefined)`);
  }
}
