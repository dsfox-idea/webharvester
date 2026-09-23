import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import type { TabHandle } from '../../plugin/server/extension-tabs.ts';
import { FallbackPass } from '../../plugin/server/fallback-pass.ts';
import { HumanCheckGate, type GateTabs } from '../../plugin/server/human-check-gate.ts';

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

/** A clock that `sleep` moves forward, so a 15 s wait takes no real time. */
class Clock {
  time = 1_000_000;

  readonly now = (): number => this.time;
  readonly sleep = async (ms: number): Promise<void> => {
    this.time += ms;
  };
}

const tab: TabHandle = { tabId: 4, previousTabId: 1 };
const isCheck = (reading: string) => reading === 'check';

/** Serves the readings in turn (then `check` forever) and counts the re-reads. */
const rereads = (...readings: string[]) => {
  const counter = { count: 0, next: async () => (counter.count += 1, readings.shift() ?? 'check') };
  return counter;
};

const setup = () => {
  const clock = new Clock();
  const pass = new FallbackPass(join(mkdtempSync(join(tmpdir(), 'gate-')), 'pass.json'), clock.now);
  const tabs = new RecordingTabs();
  return { clock, pass, tabs, gate: new HumanCheckGate(tabs, pass, clock.now, clock.sleep) };
};

test.describe('HumanCheckGate', () => {
  test('lets a page without a check through untouched', async () => {
    const { tabs, gate } = setup();
    const pages = rereads();
    expect(await gate.pass(tab, 'site', 'page', isCheck, pages.next, { tool: 'WebFetch', host: 'site' })).toBe('page');
    expect(tabs.calls).toEqual([]);
    expect(pages.count).toBe(0);
  });

  test('shows the tab and reads it again until the check clears, without a fallback', async () => {
    const { clock, pass, tabs, gate } = setup();
    const started = clock.time;
    const pages = rereads('check', 'check', 'page');
    expect(await gate.pass(tab, 'news.example', 'check', isCheck, pages.next, { tool: 'WebFetch', host: 'news.example' })).toBe('page');
    expect(tabs.calls).toEqual(['reveal 4', 'wait 4', 'wait 4', 'wait 4']);
    expect(pages.count).toBe(3);
    expect(clock.time - started).toBe(3 * HumanCheckGate.pollMs);
    expect(pass.allows('WebFetch', 'news.example')).toBe(false);
  });

  test('a check that stays 15 s closes the tab, allows the built-in tool for the host and says so', async () => {
    const { clock, pass, tabs, gate } = setup();
    const started = clock.time;
    const pages = rereads();
    await expect(gate.pass(tab, 'https://news.example/a', 'check', isCheck, pages.next, { tool: 'WebFetch', host: 'news.example' })).rejects.toThrow(
      /^https:\/\/news\.example\/a showed a human check \(CAPTCHA\) that did not clear within 15 s; the tab was closed\. Repeat this call with the built-in WebFetch: the web-harvester hook allows it for news\.example for 10 minutes\. Never solve a human check yourself\.$/,
    );
    expect(pages.count).toBe(HumanCheckGate.waitMs / HumanCheckGate.pollMs);
    expect(clock.time - started).toBe(HumanCheckGate.waitMs);
    expect(tabs.calls.at(-1)).toBe('close 4');
    expect(pass.allows('WebFetch', 'news.example')).toBe(true);
    expect(pass.allows('WebFetch', 'other.example')).toBe(false);
    expect(pass.allows('WebSearch')).toBe(false);
  });

  test('a search check allows the built-in WebSearch', async () => {
    const { pass, gate } = setup();
    await expect(gate.pass(tab, 'DuckDuckGo', 'check', isCheck, rereads().next, { tool: 'WebSearch' })).rejects.toThrow(
      /Repeat this call with the built-in WebSearch: the web-harvester hook allows it for 10 minutes\./,
    );
    expect(pass.allows('WebSearch')).toBe(true);
  });

  test('a failed re-read is reported as it is, with no fallback', async () => {
    const { pass, gate } = setup();
    const failing = async (): Promise<string> => {
      throw new Error('Could not read the tab');
    };
    await expect(gate.pass(tab, 'site', 'check', isCheck, failing, { tool: 'WebFetch', host: 'site' })).rejects.toThrow('Could not read the tab');
    expect(pass.allows('WebFetch', 'site')).toBe(false);
  });
});
