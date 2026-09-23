import type { TabHandle } from './extension-tabs.ts';
import { log } from './log.ts';
import type { AskUser } from './mcp-server.ts';

export interface GateTabs {
  reveal(tabId: number): Promise<void>;
  close(tab: TabHandle): Promise<void>;
  waitForLoad(tabId: number): Promise<void>;
}

/**
 * What happens when a site answers with a human check (CAPTCHA) instead of the
 * page: the tab is shown, the user is asked through Claude Code to complete the
 * check in Growser, and the same tab is read again. The check itself is never
 * answered by this code. Without a way to ask (headless session, no
 * elicitation), the tab stays open and the tool fails with that request.
 */
export class HumanCheckGate {
  static readonly maxRounds = 3;
  static readonly cannotAsk: AskUser = async () => 'unavailable';

  private readonly tabs: GateTabs;
  private readonly askUser: AskUser;

  constructor(tabs: GateTabs, askUser: AskUser) {
    this.tabs = tabs;
    this.askUser = askUser;
  }

  /** Resolves with the first reading that is not a check; `tool` names the call to repeat after a manual check. */
  async pass<T>(tab: TabHandle, site: string, first: T, isCheck: (reading: T) => boolean, reread: () => Promise<T>, tool: string): Promise<T> {
    let reading = first;
    for (let round = 1; isCheck(reading); round += 1) {
      await this.tabs.reveal(tab.tabId);
      const answer =
        round > HumanCheckGate.maxRounds
          ? 'unavailable'
          : await this.askUser(`${site} shows a human check (CAPTCHA) in the active Growser tab. Complete it there yourself, then confirm here to continue.`);
      log(`${site}: human check, round ${round}, user ${answer}`);
      if (answer === 'declined') {
        await this.tabs.close(tab).catch(() => undefined);
        throw new Error(`The user declined the human check at ${site}; the page was not read.`);
      }
      if (answer === 'unavailable') {
        throw new Error(
          `${site} answered with a human check (CAPTCHA) instead of the page. It is open in the active Growser tab. ` +
            `Do not try to solve it: ask the user to complete it there, then run ${tool} again.`,
        );
      }
      await this.tabs.waitForLoad(tab.tabId);
      reading = await reread();
    }
    return reading;
  }
}
