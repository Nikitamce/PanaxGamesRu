import fs from 'node:fs';
import path from 'node:path';

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
const btnExport = $('#btnExportToPanax');
if (btnExport) {
  btnExport.addEventListener('click', () => {
    const r = cur();
    if (!r) return;
    
    let blocksHtml = '';
    (r.blocks || []).forEach(b => {
      if (b.type === 'text') blocksHtml += '<p>' + (b.html || '') + '</p>';
      else if (b.type === 'h2') blocksHtml += '<h2>' + (b.html || '') + '</h2>';
      else if (b.type === 'h3') blocksHtml += '<h3>' + (b.html || '') + '</h3>';
      else if (b.type === 'quote') blocksHtml += '<blockquote>' + (b.html || '') + '</blockquote>';
      else if (b.type === 'spoiler') blocksHtml += '<div style="background:rgba(255,255,255,0.04);border:1px dashed #3a455b;padding:8px 12px;border-radius:8px;margin:8px 0;"><b>⚠️ Спойлер:</b> ' + (b.html || '') + '</div>';
      else if (b.type === 'divider') blocksHtml += '<hr>';
      else if (typeof widgetHTML === 'function') {
        const payload = encodeURIComponent(JSON.stringify(b.data || {}));
        blocksHtml += '<div class="panax-widget panax-widget-' + b.type + '" data-panax-widget="' + b.type + '" data-payload="' + payload + '">' + widgetHTML(b) + '</div>';
      }
    });

    let pcHtml = '';
    const pros = (r.pros || []).map(p => p.text).filter(Boolean);
    const cons = (r.cons || []).map(c => c.text).filter(Boolean);
    if (pros.length || cons.length) {
      const pcPayload = encodeURIComponent(JSON.stringify({ pros, cons }));
      pcHtml = '<div class="panax-widget panax-proscons" data-panax-widget="proscons" data-payload="' + pcPayload + '">' +
        '<div class="panax-pc-box pros" style="margin-bottom:8px;"><div style="color:#3ddc97;font-weight:bold;margin-bottom:4px;">✅ Плюсы:</div><ul>' +
        (pros.map(p => '<li>' + p + '</li>').join('') || '<li>Нет</li>') + '</ul></div>' +
        '<div class="panax-pc-box cons"><div style="color:#ff5f6d;font-weight:bold;margin-bottom:4px;">❌ Минусы:</div><ul>' +
        (cons.map(c => '<li>' + c + '</li>').join('') || '<li>Нет</li>') + '</ul></div></div>';
    }

    let scoreHtml = '';
    if (r.score > 0) {
      const scInfo = SCORES[r.score] ? SCORES[r.score].t + ' ' + SCORES[r.score].i : '';
      scoreHtml = '<div style="color:#ffc84a;font-size:1.15em;font-weight:bold;margin-bottom:12px;">★ Оценка: ' + r.score + '/10 ' + scInfo + '</div>';
    }

    const fullHtml = (r.title ? '<h1>' + r.title + '</h1>' : '') + scoreHtml + blocksHtml + pcHtml;
    const md = reviewToMd(r);

    if (typeof onApply === 'function') {
      onApply({
        html: fullHtml,
        markdown: md,
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
