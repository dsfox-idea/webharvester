import { expect, test } from '@playwright/test';
import type { TabHandle } from '../../plugin/server/extension-tabs.ts';
import { HumanCheckGate, type GateTabs } from '../../plugin/server/human-check-gate.ts';
import type { UserAnswer } from '../../plugin/server/mcp-server.ts';

class RecordingTabs implements GateTabs {
  readonly calls: string[] = [];

  async reveal(tabId: number): Promise<void> {
    this.calls.push(`reveal ${tabId}`);
  }

  async close(tab: TabHandle): Promise<void> {
    this.calls.push(`close ${tab.tabId}`);
  }

  async waitForLoad(tabId: number): Promise<void> {
    this.calls.push(`wait ${tabId}`);
  }
}

const tab: TabHandle = { tabId: 4, previousTabId: 1 };
const isCheck = (reading: string) => reading === 'check';
const answers = (...list: UserAnswer[]) => async () => list.shift() ?? 'unavailable';

/** Serves the readings in turn and counts the re-reads. */
const rereads = (...readings: string[]) => {
  const counter = { count: 0, next: async () => (counter.count += 1, readings.shift() ?? 'check') };
  return counter;
};

test.describe('HumanCheckGate', () => {
  test('lets a page without a check through untouched', async () => {
    const tabs = new RecordingTabs();
    const pages = rereads();
    expect(await new HumanCheckGate(tabs, answers()).pass(tab, 'site', 'page', isCheck, pages.next, 'web_fetch')).toBe('page');
    expect(tabs.calls).toEqual([]);
    expect(pages.count).toBe(0);
  });

  test('asks the user, waits for the tab and reads it again after the check is completed', async () => {
    const tabs = new RecordingTabs();
    const asked: string[] = [];
    const ask = async (message: string): Promise<UserAnswer> => (asked.push(message), 'accepted');
    expect(await new HumanCheckGate(tabs, ask).pass(tab, 'news.example', 'check', isCheck, rereads('page').next, 'web_fetch')).toBe('page');
    expect(tabs.calls).toEqual(['reveal 4', 'wait 4']);
    expect(asked).toEqual(['news.example shows a human check (CAPTCHA) in the active Growser tab. Complete it there yourself, then confirm here to continue.']);
  });

  test('without a way to ask, leaves the tab open and tells the model to ask the user', async () => {
    const tabs = new RecordingTabs();
    await expect(new HumanCheckGate(tabs, HumanCheckGate.cannotAsk).pass(tab, 'news.example', 'check', isCheck, rereads().next, 'web_fetch')).rejects.toThrow(
      /^news\.example answered with a human check \(CAPTCHA\) .* Do not try to solve it: ask the user to complete it there, then run web_fetch again\.$/,
    );
    expect(tabs.calls).toEqual(['reveal 4']);
  });

  test('a user who declines gets the tab closed and nothing read', async () => {
    const tabs = new RecordingTabs();
    const pages = rereads();
    await expect(new HumanCheckGate(tabs, answers('declined')).pass(tab, 'news.example', 'check', isCheck, pages.next, 'web_search')).rejects.toThrow(
      /The user declined the human check at news\.example/,
    );
    expect(tabs.calls).toEqual(['reveal 4', 'close 4']);
    expect(pages.count).toBe(0);
  });

  test('gives up after three rounds of a check that stays, with the tab left open', async () => {
    const tabs = new RecordingTabs();
    const pages = rereads('check', 'check', 'check');
    const accepted = answers('accepted', 'accepted', 'accepted', 'accepted');
    await expect(new HumanCheckGate(tabs, accepted).pass(tab, 'site', 'check', isCheck, pages.next, 'web_fetch')).rejects.toThrow(/run web_fetch again/);
    expect(pages.count).toBe(HumanCheckGate.maxRounds);
    expect(tabs.calls.filter((call) => call.startsWith('close'))).toEqual([]);
  });
});
