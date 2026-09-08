// One-off generator for a standalone, editable Russian API reference page.
//   node scripts/build-page.mjs  ->  webharvester-api-ru.html
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { usesRu } from './permission-uses-ru.mjs';
import { permissionSources } from '../src/api-schema-map.ts';

const manifest = JSON.parse(readFileSync(new URL('../extension/manifest.json', import.meta.url), 'utf8'));
const sourceByName = new Map(permissionSources.map((s) => [s.permission, s]));

const items = [...manifest.permissions].sort().map((permission) => {
  const source = sourceByName.get(permission);
  const namespace = source && 'file' in source ? `chrome.${source.namespace}` : 'capability';
  const seed = usesRu[permission];
  if (!seed) throw new Error(`No Russian description for ${permission}`);
  return { permission, namespace, seed };
});

const data = JSON.stringify(items).replace(/</g, '\\u003c');
const generatedAt = new Date().toISOString().slice(0, 10);

const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>webharvester — API и кейсы</title>
<style>
  :root {
    --bg: #f6f7f9; --card: #fff; --ink: #1a1d21; --muted: #5b6570;
    --line: #e3e6ea; --accent: #2f6feb; --edited: #b8860b; --edited-bg: #fff8e6;
    --mono: ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#0f1216; --card:#171b21; --ink:#e7ebf0; --muted:#9aa5b1;
      --line:#262c34; --accent:#5b9bff; --edited:#e0b64a; --edited-bg:#241f10; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink);
    font: 15px/1.55 -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  header { max-width: 900px; margin: 0 auto; padding: 28px 20px 8px; }
  h1 { font-size: 22px; margin: 0 0 6px; }
  .lead { color: var(--muted); margin: 0 0 4px; }
  .toolbar { position: sticky; top: 0; z-index: 5; background: var(--bg);
    border-bottom: 1px solid var(--line); }
  .toolbar-inner { max-width: 900px; margin: 0 auto; padding: 12px 20px;
    display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  input[type=search] { flex: 1 1 220px; min-width: 160px; padding: 8px 12px;
    border: 1px solid var(--line); border-radius: 8px; background: var(--card);
    color: var(--ink); font-size: 14px; }
  button { padding: 8px 12px; border: 1px solid var(--line); border-radius: 8px;
    background: var(--card); color: var(--ink); font-size: 13px; cursor: pointer; }
  button:hover { border-color: var(--accent); }
  .count { color: var(--muted); font-size: 13px; margin-left: auto; }
  main { max-width: 900px; margin: 0 auto; padding: 16px 20px 60px; }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 12px;
    padding: 14px 16px; margin: 0 0 12px; }
  .card.edited { border-color: var(--edited); }
  .card-head { display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; }
  .perm { font-family: var(--mono); font-weight: 600; font-size: 15px; }
  .ns { font-family: var(--mono); font-size: 12px; color: var(--muted);
    border: 1px solid var(--line); border-radius: 6px; padding: 1px 6px; }
  .flag { margin-left: auto; font-size: 12px; color: var(--edited);
    background: var(--edited-bg); border-radius: 6px; padding: 1px 8px; display: none; }
  .card.edited .flag { display: inline; }
  textarea { width: 100%; margin-top: 10px; padding: 10px 12px; border: 1px solid var(--line);
    border-radius: 8px; background: var(--bg); color: var(--ink); font: inherit;
    resize: vertical; min-height: 70px; overflow: hidden; }
  textarea:focus { outline: 2px solid var(--accent); border-color: var(--accent); }
  .card-foot { margin-top: 6px; text-align: right; }
  .reset { font-size: 12px; padding: 3px 8px; }
  .hidden { display: none !important; }
  footer { max-width: 900px; margin: 0 auto; padding: 0 20px 40px; color: var(--muted); font-size: 13px; }
</style>
</head>
<body>
<header>
  <h1>webharvester — API расширения и кейсы</h1>
  <p class="lead">Разрешения, которые расширение webharvester реально получает в браузере, — каждое с описанием API и кейсами применения в максимально широком смысле.</p>
  <p class="lead">Любое описание можно править прямо здесь. Правки сохраняются в этом браузере автоматически. Кнопками ниже выгрузите их в JSON или Markdown, чтобы вернуть в проект.</p>
</header>
<div class="toolbar"><div class="toolbar-inner">
  <input type="search" id="q" placeholder="Поиск по разрешению или тексту…" autocomplete="off">
  <button id="json">Скачать JSON</button>
  <button id="md">Скачать Markdown</button>
  <button id="copy">Скопировать всё</button>
  <button id="resetAll">Сбросить правки</button>
  <span class="count" id="count"></span>
</div></div>
<main id="list"></main>
<footer>Сгенерировано ${generatedAt}. Всего разрешений: ${items.length}. Страница самодостаточна и работает офлайн.</footer>
<script id="seed" type="application/json">${data}</script>
<script>
(function () {
  "use strict";
  var ITEMS = JSON.parse(document.getElementById('seed').textContent);
  var KEY = 'wh-api-ru-edits';
  var edits = {};
  try { edits = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { edits = {}; }

  var SEED = {}; ITEMS.forEach(function (i) { SEED[i.permission] = i.seed; });
  function seedOf(p) { return SEED[p] || ''; }
  function current(p) { return p in edits ? edits[p] : seedOf(p); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(edits)); } catch (e) {} }
  function editedCount() { return Object.keys(edits).filter(function (p) { return edits[p] !== seedOf(p); }).length; }

  var list = document.getElementById('list');
  var count = document.getElementById('count');
  function autosize(ta) { ta.style.height = 'auto'; ta.style.height = (ta.scrollHeight + 2) + 'px'; }

  function render() {
    list.textContent = '';
    ITEMS.forEach(function (item) {
      var card = document.createElement('section');
      card.className = 'card'; card.dataset.perm = item.permission;
      var head = document.createElement('div'); head.className = 'card-head';
      var perm = document.createElement('span'); perm.className = 'perm'; perm.textContent = item.permission;
      var ns = document.createElement('span'); ns.className = 'ns'; ns.textContent = item.namespace;
      var flag = document.createElement('span'); flag.className = 'flag'; flag.textContent = 'изменено';
      head.appendChild(perm); head.appendChild(ns); head.appendChild(flag);
      var ta = document.createElement('textarea');
      ta.value = current(item.permission); ta.spellcheck = false;
      ta.addEventListener('input', function () {
        if (ta.value === seedOf(item.permission)) { delete edits[item.permission]; }
        else { edits[item.permission] = ta.value; }
        save(); card.classList.toggle('edited', item.permission in edits); autosize(ta); updateCount();
      });
      var foot = document.createElement('div'); foot.className = 'card-foot';
      var reset = document.createElement('button'); reset.className = 'reset'; reset.textContent = 'сбросить к исходному';
      reset.addEventListener('click', function () {
        delete edits[item.permission]; save();
        ta.value = seedOf(item.permission); card.classList.remove('edited'); autosize(ta); updateCount();
      });
      foot.appendChild(reset);
      card.appendChild(head); card.appendChild(ta); card.appendChild(foot);
      card.classList.toggle('edited', item.permission in edits && edits[item.permission] !== seedOf(item.permission));
      list.appendChild(card); autosize(ta);
    });
    updateCount();
  }
  function updateCount() {
    var n = editedCount();
    count.textContent = ITEMS.length + ' разрешений' + (n ? ', изменено: ' + n : '');
  }
  function filter(qRaw) {
    var q = qRaw.trim().toLowerCase();
    list.querySelectorAll('.card').forEach(function (card) {
      var hay = (card.dataset.perm + ' ' + card.querySelector('.ns').textContent + ' ' + card.querySelector('textarea').value).toLowerCase();
      card.classList.toggle('hidden', q !== '' && hay.indexOf(q) === -1);
    });
  }
  function exportObject() {
    var out = {};
    ITEMS.forEach(function (i) { out[i.permission] = { namespace: i.namespace, description: current(i.permission) }; });
    return out;
  }
  function exportMarkdown() {
    return ITEMS.map(function (i) {
      return '## ' + i.permission + ' (\`' + i.namespace + '\`)\\n\\n' + current(i.permission) + '\\n';
    }).join('\\n');
  }
  function download(name, text, type) {
    var blob = new Blob([text], { type: type });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  function flash(id, msg) { var b = document.getElementById(id); var old = b.textContent; b.textContent = msg; setTimeout(function () { b.textContent = old; }, 1200); }

  document.getElementById('q').addEventListener('input', function (e) { filter(e.target.value); });
  document.getElementById('json').addEventListener('click', function () { download('webharvester-api-ru.json', JSON.stringify(exportObject(), null, 2), 'application/json'); });
  document.getElementById('md').addEventListener('click', function () { download('webharvester-api-ru.md', exportMarkdown(), 'text/markdown'); });
  document.getElementById('copy').addEventListener('click', function () {
    if (navigator.clipboard) { navigator.clipboard.writeText(exportMarkdown()).then(function () { flash('copy', 'Скопировано'); }); }
  });
  document.getElementById('resetAll').addEventListener('click', function () {
    if (!confirm('Сбросить все ваши правки к исходным описаниям?')) return;
    edits = {}; save(); render();
  });

  render();
})();
</script>
</body>
</html>
`;

const out = fileURLToPath(new URL('../webharvester-api-ru.html', import.meta.url));
writeFileSync(out, html);
console.log(`wrote ${out}`);
console.log(`permissions: ${items.length}`);
