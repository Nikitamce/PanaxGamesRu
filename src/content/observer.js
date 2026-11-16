export function startObserver(engine) {
  let scheduled = false;
  const flush = () => {
    scheduled = false;
    engine.run(document.body || document.documentElement);
  };
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(flush);
    else setTimeout(flush, 16);
  };
  schedule();
  const observer = new MutationObserver((records) => {
    if (records.length > 60) {
      schedule();
      return;
    }
    let needsFull = false;
    let ops = 0;
    for (const record of records) {
      if (record.type === "characterData") {
        engine.translateNode(record.target);
        if (record.target.parentElement) engine.translateNode(record.target.parentElement);
        ops += 1;
      }
      for (const node of record.addedNodes) {
        if (++ops > 80) {
          needsFull = true;
          break;
        }
        engine.translateNode(node);
        needsFull = true;
      }
      if (record.type === "attributes" && record.target) {
        engine.translateNode(record.target);
        ops += 1;
      }
      if (ops > 80) {
        needsFull = true;
        break;
      }
    }
    if (needsFull) schedule();
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["placeholder", "data-placeholder", "aria-placeholder", "title", "aria-label", "aria-description", "alt"]
  });
  window.addEventListener("popstate", schedule);
  window.addEventListener("hashchange", schedule);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") schedule();
  });
  const wrap = (fn) => function patched(...args) {
    const ret = fn.apply(this, args);
    schedule();
    setTimeout(schedule, 50);
    setTimeout(schedule, 300);
    return ret;
  };
  try {
    history.pushState = wrap(history.pushState.bind(history));
    history.replaceState = wrap(history.replaceState.bind(history));
  } catch {
  }
  let ticks = 0;
  const pulse = () => {
    schedule();
    ticks += 1;
    const delay = ticks < 40 ? 500 : ticks < 80 ? 2e3 : 8e3;
    setTimeout(pulse, delay);
  };
  setTimeout(pulse, 400);
  return { schedule, observer };
}
