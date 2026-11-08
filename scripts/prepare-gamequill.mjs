import fs from 'node:fs';

const htmlPath = 'c:/Users/arist/Gemini/PanaxGamesRu/sit3020.txt';
const html = fs.readFileSync(htmlPath, 'utf8');

// Extract <style>...</style>
const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
let css = styleMatch ? styleMatch[1] : '';

// Replace :root and body with :host and .gq-root so Shadow DOM styles apply cleanly
css = css.replace(':root{', ':host, .gq-root{');
css = css.replace('html,body{height:100%}', '.gq-root{height:100vh;width:100vw;display:block;position:relative;}');
css = css.replace(/body\s*\{/, '.gq-root {');

// Extract <body>...<script>
const bodyMatch = html.match(/<body>([\s\S]*?)<script>/);
let bodyHtml = bodyMatch ? bodyMatch[1].trim() : '';

// Add "🚀 Перенести в Panax" and "✕ Закрыть" right into the ribbon header
const targetWordCount = '<span id="wordCount">0 слов</span>';
const extraHeaderBtns = `<span id="wordCount">0 слов</span>
<button id="btnExportToPanax" style="margin-left:14px;background:linear-gradient(135deg,#7c5cff,#22d3ee);color:#fff;font-weight:700;font-size:12px;padding:6px 14px;border-radius:8px;cursor:pointer;border:none;box-shadow:0 4px 14px rgba(124,92,255,0.4);display:inline-flex;align-items:center;gap:6px;">🚀 Перенести в Panax</button>
<button id="btnClosePanaxModal" style="margin-left:6px;background:#232b3c;color:#8b94aa;font-weight:700;font-size:12px;padding:6px 12px;border-radius:8px;cursor:pointer;border:none;">✕ Закрыть</button>`;

bodyHtml = bodyHtml.replace(targetWordCount, extraHeaderBtns);

// Extract <script>...</script>
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
let scriptCode = scriptMatch ? scriptMatch[1].trim() : '';

// Scope querySelector to shadowRoot
scriptCode = scriptCode.replace(
  'const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];',
  () => 'const $=(s,r=shadowRoot)=>r.querySelector(s), $$=(s,r=shadowRoot)=>[...r.querySelectorAll(s)];\nconst getSel=()=>shadowRoot.getSelection?shadowRoot.getSelection():window.getSelection();'
);

// Replace getSelection() with getSel() so Shadow DOM selection works in Chrome
scriptCode = scriptCode.replace(/\bgetSelection\(\)/g, 'getSel()');

// Replace document.addEventListener with shadowRoot.addEventListener EXCEPT selectionchange
scriptCode = scriptCode.replace(/document\.addEventListener\('(click|mousedown|mouseup|keyup|keydown)'/g, "shadowRoot.addEventListener('$1'");

// Add handler for btnExportToPanax and btnClosePanaxModal before boot()
const exportHook = `
function reviewToHtml(r) {
  if (!r) return '';
  const parts = [];
  if (r.title) parts.push('<h2><b>' + esc(r.title) + '</b></h2>');
  if (r.game) parts.push('<p><b>🎮 Игра:</b> ' + esc(r.game) + '</p>');
  
  const sc = SCORES[r.score];
  if (r.score > 0 && sc) {
    parts.push('<p><b>⭐ Оценка:</b> ' + r.score + '/10 ' + starsMd(r.score) + ' — «' + esc(sc.t) + '» ' + sc.i + '</p>');
    parts.push('<blockquote><i>' + esc(sc.d) + '</i></blockquote>');
  }

  const v = VERDICT[r.recommend] || VERDICT.none;
  if (r.recommend && r.recommend !== 'none') {
    parts.push('<p><b>Вердикт:</b> ' + v.e + ' ' + esc(v.t) + '</p>');
  }

  if (r.aspects && r.aspects.length) {
    parts.push('<h3><b>📊 Оценки аспектов</b></h3>');
    parts.push('<ul>' + r.aspects.map(a => {
      if (a.score > 0) {
        return '<li><b>' + esc(a.name) + ':</b> ' + a.score + '/10 (' + '★'.repeat(a.score) + '☆'.repeat(10 - a.score) + ')</li>';
      }
      return '<li><b>' + esc(a.name) + ':</b> — <i>(' + esc(UNRATED[a.unrated] || UNRATED.unsure) + ')</i></li>';
    }).join('') + '</ul>');
  }

  if (r.blocks && r.blocks.length) {
    r.blocks.forEach(b => {
      if (b.type === 'text') parts.push('<p>' + (b.html || '') + '</p>');
      else if (b.type === 'h2') parts.push('<h2><b>' + (b.html || '') + '</b></h2>');
      else if (b.type === 'h3') parts.push('<h3><b>' + (b.html || '') + '</b></h3>');
      else if (b.type === 'quote') parts.push('<blockquote>' + (b.html || '') + '</blockquote>');
      else if (b.type === 'spoiler') parts.push('<blockquote><b>⚠️ СПОЙЛЕР:</b><br>' + (b.html || '') + '</blockquote>');
      else if (b.type === 'divider') parts.push('<p>───────────────</p>');
      else if (b.type === 'game') {
        const d = b.data || {};
        const srcs = Object.keys(d.links || {}).map(k => { const s = integ(k); return s ? '<a href="' + esc(d.links[k]) + '" target="_blank">' + s.icon + ' ' + esc(s.name) + '</a>' : null; }).filter(Boolean);
        const rt = Object.keys(d.ratings || {}).map(k => { const s = integ(k); return s ? esc(s.name) + ': <b>' + esc(d.ratings[k]) + '</b>' : null; }).filter(Boolean);
        parts.push(
          '<blockquote>' +
          '<b>🎮 ' + esc(d.title || 'Игра') + '</b> (' + esc([d.year, d.dev, d.pub].filter(Boolean).join(' · ')) + ')<br>' +
          ((d.genres || []).length ? 'Жанры: ' + esc(d.genres.join(', ')) + '<br>' : '') +
          (rt.length ? 'Оценки: ' + rt.join(' · ') + '<br>' : '') +
          (srcs.length ? 'Ссылки: ' + srcs.join(' | ') : '') +
          '</blockquote>'
        );
      } else if (b.type === 'steam') {
        const d = b.data || {};
        parts.push(
          '<blockquote>' +
          '<b>♨️ ' + esc(d.title || 'Steam') + ' — в Steam</b><br>' +
          (d.date ? 'Дата выхода: ' + esc(d.date) + '<br>' : '') +
          'Цена: <b>' + esc(d.price || 'не указана') + '</b>' + (d.disc ? ' (' + esc(d.disc) + ')' : '') + '<br>' +
          (d.url ? '<a href="' + esc(d.url) + '" target="_blank">Открыть в Steam →</a>' : '') +
          '</blockquote>'
        );
      } else if (b.type === 'youtube') {
        const d = b.data || {};
        parts.push(
          '<blockquote>' +
          '<b>▶️ ' + esc(d.title || 'Видео') + '</b> (' + esc(d.channel || 'YouTube') + (d.dur ? ' · ' + esc(d.dur) : '') + ')<br>' +
          (d.url ? '<a href="' + esc(d.url) + '" target="_blank">Смотреть видео на YouTube →</a>' : '') +
          '</blockquote>'
        );
      } else if (b.type === 'workshop') {
        const d = b.data || {};
        parts.push(
          '<blockquote>' +
          '<b>🛠️ ' + esc(d.title || 'Мастерская') + '</b> · автор: ' + esc(d.author || '—') + '<br>' +
          (d.url ? '<a href="' + esc(d.url) + '" target="_blank">Открыть в Мастерской Steam →</a>' : '') +
          '</blockquote>'
        );
      }
    });
  }

  const pros = (r.pros || []).filter(p => p.text && p.text.trim());
  const cons = (r.cons || []).filter(c => c.text && c.text.trim());
  if (pros.length) {
    parts.push('<h3><b>✅ Плюсы</b></h3>');
    parts.push('<ul>' + pros.map(p => '<li>+ ' + esc(p.text.trim()) + '</li>').join('') + '</ul>');
  }
  if (cons.length) {
    parts.push('<h3><b>❌ Минусы</b></h3>');
    parts.push('<ul>' + cons.map(c => '<li>− ' + esc(c.text.trim()) + '</li>').join('') + '</ul>');
  }

  // Embed full lossless GameQuill JSON payload in an invisible link or end marker so our extension viewer can render the full interactive GameQuill card view!
  const gqPayload = encodeURIComponent(JSON.stringify(r));
  parts.push('<p><a href="https://panaxgames.com/#gq=' + gqPayload + '" data-gq-full="' + gqPayload + '">✨ GameQuill Review</a></p>');

  return parts.join('');
}

const btnExport = $('#btnExportToPanax');
if (btnExport) {
  btnExport.addEventListener('click', () => {
    const r = cur();
    if (!r) return;
    
    const fullHtml = reviewToHtml(r);
    const md = reviewToMd(r);

    if (typeof onApply === 'function') {
      onApply({
        html: fullHtml,
        markdown: md,
        reviewData: clone(r),
        title: r.title,
        game: r.game,
        score: r.score
      });
    }
  });
}

const btnClose = $('#btnClosePanaxModal');
if (btnClose) {
  btnClose.addEventListener('click', () => {
    if (typeof onClose === 'function') onClose();
  });
}
`;

scriptCode = scriptCode.replace('boot();', () => exportHook + '\nboot();');

const moduleContent = `/**
 * Auto-generated GameQuill Fullscreen Shadow DOM Application from sit3020.txt
 */

export const GAMEQUILL_CSS = ${JSON.stringify(css)};

export const GAMEQUILL_HTML = ${JSON.stringify('<div class="gq-root">' + bodyHtml + '</div>')};

export function mountGameQuillApp(shadowRoot, { onApply, onClose }) {
${scriptCode}
}
`;

fs.writeFileSync('src/content/editor/gamequill-app.js', moduleContent, 'utf8');
console.log('Successfully generated src/content/editor/gamequill-app.js!');
