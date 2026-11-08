import fs from 'node:fs';
import path from 'node:path';

const htmlPath = 'c:/Users/arist/Gemini/PanaxGamesRu/sit3020.txt';
let html = fs.readFileSync(htmlPath, 'utf8');

// Replace wordCount to add actions in ribbon
const target = '<span id="wordCount">0 слов</span>';
const replacement = `<span id="wordCount">0 слов</span>
<button id="btnExportToPanax" style="margin-left:14px;background:linear-gradient(135deg,#7c5cff,#22d3ee);color:#fff;font-weight:700;font-size:12px;padding:6px 14px;border-radius:8px;cursor:pointer;border:none;box-shadow:0 4px 14px rgba(124,92,255,0.4);display:inline-flex;align-items:center;gap:6px;">🚀 Перенести в Panax</button>
<button id="btnClosePanaxModal" style="margin-left:6px;background:#232b3c;color:#8b94aa;font-weight:700;font-size:12px;padding:6px 12px;border-radius:8px;cursor:pointer;border:none;">✕ Закрыть</button>`;

if (html.includes(target)) {
  html = html.replace(target, replacement);
  console.log('Target wordCount replaced');
} else {
  console.warn('Target wordCount not found');
}

const commScript = `
<script>
// Communication with parent Panax window
const btnExport = document.getElementById('btnExportToPanax');
if (btnExport) {
  btnExport.addEventListener('click', () => {
    const r = typeof cur === 'function' ? cur() : null;
    if (!r) return;
    
    // Generate clean semantic HTML for Panax Quill
    let blocksHtml = '';
    (r.blocks || []).forEach(b => {
      if (b.type === 'text') {
        blocksHtml += '<p>' + (b.html || '') + '</p>';
      } else if (b.type === 'h2') {
        blocksHtml += '<h2>' + (b.html || '') + '</h2>';
      } else if (b.type === 'h3') {
        blocksHtml += '<h3>' + (b.html || '') + '</h3>';
      } else if (b.type === 'quote') {
        blocksHtml += '<blockquote>' + (b.html || '') + '</blockquote>';
      } else if (b.type === 'spoiler') {
        blocksHtml += '<div style="background:rgba(255,255,255,0.04);border:1px dashed #3a455b;padding:8px 12px;border-radius:8px;margin:8px 0;"><b>⚠️ Спойлер:</b> ' + (b.html || '') + '</div>';
      } else if (b.type === 'divider') {
        blocksHtml += '<hr>';
      } else if (typeof widgetHTML === 'function') {
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
      const scInfo = typeof SCORES !== 'undefined' && SCORES[r.score] ? SCORES[r.score].t + ' ' + SCORES[r.score].i : '';
      scoreHtml = '<div style="color:#ffc84a;font-size:1.15em;font-weight:bold;margin-bottom:12px;">★ Оценка: ' + r.score + '/10 ' + scInfo + '</div>';
    }

    const fullHtml = (r.title ? '<h1>' + r.title + '</h1>' : '') + scoreHtml + blocksHtml + pcHtml;
    const md = typeof reviewToMd === 'function' ? reviewToMd(r) : '';

    window.parent.postMessage({
      type: 'PANAX_GAMEQUILL_APPLY',
      html: fullHtml,
      markdown: md,
      title: r.title,
      game: r.game,
      score: r.score
    }, '*');
  });
}

const btnClose = document.getElementById('btnClosePanaxModal');
if (btnClose) {
  btnClose.addEventListener('click', () => {
    window.parent.postMessage({ type: 'PANAX_GAMEQUILL_CLOSE' }, '*');
  });
}
</script>
`;

html = html.replace('</body>', commScript + '\n</body>');
fs.writeFileSync('src/content/editor/gamequill.html', html, 'utf8');
console.log('Saved src/content/editor/gamequill.html');
