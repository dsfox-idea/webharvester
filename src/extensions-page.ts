import type { BrowserContext, Page } from '@playwright/test';

export interface ExtensionInfo {
  state: string;
  installWarnings: string[];
  manifestErrors: string[];
  runtimeErrors: string[];
  userScriptsAccess?: { isActive: boolean; isEnabled: boolean };
}

interface DeveloperPrivate {
  updateProfileConfiguration(update: { inDeveloperMode: boolean }): Promise<void>;
  updateExtensionConfiguration(update: { extensionId: string; userScriptsAccess: boolean }): Promise<void>;
  getExtensionsInfo(): Promise<
    Array<{
      id: string;
      state: string;
      installWarnings: string[];
      manifestErrors: Array<{ message: string }>;
      runtimeErrors: Array<{ message: string }>;
      userScriptsAccess?: { isActive: boolean; isEnabled: boolean };
    }>
  >;
}

/** Page-side access to the private API; must stay inline in each evaluate() because closures do not travel to the page. */
type PageGlobal = { chrome: { developerPrivate: DeveloperPrivate } };

/**
 * Drives chrome://extensions through chrome.developerPrivate, the private API
 * that WebUI page (and only it) can call. Developer mode is what unlocks the
 * debugger API and makes Chromium report manifest warnings
 * (extension_info_generator.cc reports them only when developer mode is on).
 */
export class ExtensionsPage {
  static readonly url = 'chrome://extensions/';

  private readonly context: BrowserContext;

  constructor(context: BrowserContext) {
    this.context = context;
  }

  /** Extracts the quoted permission name from a Chromium manifest warning such as "'audio' is not allowed for specified platform." */
  static permissionNamed(message: string): string | undefined {
    return /'([A-Za-z0-9_.]+)'/.exec(message)?.[1];
  }

  async enableDeveloperMode(): Promise<void> {
    await this.withPage((page) =>
      page.evaluate(() => (globalThis as unknown as PageGlobal).chrome.developerPrivate.updateProfileConfiguration({ inDeveloperMode: true })),
    );
  }

  async allowUserScripts(extensionId: string): Promise<void> {
    await this.withPage((page) =>
      page.evaluate(
        (id) => (globalThis as unknown as PageGlobal).chrome.developerPrivate.updateExtensionConfiguration({ extensionId: id, userScriptsAccess: true }),
        extensionId,
      ),
    );
  }

  async info(extensionId: string): Promise<ExtensionInfo> {
    return this.withPage((page) =>
      page.evaluate(async (id) => {
        const api = (globalThis as unknown as PageGlobal).chrome.developerPrivate;
        const found = (await api.getExtensionsInfo()).find((extension) => extension.id === id);
        if (!found) throw new Error(`Extension ${id} is not installed`);
        return {
          state: found.state,
          installWarnings: found.installWarnings,
          manifestErrors: found.manifestErrors.map((error) => error.message),
          runtimeErrors: found.runtimeErrors.map((error) => error.message),
          userScriptsAccess: found.userScriptsAccess,
        };
      }, extensionId),
    );
  }

  private async withPage<T>(action: (page: Page) => Promise<T>): Promise<T> {
    const page = await this.context.newPage();
    try {
      await page.goto(ExtensionsPage.url);
      return await action(page);
    } finally {
      await page.close();
    }
  }
}
