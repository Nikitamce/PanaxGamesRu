/**
 * Transforms serialized widgets into full interactive glowing GameQuill cards
 * when rendered in posts, reviews or comments for users with the extension active.
 */

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function enhanceWidgetElement(el) {
  if (el.dataset.panaxEnhanced === 'true') return;
  const widgetType = el.getAttribute('data-panax-widget');
  const payloadRaw = el.getAttribute('data-payload');
  if (!widgetType || !payloadRaw) return;

  let data = null;
  try {
    data = JSON.parse(decodeURIComponent(payloadRaw));
  } catch (e) {
    return;
  }
  if (!data) return;

  el.dataset.panaxEnhanced = 'true';

  if (widgetType === 'game') {
    const badges = [];
    if (data.score) {
      badges.push(`<span class="panax-w-badge">⭐ ${escapeHtml(data.score)}/10</span>`);
    }
    if (data.ratings) {
      for (const [k, v] of Object.entries(data.ratings)) {
        badges.push(`<span class="panax-w-badge">📊 ${escapeHtml(k)}: ${escapeHtml(v)}</span>`);
      }
    }

    const links = [];
    if (data.links) {
      for (const [k, u] of Object.entries(data.links)) {
        links.push(`<a class="panax-w-link-btn" href="${escapeHtml(u)}" target="_blank" rel="noopener">🌐 ${escapeHtml(k)}</a>`);
      }
    }

    el.className = 'panax-widget panax-widget-game';
    el.innerHTML = `
      ${data.cover ? `<img class="panax-w-cover" src="${escapeHtml(data.cover)}" alt="${escapeHtml(data.title)}">` : ''}
      <div class="panax-w-info">
        <div class="panax-w-kick">🎮 КАРТОЧКА ИГРЫ</div>
        <div class="panax-w-title">${escapeHtml(data.title)}</div>
        <div class="panax-w-sub">${escapeHtml([data.year, data.dev, data.pub].filter(Boolean).join(' · '))}</div>
        ${data.genres?.length ? `<div class="panax-w-tags">${data.genres.map(g => `<span>${escapeHtml(g)}</span>`).join('')}</div>` : ''}
        ${badges.length ? `<div class="panax-w-badges">${badges.join('')}</div>` : ''}
        ${links.length ? `<div class="panax-w-links">${links.join('')}</div>` : ''}
      </div>
    `;
    return;
  }

  if (widgetType === 'steam') {
    el.className = 'panax-widget panax-widget-steam';
    el.innerHTML = `
      <div class="panax-ws-head">
        ${data.cover ? `<img class="panax-ws-cap" src="${escapeHtml(data.cover)}" alt="">` : ''}
        <div>
          <div class="panax-ws-t">${escapeHtml(data.title || 'Steam')}</div>
          <div class="panax-ws-s">Страница магазина ${data.date ? `· ${escapeHtml(data.date)}` : ''}</div>
          ${data.tags?.length ? `<div class="panax-ws-tags">${data.tags.map(t => `<span>${escapeHtml(t)}</span>`).join('')}</div>` : ''}
        </div>
      </div>
      <div class="panax-ws-body">
        <div class="panax-ws-price">
          ${data.disc ? `<span class="panax-ws-disc">${escapeHtml(data.disc)}</span>` : ''}
          ${data.old ? `<span class="panax-ws-old">${escapeHtml(data.old)}</span>` : ''}
          <span class="panax-ws-now">${escapeHtml(data.price || 'Не указана')}</span>
        </div>
        <a class="panax-ws-btn" href="${escapeHtml(data.url || '#')}" target="_blank" rel="noopener">Купить в Steam →</a>
      </div>
    `;
    return;
  }

  if (widgetType === 'youtube') {
    el.className = 'panax-widget panax-widget-youtube';
    el.innerHTML = `
      <a class="panax-yt-thumb" href="${escapeHtml(data.url || '#')}" target="_blank" rel="noopener" style="${data.cover ? `background-image:url('${escapeHtml(data.cover)}')` : 'background:#1a202f'}">
        <span class="panax-yt-play">▶</span>
        ${data.dur ? `<span class="panax-yt-dur">${escapeHtml(data.dur)}</span>` : ''}
      </a>
      <div class="panax-yt-info">
        <div class="panax-yt-t">${escapeHtml(data.title || 'Видеоролик')}</div>
        <div class="panax-yt-c">${escapeHtml(data.channel || 'YouTube')} · Видео</div>
        <a class="panax-yt-go" href="${escapeHtml(data.url || '#')}" target="_blank" rel="noopener">▶ Смотреть на YouTube</a>
      </div>
    `;
    return;
  }

  if (widgetType === 'proscons') {
    const pros = data.pros || [];
    const cons = data.cons || [];
    el.className = 'panax-widget panax-proscons';
    el.innerHTML = `
      <div class="panax-pc-box pros">
        <div class="panax-pc-title"><span>✅</span> Плюсы</div>
        ${pros.map(p => `
          <div class="panax-pc-item">
            <div class="panax-pc-ico">+</div>
            <div>${escapeHtml(p)}</div>
          </div>
        `).join('')}
      </div>
      <div class="panax-pc-box cons">
        <div class="panax-pc-title"><span>❌</span> Минусы</div>
        ${cons.map(c => `
          <div class="panax-pc-item">
            <div class="panax-pc-ico">−</div>
            <div>${escapeHtml(c)}</div>
          </div>
        `).join('')}
      </div>
    `;
  }
}

/**
 * Scan root container and enhance widgets (both data-panax-widget and #gq= links)
 */
export function enhanceWidgetsIn(root = document) {
  if (!root || !root.querySelectorAll) return;

  const elements = root.querySelectorAll('[data-panax-widget]:not([data-panax-enhanced="true"])');
  elements.forEach(enhanceWidgetElement);

  // Also detect #gq= links inside posts/reviews (outside active contenteditable editors)
  const gqLinks = root.querySelectorAll('a[href*="#gq="]:not([data-panax-enhanced="true"])');
  gqLinks.forEach((link) => {
    if (link.isContentEditable || link.closest('[contenteditable="true"], .ql-editor')) return;
    link.dataset.panaxEnhanced = 'true';

    try {
      const href = link.getAttribute('href') || '';
      const rawJson = href.split('#gq=')[1];
      if (!rawJson) return;
      const r = JSON.parse(decodeURIComponent(rawJson));
      if (!r || typeof r !== 'object') return;

      // Render a rich GameQuill summary banner in place of the marker link
      const banner = document.createElement('div');
      banner.className = 'panax-widget';
      banner.style.cssText = 'padding:14px 16px;background:linear-gradient(135deg,rgba(124,92,255,0.18),rgba(34,211,238,0.08));border-color:rgba(124,92,255,0.45);';

      const stars = r.score > 0 ? '★'.repeat(Math.round(r.score)) + '☆'.repeat(10 - Math.round(r.score)) : '';
      const pros = (r.pros || []).filter(p => p.text && p.text.trim());
      const cons = (r.cons || []).filter(c => c.text && c.text.trim());

      banner.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:${pros.length || cons.length ? '12px' : '0'};">
          <div>
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#a78bfa;font-weight:700;">✨ Обзор оформлен в GameQuill</div>
            <div style="font-size:16px;font-weight:700;color:#fff;margin-top:2px;">${escapeHtml(r.title || r.game || 'Игровой обзор')}</div>
          </div>
          ${r.score > 0 ? `<div style="text-align:right;"><div style="color:#ffc84a;font-size:16px;letter-spacing:1px;">${stars}</div><div style="font-size:12px;color:#e9ecf6;font-weight:700;">Оценка: ${r.score}/10</div></div>` : ''}
        </div>
        ${(pros.length || cons.length) ? `
          <div class="panax-proscons" style="margin:8px 0 0;">
            <div class="panax-pc-box pros">
              <div class="panax-pc-title"><span>✅</span> Плюсы</div>
              ${pros.map(p => `<div class="panax-pc-item"><div class="panax-pc-ico">+</div><div>${escapeHtml(p.text)}</div></div>`).join('')}
            </div>
            <div class="panax-pc-box cons">
              <div class="panax-pc-title"><span>❌</span> Минусы</div>
              ${cons.map(c => `<div class="panax-pc-item"><div class="panax-pc-ico">−</div><div>${escapeHtml(c.text)}</div></div>`).join('')}
            </div>
          </div>
        ` : ''}
      `;

      const parentP = link.closest('p') || link;
      parentP.replaceWith(banner);
    } catch {
      /* ignore */
    }
  });
}

