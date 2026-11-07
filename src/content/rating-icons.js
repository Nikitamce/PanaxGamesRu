/** Swap Panax rating badges for local Russian upscales. */
const FILES = {
  icon_legendary_text_off: 'legendary-off.png',
  icon_legendary_text_on: 'legendary-on.png',
  icon_awesome_v2_text_off: 'awesome-off.png',
  icon_awesome_v2_text_on: 'awesome-on.png',
  icon_awesome_text_off: 'awesome-off.png',
  icon_awesome_text_on: 'awesome-on.png',
  icon_good_text_off: 'good-off.png',
  icon_good_text_on: 'good-on.png',
  icon_decent_text_off: 'decent-off.png',
  icon_decent_text_on: 'decent-on.png',
  icon_dislike_text_off: 'dislike-off.png',
  icon_dislike_text_on: 'dislike-on.png',
  icon_awful_text_off: 'awful-off.png',
  icon_awful_text_on: 'awful-on.png',
};

function localUrl(file) {
  try {
    return chrome.runtime.getURL(`ratings/${file}`);
  } catch {
    return null;
  }
}

const KEYS = Object.keys(FILES).sort((a, b) => b.length - a.length);

function matchFile(url) {
  if (!url) return null;
  const decoded = (() => {
    try {
      return decodeURIComponent(url);
    } catch {
      return url;
    }
  })();
  for (const key of KEYS) {
    if (decoded.includes(key)) return FILES[key];
  }
  return null;
}

function swapImg(img) {
  // src/srcset win over currentSrc: after a click React writes the English
  // file into srcset while currentSrc is still the previous Russian icon.
  const written = [img.getAttribute('src'), img.getAttribute('srcset')].filter(Boolean).join(' ');
  const file = matchFile(written) || matchFile(img.currentSrc || img.src || '');
  if (!file) return;
  const next = localUrl(file);
  if (!next) return;
  if (img.getAttribute('src') === next && !img.getAttribute('srcset')) return;
  img.removeAttribute('srcset');
  img.src = next;
  img.setAttribute('data-panax-ru-rating', file);
}

function swapBg(el) {
  const style = el.getAttribute('style') || '';
  const file = matchFile(style);
  if (!file) return;
  const next = localUrl(file);
  if (!next || style.includes(next)) return;
  el.style.backgroundImage = `url("${next}")`;
}

export function startRatingIcons() {
  if (!chrome?.runtime?.getURL) return;
  const run = (root) => {
    if (!root?.querySelectorAll) return;
    root.querySelectorAll('img, source').forEach(swapImg);
    root.querySelectorAll('[style*="icon_"]').forEach(swapBg);
  };
  const boot = () => run(document);
  if (document.body) boot();
  else document.addEventListener('DOMContentLoaded', boot, { once: true });
  const obs = new MutationObserver((list) => {
    for (const rec of list) {
      if (rec.type === 'attributes' && (rec.target?.tagName === 'IMG' || rec.target?.tagName === 'SOURCE')) {
        swapImg(rec.target);
      }
      for (const node of rec.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.tagName === 'IMG' || node.tagName === 'SOURCE') swapImg(node);
        run(node);
      }
    }
  });
  obs.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['src', 'srcset', 'style'],
  });
}
