import { expect, test, type Page } from '@playwright/test';
import { PageScripts, type PageSnapshot } from '../../plugin/server/page-scripts.ts';

/** Runs the snapshot script exactly as executeScript would: from its own source, with no settle wait. */
const snapshot = (page: Page): Promise<PageSnapshot> => page.evaluate(`(${PageScripts.snapshot})(0)`) as Promise<PageSnapshot>;

const article = `<!doctype html><html><head><title>Article</title></head><body>
<header><nav><a href="https://site.example/">Home</a></nav><div>Site banner</div></header>
<main>
  <h1>Main   title</h1>
  <p>First <strong>bold</strong> and <em>soft</em> with <a href="https://ref.example/doc">a  link</a>,
     an <a href="#part">anchor</a> and <code>inline()</code>.</p>
  <h2>List</h2>
  <ul><li>one</li><li>two<ul><li>nested</li></ul></li></ul>
  <ol><li>first</li><li>second</li></ol>
  <pre><code>const x = 1;
console.log(x);</code></pre>
  <table><tr><th>Name</th><th>Value</th></tr><tr><td>power</td><td>386 | hp</td></tr></table>
  <blockquote>Quoted text</blockquote>
  <p hidden>hidden paragraph</p>
  <p style="display:none">display none</p>
  <p style="visibility:hidden">invisible paragraph</p>
  <div aria-hidden="true">aria hidden</div>
  <aside>related links</aside>
  <img src="https://img.example/a.png" alt="A car"><img src="https://img.example/b.png" alt="">
  <p><a href="https://site.example/login"><img src="https://img.example/login.png" alt="User login"></a></p>
  <button>Buy now</button>
  <script>var secret = 1;</script>
</main>
<footer>Copyright</footer>
</body></html>`;

test.describe('PageScripts.snapshot', () => {
  test('turns the main content into Markdown', async ({ page }) => {
    await page.setContent(article);
    const result = await snapshot(page);
    expect(result).toMatchObject({ title: 'Article', contentType: 'text/html', scope: 'main', challengeFrame: false });
    for (const expected of [
      '# Main title\n\nFirst **bold** and *soft* with [a link](https://ref.example/doc), an anchor and `inline()`.',
      '## List\n\n- one\n- two\n  - nested\n\n1. first\n2. second',
      '```\nconst x = 1;\nconsole.log(x);\n```',
      '| Name | Value |\n| --- | --- |\n| power | 386 \\| hp |',
      '> Quoted text',
      '![A car](https://img.example/a.png)',
      '[User login](https://site.example/login)',
    ]) {
      expect(result.text).toContain(expected);
    }
    for (const unexpected of ['Home', 'Site banner', 'Copyright', 'hidden paragraph', 'display none', 'invisible paragraph', 'aria hidden', 'related links', 'Buy now', 'secret', 'b.png', 'login.png']) {
      expect(result.text, unexpected).not.toContain(unexpected);
    }
    expect(result.text).not.toMatch(/\n{3,}/);
  });

  test('without a main element reads the body, leaving page chrome out but keeping an article header', async ({ page }) => {
    await page.setContent(`<body>
      <nav>menu</nav><header>top banner</header><div role="navigation">side menu</div>
      <div class="content"><article><header><h1>Post</h1></header><p>${'Post body. '.repeat(3)}</p></article><p>${'Other text. '.repeat(30)}</p></div>
      <footer>bottom</footer></body>`);
    const result = await snapshot(page);
    expect(result.scope).toBe('body');
    expect(result.text).toContain('# Post');
    expect(result.text).toContain('Other text.');
    for (const unexpected of ['menu', 'top banner', 'bottom']) expect(result.text, unexpected).not.toContain(unexpected);
  });

  test('ignores a main element that holds only a small part of the text', async ({ page }) => {
    await page.setContent(`<body><main>tiny</main><div>${'Real content. '.repeat(50)}</div></body>`);
    const result = await snapshot(page);
    expect(result.scope).toBe('body');
    expect(result.text).toContain('Real content.');
  });

  test('reads a layout table as blocks, not as a Markdown table', async ({ page }) => {
    await page.setContent(`<main><table><tr><td><h2>Left</h2><table><tr><td>inner</td></tr></table></td><td><p>Right side</p></td></tr></table></main>`);
    const result = await snapshot(page);
    expect(result.text).toContain('## Left');
    expect(result.text).toContain('Right side');
    expect(result.text).not.toContain('| --- |');
  });

  test('keeps code as rendered: indentation, blank lines, one line per line element, no copy button', async ({ page }) => {
    await page.setContent(`<main><p>Intro</p>
<pre><code>def f(x):
    if x:
        return 1


    return 0</code></pre>
<pre><button>Copy</button><code><div class="cm-line">function f() {<br></div><div class="cm-line">  return 1;<br></div><div class="cm-line"><br></div><div class="cm-line">}<br></div></code></pre>
</main>`);
    const { text } = await snapshot(page);
    expect(text).toContain('```\ndef f(x):\n    if x:\n        return 1\n\n\n    return 0\n```');
    expect(text).toContain('```\nfunction f() {\n  return 1;\n\n}\n```');
    expect(text).not.toContain('Copy');
  });

  test('fences code that holds a fence with a longer one', async ({ page }) => {
    await page.setContent('<main><pre>Markdown:\n```js\nx()\n```</pre></main>');
    expect((await snapshot(page)).text).toBe('````\nMarkdown:\n```js\nx()\n```\n````');
  });

  test('keeps code inside a quote quoted', async ({ page }) => {
    await page.setContent('<main><blockquote><p>Note</p><pre>if x:\n    y()</pre></blockquote></main>');
    expect((await snapshot(page)).text).toBe('> Note\n>\n> ```\n> if x:\n>     y()\n> ```');
  });

  test('writes code in a table cell as inline code', async ({ page }) => {
    await page.setContent('<main><table><tr><th>Declaration</th><th>Since</th></tr><tr><td><pre>void reserve( size_type n );</pre></td><td>C++20</td></tr></table></main>');
    expect((await snapshot(page)).text).toContain('| `void reserve( size_type n );` | C++20 |');
  });

  test('does not count the options of a select as page text', async ({ page }) => {
    await page.setContent(`<body><form><select>${'<option>Region name</option>'.repeat(60)}</select></form><div><p>No results found.</p></div></body>`);
    expect((await snapshot(page)).text).toBe('No results found.');
  });

  test('does not count page chrome as page text: a short page under a big menu stays Markdown', async ({ page }) => {
    await page.setContent(`<body><header><nav>${'<a href="https://site.example/x">Menu item</a> '.repeat(40)}</nav></header>
      <div><h1>Page not found</h1><p>No such page.</p></div><footer>${'Footer link '.repeat(20)}</footer></body>`);
    expect((await snapshot(page)).text).toBe('# Page not found\n\nNo such page.');
  });

  test('returns the plain text of a page that is all chrome rather than nothing', async ({ page }) => {
    await page.setContent('<body><nav><a href="https://site.example/a">Section A</a> <a href="https://site.example/b">Section B</a></nav></body>');
    expect((await snapshot(page)).text).toBe('Section A Section B');
  });

  test('falls back to the plain text when the walk leaves most of it out', async ({ page }) => {
    await page.setContent(`<body><div aria-hidden="true"><p>${'Article text. '.repeat(20)}</p></div><div role="dialog">Accept cookies</div></body>`);
    expect((await snapshot(page)).text).toContain('Article text.');
  });

  test('reads closed shadow DOM through chrome.dom when the extension provides it', async ({ page }) => {
    await page.setContent('<main><p>Light text.</p><div id="host"></div></main>');
    await page.evaluate(() => {
      const host = document.getElementById('host')!;
      const shadow = host.attachShadow({ mode: 'closed' });
      shadow.innerHTML = '<p>Closed shadow text.</p>';
      const dom = { openOrClosedShadowRoot: (element: HTMLElement) => (element === host ? shadow : element.shadowRoot) };
      Object.defineProperty(window, 'chrome', { value: { dom }, configurable: true });
    });
    expect((await snapshot(page)).text).toBe('Light text.\n\nClosed shadow text.');
  });

  test('reads open shadow DOM content', async ({ page }) => {
    await page.setContent('<main><div id="host"></div></main>');
    await page.evaluate(() => {
      const shadow = document.getElementById('host')!.attachShadow({ mode: 'open' });
      shadow.innerHTML = `<p>${'Shadow text. '.repeat(20)}</p>`;
    });
    expect((await snapshot(page)).text).toContain('Shadow text.');
  });

  test('reports the HTTP status of the page', async ({ page }) => {
    await page.route('https://site.example/**', (route) =>
      route.fulfill({ status: route.request().url().endsWith('/missing') ? 404 : 200, contentType: 'text/html', body: '<main><p>Page</p></main>' }),
    );
    await page.goto('https://site.example/missing');
    expect((await snapshot(page)).status).toBe(404);
    await page.goto('https://site.example/found');
    expect((await snapshot(page)).status).toBe(200);
  });

  test('returns non-HTML documents as raw text', async ({ page }) => {
    await page.goto('data:text/plain,line one%0Aline two **not markdown**');
    const result = await snapshot(page);
    expect(result.contentType).toBe('text/plain');
    expect(result.text).toBe('line one\nline two **not markdown**');
  });

  test('lists absolute http(s) links and spots a human-check frame', async ({ page }) => {
    await page.setContent('<main><p>Text <a href="https://a.example/">A</a> <a href="mailto:x@example.com">mail</a> <a href="javascript:void 0">js</a></p></main>');
    await page.evaluate(() => {
      const frame = document.createElement('iframe');
      frame.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      document.body.append(frame);
    });
    const result = await snapshot(page);
    expect(result.links).toEqual([{ text: 'A', href: 'https://a.example/' }]);
    expect(result.challengeFrame).toBe(true);
  });
});
