/** Hide the inline PANAX wordmark (viewBox 0 0 83 32) and show the Russian logo. */

function logoUrl() {
  try {
    return chrome.runtime.getURL('logo/panax-logo.png');
  } catch {
    return null;
  }
}

function install(url) {
  const id = 'panax-ru-logo-style';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
    svg[viewBox="0 0 83 32"] {
      background: url("${url}") center / contain no-repeat !important;
    }
    svg[viewBox="0 0 83 32"] * {
      visibility: hidden !important;
    }
  `;
  (document.documentElement || document.head).appendChild(style);
}

export function startLogo() {
  const url = logoUrl();
  if (!url) return;
  const boot = () => install(url);
  boot();
  document.addEventListener('DOMContentLoaded', boot, { once: true });
  const obs = new MutationObserver(boot);
  obs.observe(document.documentElement, { childList: true });
}
