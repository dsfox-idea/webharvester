import type { ScriptRunner } from './extension-worker.ts';
import { PageScripts } from './page-scripts.ts';

/** A tab the tool opened, and the tab that was active before it (to give focus back on close). */
export interface TabHandle {
  tabId: number;
  previousTabId?: number;
}

export interface OpenTab extends TabHandle {
  url: string;
}

export interface LoadedPage extends OpenTab {
  html: string;
}

interface OpenReply {
  tabId?: number;
  previousTabId?: number;
  url?: string;
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
   * so the user watches what the tool does, then waits for the load. A failed main-frame navigation
   * (unknown host, refused connection, a download) never reaches `complete`, so it is caught as it happens.
   */
  static openExpression(url: string, timeoutMs: number): string {
    return `(async () => {
  let tab;
  let previous;
  const failures = new Map();
  const onError = (details) => { if (details.frameId === 0) failures.set(details.tabId, details.error); };
  chrome.webNavigation.onErrorOccurred.addListener(onError);
  try {
    [previous] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    tab = await chrome.tabs.create({ url: ${JSON.stringify(url)}, active: true });
    await chrome.windows.update(tab.windowId, { focused: true });
    const deadline = Date.now() + ${timeoutMs};
    while ((await chrome.tabs.get(tab.id)).status !== 'complete' && !failures.has(tab.id)) {
      if (Date.now() > deadline) return { tabId: tab.id, previousTabId: previous?.id, error: 'page did not finish loading within ${timeoutMs} ms; the host may not exist (Growser keeps loading an unresolvable host instead of failing)' };
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    if (failures.has(tab.id)) return { tabId: tab.id, previousTabId: previous?.id, error: 'navigation failed: ' + failures.get(tab.id) };
    return { tabId: tab.id, previousTabId: previous?.id, url: (await chrome.tabs.get(tab.id)).url };
  } catch (error) {
    return { tabId: tab?.id, previousTabId: previous?.id, error: String(error) };
  } finally {
    chrome.webNavigation.onErrorOccurred.removeListener(onError);
  }
})()`;
  }

  /** Runs `pageFunction` (the source of a self-contained function) in the tab and returns its settled result. */
  static readExpression(tabId: number, pageFunction: string, args: readonly unknown[] = []): string {
    return `chrome.scripting.executeScript({ target: { tabId: ${tabId} }, func: ${pageFunction}, args: ${JSON.stringify(args)} })
  .then(([injection]) => injection?.result)`;
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

  async open(url: string, timeoutMs = 20_000): Promise<OpenTab> {
    const reply = await this.runner.evaluate<OpenReply>(ExtensionTabs.openExpression(url, timeoutMs));
    if (reply.error !== undefined || reply.tabId === undefined) {
      if (reply.tabId !== undefined) await this.close({ tabId: reply.tabId, previousTabId: reply.previousTabId }).catch(() => undefined);
      throw new Error(`Could not load ${url} in a Growser tab: ${reply.error ?? 'no tab was created'}`);
    }
    return { tabId: reply.tabId, previousTabId: reply.previousTabId, url: reply.url ?? url };
  }

  async read<T>(tabId: number, pageFunction: string, args: readonly unknown[] = []): Promise<T> {
    return this.runner.evaluate<T>(ExtensionTabs.readExpression(tabId, pageFunction, args));
  }

  /** Opens the page and returns its rendered HTML; the tab stays open for the caller to close or reveal. */
  async load(url: string, timeoutMs = 20_000): Promise<LoadedPage> {
    const tab = await this.open(url, timeoutMs);
    try {
      return { ...tab, html: (await this.read<string | undefined>(tab.tabId, PageScripts.outerHtml)) ?? '' };
    } catch (error) {
      await this.close(tab).catch(() => undefined);
      throw new Error(`Could not read ${url} in a Growser tab: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async close(tab: TabHandle): Promise<void> {
    await this.runner.evaluate(ExtensionTabs.closeExpression(tab));
  }

  /** Makes the tab the active one of its window so the user finds it. */
  async reveal(tabId: number): Promise<void> {
    await this.runner.evaluate(`chrome.tabs.update(${tabId}, { active: true }).then(() => undefined)`);
  }
}
