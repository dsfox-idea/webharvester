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

  test('falls back to the plain text when the walk cannot see the content (shadow DOM)', async ({ page }) => {
    await page.setContent('<main><div id="host"></div></main>');
    await page.evaluate(() => {
      const shadow = document.getElementById('host')!.attachShadow({ mode: 'open' });
      shadow.innerHTML = `<p>${'Shadow text. '.repeat(20)}</p>`;
    });
    expect((await snapshot(page)).text).toContain('Shadow text.');
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
