/**
 * Serializes rich editor widgets into clean semantic HTML with hidden data attributes
 * so vanilla users see tidy text & links, while Panax RU extension users see glowing interactive cards.
 */

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Game card widget HTML
 */
export function buildGameWidgetHtml(game) {
  const jsonStr = encodeURIComponent(JSON.stringify(game));
  const linksHtml = Object.entries(game.links || {})
    .map(([k, u]) => `<a href="${escapeHtml(u)}" target="_blank" rel="noopener">${escapeHtml(k.toUpperCase())}</a>`)
    .join(' · ');

  return `<div class="panax-widget panax-widget-game" data-panax-widget="game" data-payload="${jsonStr}">
  <div style="font-weight:bold;font-size:1.15em;">🎮 ${escapeHtml(game.title)} (${escapeHtml(game.year || '')})</div>
  <div style="color:#8b94aa;font-size:0.9em;margin:4px 0;">${escapeHtml(game.genres?.join(', ') || '')} · ${escapeHtml(game.dev || '')}</div>
  ${game.score ? `<div style="color:#ffc84a;font-weight:bold;">★ Оценка: ${escapeHtml(game.score)}/10</div>` : ''}
  ${linksHtml ? `<div style="margin-top:6px;font-size:0.85em;">${linksHtml}</div>` : ''}
</div>`;
}

/**
 * Steam widget HTML
 */
export function buildSteamWidgetHtml(steam) {
  const jsonStr = encodeURIComponent(JSON.stringify(steam));
  return `<div class="panax-widget panax-widget-steam" data-panax-widget="steam" data-payload="${jsonStr}">
  <div style="font-weight:bold;">♨️ ${escapeHtml(steam.title || 'Игра в Steam')}</div>
  <div style="font-size:0.9em;color:#8f98a0;">${steam.date ? `Дата: ${escapeHtml(steam.date)} · ` : ''}Цена: <b>${escapeHtml(steam.price || 'Не указана')}</b> ${steam.disc ? `(${escapeHtml(steam.disc)})` : ''}</div>
  <div style="margin-top:6px;"><a href="${escapeHtml(steam.url || '#')}" target="_blank" rel="noopener">Купить в Steam →</a></div>
</div>`;
}

/**
 * YouTube widget HTML
 */
export function buildYouTubeWidgetHtml(yt) {
  const jsonStr = encodeURIComponent(JSON.stringify(yt));
  return `<div class="panax-widget panax-widget-youtube" data-panax-widget="youtube" data-payload="${jsonStr}">
  <div style="font-weight:bold;">▶️ ${escapeHtml(yt.title || 'Видео')}</div>
  <div style="font-size:0.9em;color:#8b94aa;">${escapeHtml(yt.channel || 'YouTube')}${yt.dur ? ` · ${escapeHtml(yt.dur)}` : ''}</div>
  <div style="margin-top:6px;"><a href="${escapeHtml(yt.url || '#')}" target="_blank" rel="noopener">Смотреть трейлер на YouTube →</a></div>
</div>`;
}

/**
 * Pros & Cons widget HTML
 */
export function buildProsConsWidgetHtml(pros, cons) {
  const payload = encodeURIComponent(JSON.stringify({ pros, cons }));
  const prosHtml = (pros || []).map(p => `<li>${escapeHtml(p)}</li>`).join('');
  const consHtml = (cons || []).map(c => `<li>${escapeHtml(c)}</li>`).join('');

  return `<div class="panax-widget panax-proscons" data-panax-widget="proscons" data-payload="${payload}">
  <div class="panax-pc-box pros" style="margin-bottom:8px;">
    <div style="color:#3ddc97;font-weight:bold;margin-bottom:4px;">✅ Плюсы:</div>
    <ul>${prosHtml || '<li>Нет</li>'}</ul>
  </div>
  <div class="panax-pc-box cons">
    <div style="color:#ff5f6d;font-weight:bold;margin-bottom:4px;">❌ Минусы:</div>
    <ul>${consHtml || '<li>Нет</li>'}</ul>
  </div>
</div>`;
}

/**
 * Inline game chip HTML
 */
export function buildGameChipHtml(title, url) {
  return `<a class="game-chip" href="${escapeHtml(url)}" target="_blank" rel="noopener" data-panax-chip="true"><i>🎮</i>${escapeHtml(title)}</a>&nbsp;`;
}

