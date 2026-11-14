function logoUrl() {
  try {
    return chrome.runtime.getURL("logo/panax-logo.png");
  } catch {
    return null;
  }
}
function install(url) {
  const id = "panax-ru-logo-style";
  if (document.getElementById(id)) return;
  const style = document.createElement("style");
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
  const boot2 = () => install(url);
  boot2();
  document.addEventListener("DOMContentLoaded", boot2, { once: true });
  const obs = new MutationObserver(boot2);
  obs.observe(document.documentElement, { childList: true });
}
