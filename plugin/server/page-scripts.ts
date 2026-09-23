export interface PageLink {
  text: string;
  href: string;
}

/** What `web_fetch` reads from a rendered page. */
export interface PageSnapshot {
  url: string;
  title: string;
  contentType: string;
  text: string;
  links: PageLink[];
  /** An iframe of a known human-check provider (Cloudflare Turnstile, reCAPTCHA, hCaptcha). */
  challengeFrame: boolean;
}

/**
 * Functions that run inside the page through chrome.scripting.executeScript.
 * Chromium serialises only the function's own source, so each one must be
 * self-contained: no helpers or constants from this module's scope.
 */
export class PageScripts {
  static readonly outerHtml = (() => document.documentElement.outerHTML).toString();

  /** Waits until the visible text stops changing (SPAs render after `load`), then reads the page. */
  static readonly snapshot = (async (settleTimeoutMs: number): Promise<PageSnapshot> => {
    // Chromium's PDF viewer exposes no text, so there is nothing to wait for.
    const deadline = document.contentType === 'application/pdf' ? 0 : Date.now() + settleTimeoutMs;
    let previousLength = -1;
    while (Date.now() < deadline) {
      const length = document.body?.innerText.length ?? 0;
      if (length > 0 && length === previousLength) break;
      previousLength = length;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    const links = [...document.links]
      .map((anchor) => ({ text: anchor.innerText.replace(/\s+/g, ' ').trim(), href: anchor.href }))
      .filter((link) => /^https?:/.test(link.href));
    return {
      url: location.href,
      title: document.title,
      contentType: document.contentType,
      text: document.body?.innerText ?? '',
      links,
      challengeFrame: [...document.querySelectorAll('iframe')].some((frame) =>
        /challenges\.cloudflare\.com|google\.com\/recaptcha|recaptcha\.net|hcaptcha\.com/.test(frame.src),
      ),
    };
  }).toString();
}
