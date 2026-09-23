export interface PageLink {
  text: string;
  href: string;
}

/** What `web_fetch` reads from a rendered page. */
export interface PageSnapshot {
  url: string;
  title: string;
  contentType: string;
  /** Markdown of the main content for HTML pages; the raw text for other types (JSON, plain text). */
  text: string;
  /** `main`: the text comes from the page's main/article element; `body`: from the whole page. */
  scope: 'main' | 'body';
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

  /**
   * Waits until the visible text stops changing (SPAs render after `load`), then reads the page: the main
   * content as Markdown (headings, links, lists, code, tables), without navigation, banners and hidden parts.
   */
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

    const body = document.body ?? document.documentElement;
    const bodyText = body.innerText ?? '';
    let root: HTMLElement = body;
    let rootLength = 0;
    for (const candidate of document.querySelectorAll<HTMLElement>('main, article, [role="main"]')) {
      const length = candidate.innerText.length;
      if (length > rootLength) {
        root = candidate;
        rootLength = length;
      }
    }
    if (rootLength < bodyText.length * 0.25) root = body;
    const scope: 'main' | 'body' = root === body ? 'body' : 'main';

    const alwaysSkipped = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'SVG', 'CANVAS', 'IFRAME', 'OBJECT', 'EMBED', 'BUTTON', 'SELECT', 'OPTION', 'INPUT', 'TEXTAREA', 'DIALOG', 'NAV', 'ASIDE']);
    const pageChrome = new Set(['HEADER', 'FOOTER']);
    const chromeRoles = new Set(['navigation', 'banner', 'contentinfo', 'complementary', 'search']);
    const blockTags = new Set(['ADDRESS', 'ARTICLE', 'BLOCKQUOTE', 'DD', 'DETAILS', 'DIV', 'DL', 'DT', 'FIELDSET', 'FIGCAPTION', 'FIGURE', 'FOOTER', 'FORM', 'HEADER', 'HGROUP', 'LI', 'MAIN', 'P', 'SECTION', 'SUMMARY', 'TR']);
    const inlineTags = new Set(['A', 'ABBR', 'B', 'BDI', 'BDO', 'CITE', 'CODE', 'DATA', 'DEL', 'DFN', 'EM', 'I', 'IMG', 'INS', 'KBD', 'LABEL', 'MARK', 'Q', 'S', 'SAMP', 'SMALL', 'SPAN', 'STRONG', 'SUB', 'SUP', 'TIME', 'U', 'VAR', 'WBR']);

    const skipped = (element: Element): boolean => {
      const tag = element.tagName.toUpperCase();
      if (alwaysSkipped.has(tag) || element.getAttribute('aria-hidden') === 'true') return true;
      const role = element.getAttribute('role') ?? '';
      if (scope === 'body' && (pageChrome.has(tag) || chromeRoles.has(role)) && !element.closest('article')) return true;
      if (scope === 'main' && (role === 'navigation' || role === 'complementary' || role === 'search')) return true;
      const visibility = element as HTMLElement & { checkVisibility?: (options: object) => boolean };
      return typeof visibility.checkVisibility === 'function' && !visibility.checkVisibility({ visibilityProperty: true, checkVisibilityCSS: true });
    };
    const isBlock = (element: Element, tag: string): boolean => {
      if (blockTags.has(tag)) return true;
      if (inlineTags.has(tag)) return false;
      return /^(block|flex|grid|list-item|table)/.test(getComputedStyle(element).display);
    };
    // Blank lines are trimmed, the first line's indentation is kept (a nested list starts with it).
    const block = (text: string): string => {
      const body = text.replace(/^(\s*\n)+/, '').replace(/\s+$/, '');
      return body.trim() ? `\n\n${body}\n\n` : '';
    };
    const inlineWrap = (marker: string, text: string): string => (text.trim() ? `${marker}${text.trim()}${marker}` : text);
    // The rendered (flat) tree: an open shadow root replaces the host's children, a slot shows what is assigned to it.
    const childrenOf = (element: Element): Node[] => {
      if (element.shadowRoot) return [...element.shadowRoot.childNodes];
      if (element.tagName === 'SLOT') {
        const assigned = (element as HTMLSlotElement).assignedNodes({ flatten: true });
        if (assigned.length > 0) return assigned;
      }
      return [...element.childNodes];
    };
    // Code as rendered: innerText adds an empty line for the <br> that ends each line element (CodeMirror).
    const codeText = (code: Element): string => {
      let text = '';
      const walk = (node: Node): void => {
        if (node.nodeType === Node.TEXT_NODE) {
          text += node.textContent ?? '';
          return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE || skipped(node as Element)) return;
        const element = node as Element;
        const tag = element.tagName.toUpperCase();
        if (tag === 'BR') {
          text += '\n';
          return;
        }
        const ownLine = element !== code && isBlock(element, tag);
        if (ownLine && text && !text.endsWith('\n')) text += '\n';
        childrenOf(element).forEach(walk);
        if (ownLine && text && !text.endsWith('\n')) text += '\n';
      };
      walk(code);
      return text.replace(/\n+$/, '');
    };
    // Code blocks stand in the text as placeholders until the whitespace cleanup is done, which must not touch them.
    const codeBlocks: string[] = [];
    const codePlaceholder = /\u0000(\d+)\u0000/g;
    const fenceCode = (text: string): string => text.replace(codePlaceholder, (_, index: string) => `\`\`\`\n${codeBlocks[Number(index)]}\n\`\`\``);

    const convert = (node: Node, depth: number): string => {
      if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? '').replace(/\s+/g, ' ');
      if (node.nodeType !== Node.ELEMENT_NODE) return '';
      const element = node as HTMLElement;
      if (skipped(element)) return '';
      const tag = element.tagName.toUpperCase();
      const inner = (): string => childrenOf(element).map((child) => convert(child, depth)).join('');
      if (/^H[1-6]$/.test(tag)) return block(`${'#'.repeat(Number(tag[1]))} ${inner().replace(/\s+/g, ' ').trim()}`);
      switch (tag) {
        case 'BR':
          return '\n';
        case 'HR':
          return block('---');
        case 'A': {
          const text = inner().replace(/\s+/g, ' ').trim();
          const href = (element as HTMLAnchorElement).href;
          if (!text) return '';
          return /^https?:/.test(href) && href.split('#')[0] !== location.href.split('#')[0] ? `[${text}](${href})` : text;
        }
        case 'IMG': {
          const image = element as HTMLImageElement;
          const alt = image.alt.replace(/\s+/g, ' ').trim();
          // Inside a link the image is the link's label (logos, icons): its alt text is enough.
          if (element.closest('a')) return alt;
          return alt && /^https?:/.test(image.src) ? `![${alt}](${image.src})` : '';
        }
        case 'STRONG':
        case 'B':
          return inlineWrap('**', inner());
        case 'EM':
        case 'I':
          return inlineWrap('*', inner());
        case 'CODE':
          return inlineWrap('`', inner());
        case 'PRE':
          codeBlocks.push(codeText(element));
          return block(`\u0000${codeBlocks.length - 1}\u0000`);
        case 'BLOCKQUOTE':
          return block(fenceCode(inner().trim().replace(/\n{3,}/g, '\n\n')).split('\n').map((line) => `> ${line}`).join('\n'));
        case 'UL':
        case 'OL': {
          const items = [...element.children].filter((child) => child.tagName === 'LI' && !skipped(child));
          const lines = items
            .map((item, index) => {
              const content = childrenOf(item).map((child) => convert(child, depth + 1)).join('').trim().replace(/\n{2,}/g, '\n');
              return content ? `${'  '.repeat(depth)}${tag === 'OL' ? `${index + 1}.` : '-'} ${content}` : '';
            })
            .filter(Boolean);
          return block(lines.join('\n'));
        }
        case 'TABLE': {
          const rows = [...element.querySelectorAll('tr')].filter((row) => row.closest('table') === element);
          const cells = rows.map((row) =>
            [...row.children]
              .filter((cell) => cell.tagName === 'TD' || cell.tagName === 'TH')
              .map((cell) =>
                childrenOf(cell)
                  .map((child) => convert(child, depth))
                  .join('')
                  .replace(codePlaceholder, (_, index: string) => inlineWrap('`', codeBlocks[Number(index)]))
                  .replace(/\s+/g, ' ')
                  .replace(/\|/g, '\\|')
                  .trim(),
              ),
          );
          // A layout table (nested tables, long cells, a single row or column) reads better as plain blocks.
          const columns = Math.max(0, ...cells.map((row) => row.length));
          if (element.querySelector('table') || cells.length < 2 || columns < 2 || cells.some((row) => row.some((cell) => cell.length > 500))) {
            return block(inner());
          }
          const lines = cells.filter((row) => row.some(Boolean)).map((row) => `| ${row.join(' | ')} |`);
          if (lines.length === 0) return '';
          lines.splice(1, 0, `| ${Array.from({ length: columns }, () => '---').join(' | ')} |`);
          return block(lines.join('\n'));
        }
        default:
          return isBlock(element, tag) ? block(inner()) : inner();
      }
    };

    const isHtml = /html/.test(document.contentType);
    const rootText = root.innerText ?? '';
    let text = rootText;
    if (isHtml) {
      const markdown = fenceCode(
        convert(root, 0)
          .replace(/[ \t]+\n/g, '\n')
          .replace(/\n +(?! |[-*]|\d+\.)/g, '\n')
          .replace(/\n{3,}/g, '\n\n')
          .trim(),
      );
      // Text the walk left out (content under aria-hidden, in an aside) must not get lost: keep the plain text then.
      // The options of a select are in innerText but are never content.
      const optionsLength = [...root.querySelectorAll('select')].reduce((sum, select) => sum + select.innerText.length, 0);
      text = markdown.length >= (rootText.length - optionsLength) * 0.5 ? markdown : rootText;
    }

    const links = [...document.links]
      .map((anchor) => ({ text: anchor.innerText.replace(/\s+/g, ' ').trim(), href: anchor.href }))
      .filter((link) => /^https?:/.test(link.href));
    return {
      url: location.href,
      title: document.title,
      contentType: document.contentType,
      text,
      scope,
      links,
      challengeFrame: [...document.querySelectorAll('iframe')].some((frame) =>
        /challenges\.cloudflare\.com|google\.com\/recaptcha|recaptcha\.net|hcaptcha\.com/.test(frame.src),
      ),
    };
  }).toString();
}
