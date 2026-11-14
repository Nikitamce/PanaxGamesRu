import { safeUserImageUrl } from "../../shared/gq-image.js";
import { safeUrl, safeImageUrl, safeColor, integMeta } from "../../shared/gq-schema.js";
import { sanitizeToFragment } from "../../shared/gq-html.js";
import { paletteFor, coverArt } from "../../shared/gq-cover.js";
import { SCORES, VERDICT, UNRATED } from "../../shared/gq-fallback.js";

function h(doc, tag, attrs, ...kids) {
  const el = doc.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === void 0 || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else el.setAttribute(k, String(v));
    }
  }
  for (const k of kids.flat()) {
    if (k === null || k === void 0 || k === false || k === "") continue;
    el.append(typeof k === "string" ? doc.createTextNode(k) : k);
  }
  return el;
}
function link(doc, href, cls, ...kids) {
  const u = safeUrl(href);
  if (!u) return h(doc, "span", { class: cls }, ...kids);
  return h(doc, "a", { class: cls, href: u, target: "_blank", rel: "noopener noreferrer nofollow ugc" }, ...kids);
}
function img(doc, src, seed, title, cls) {
  const safe = safeImageUrl(src);
  return h(doc, "img", {
    class: cls,
    src: safe || coverArt(seed || title || "gq", title || "Game", paletteFor(seed || title || "gq")),
    alt: "",
    loading: "lazy",
    referrerpolicy: "no-referrer",
    decoding: "async"
  });
}
function richText(doc, html, cls) {
  const d = h(doc, "div", { class: cls });
  d.append(sanitizeToFragment(html || "", doc));
  return d;
}
function scoreBlock(doc, r) {
  const sc = SCORES[r.score];
  const stars = h(doc, "div", { class: "stars", "aria-label": r.score ? `\u041E\u0446\u0435\u043D\u043A\u0430 ${r.score} \u0438\u0437 10` : "\u0411\u0435\u0437 \u043E\u0446\u0435\u043D\u043A\u0438" });
  for (let i = 1; i <= 10; i++) stars.append(h(doc, "span", { class: "star" + (i <= r.score ? " lit" : "") }, "\u2605"));
  const left = h(
    doc,
    "div",
    { class: "sc-left" },
    stars,
    h(doc, "div", { class: "sc-num" }, h(doc, "b", { text: r.score ? String(r.score) : "\u2014" }), h(doc, "i", { text: "\u0438\u0437 10" })),
    sc ? h(doc, "div", { class: "sc-cap" }, h(doc, "span", { class: "ico", text: sc.i }), h(doc, "span", null, h(doc, "b", { text: sc.t }), " \xB7 " + r.score + "/10", h(doc, "span", { class: "d", text: sc.d }))) : null
  );
  const v = VERDICT[r.recommend];
  const verdict = r.recommend !== "none" && v ? h(doc, "div", { class: "verdict v-" + r.recommend }, h(doc, "span", { class: "e", text: v.e }), v.t) : null;
  return h(doc, "div", { class: "scorecard" }, left, verdict);
}
function aspectsBlock(doc, r) {
  if (!r.aspects.length || !r.aspects.some((a) => a.score > 0 || a.unrated === "na")) return null;
  const box = h(doc, "div", { class: "aspects" }, h(doc, "div", { class: "sec-h", text: "\u{1F4CA} \u041E\u0446\u0435\u043D\u043A\u0438 \u0430\u0441\u043F\u0435\u043A\u0442\u043E\u0432" }));
  for (const a of r.aspects) {
    const row = h(doc, "div", { class: "asp" + (a.score ? "" : " off") }, h(doc, "div", { class: "asp-n", text: a.name }));
    if (a.score) {
      const dots = h(doc, "div", { class: "dots" });
      for (let i = 1; i <= 10; i++) dots.append(h(doc, "span", { class: "dot" + (i <= a.score ? " lit" : "") }));
      row.append(dots, h(doc, "div", { class: "asp-v", text: a.score + "/10" }));
    } else {
      row.append(h(doc, "div", { class: "asp-note", text: UNRATED[a.unrated] || UNRATED.unsure }));
    }
    box.append(row);
  }
  return box;
}
function gameWidget(doc, r, d) {
  const keys = Object.keys(d.links || {});
  const badges = Object.entries(d.ratings || {}).map(([k, v]) => {
    const m = integMeta(r, k);
    return h(doc, "span", { class: "badge" }, `${m.icon} ${v} \xB7 ${m.name}`);
  });
  const links = keys.map((k) => {
    const m = integMeta(r, k);
    const a = link(doc, d.links[k], "srcbtn", `${m.icon} ${m.name}`);
    const c = safeColor(m.color);
    if (c) a.style.setProperty("--c", c);
    return a;
  });
  const valid = ["classic", "duet", "editorial", "staircase", "type", "brutal"];
  const v = valid.includes(d.variant) ? d.variant : "classic";
  const panaxUrl = safeUrl((d.links && (d.links.panax || d.links.backloggd || d.links.igdb)) || "") || "#";
  const rxDefs = [
    { k: "legendary", name: "Легенда", color: "#f4b93e" },
    { k: "awesome", name: "Круто", color: "#e0527d" },
    { k: "good", name: "Хорошо", color: "#4098e8" },
    { k: "decent", name: "Норм", color: "#33b489" },
    { k: "dislike", name: "Плохо", color: "#f2834b" },
    { k: "awful", name: "Ужас", color: "#7b8399" }
  ];
  const rxRaw = d.panaxReactions || {};
  const rx = rxDefs.map((x) => ({
    k: x.k,
    name: x.name,
    color: x.color,
    val: Number.isFinite(Number(rxRaw[x.k])) ? Number(rxRaw[x.k]) : 0
  }));
  const sorted = [...rx].sort((a, b) => b.val - a.val);
  const top1 = sorted[0];
  const top2 = sorted[1];
  const sub = [d.dev, d.year].filter(Boolean).join(" \xB7 ");

  if (v === "duet") {
    return h(
      doc,
      "div",
      { class: "w w-game v-duet" },
      h(
        doc,
        "div",
        { class: "duet-top" },
        h(
          doc,
          "div",
          {},
          h(doc, "div", { class: "duet-title", text: d.title || "\u0418\u0433\u0440\u0430" }),
          h(doc, "div", { class: "duet-sub", text: sub || d.pub || "PANAX" })
        ),
        img(doc, d.cover, d.gameId || d.title, d.title, "duet-cover")
      ),
      h(
        doc,
        "div",
        { class: "duet-pair" },
        ...[top1, top2].map((t) =>
          h(
            doc,
            "div",
            { class: "duet-big" },
            h(doc, "div", { class: "duet-num", style: `color:${t.color}`, text: `${t.val}%` }),
            h(
              doc,
              "div",
              { class: "duet-lbl" },
              h(doc, "span", { class: "duet-dot", style: `background:${t.color}` }),
              t.name
            )
          )
        )
      ),
      h(
        doc,
        "div",
        { class: "duet-foot" },
        h(
          doc,
          "div",
          { class: "duet-dots" },
          ...rx.map((x) => h(doc, "span", { title: `${x.name}: ${x.val}%`, style: `background:${x.color}` }))
        ),
        h(doc, "a", { class: "duet-link", href: panaxUrl, target: "_blank", rel: "noopener", text: "PANAX \u2192" })
      )
    );
  }
  if (v === "editorial") {
    const rest = sorted.slice(1);
    return h(
      doc,
      "div",
      { class: "w w-game v-editorial" },
      h(doc, "div", { class: "ed-ring" }),
      h(
        doc,
        "div",
        { class: "ed-head" },
        h(doc, "div", { class: "ed-kicker", text: `GAME / ${d.year || "PANAX"} \xB7 PLAYER VERDICT` }),
        h(doc, "div", { class: "ed-title", text: d.title || "\u0418\u0433\u0440\u0430" }),
        h(doc, "div", { class: "ed-sub", text: [d.dev, d.pub].filter(Boolean).join(" / ") || "\u0421\u043E\u043E\u0431\u0449\u0435\u0441\u0442\u0432\u043E PANAX" })
      ),
      h(
        doc,
        "div",
        { class: "ed-feat" },
        h(
          doc,
          "div",
          {},
          h(
            doc,
            "div",
            { class: "ed-feat-lbl" },
            h(doc, "span", { class: "ed-dot", style: `background:${top1.color}` }),
            top1.name
          ),
          h(doc, "div", { class: "ed-feat-cap", text: "\u0413\u043B\u0430\u0432\u043D\u0430\u044F \u043E\u0446\u0435\u043D\u043A\u0430 \u0438\u0433\u0440\u043E\u043A\u043E\u0432" })
        ),
        h(doc, "div", { class: "ed-feat-val", style: `color:${top1.color}`, text: `${top1.val}%` })
      ),
      h(
        doc,
        "div",
        { class: "ed-grid" },
        ...rest.map((x) =>
          h(
            doc,
            "div",
            { class: "ed-cell" },
            h(doc, "span", { class: "ed-cell-n" }, h(doc, "span", { class: "ed-dot", style: `background:${x.color}` }), x.name),
            h(doc, "span", { class: "ed-cell-v", text: `${x.val}%` })
          )
        )
      ),
      h(
        doc,
        "div",
        { class: "ed-foot" },
        h(doc, "span", { text: (d.genres || []).slice(0, 2).join(" \xB7 ") || "PANAX" }),
        h(doc, "a", { href: panaxUrl, target: "_blank", rel: "noopener", text: "PANAXGAMES.COM \u2192" })
      )
    );
  }
  if (v === "staircase") {
    const maxV = Math.max(1, ...rx.map((x) => x.val));
    return h(
      doc,
      "div",
      { class: "w w-game v-staircase" },
      h(
        doc,
        "div",
        { class: "st-head" },
        h(
          doc,
          "div",
          {},
          h(doc, "div", { class: "st-title", text: d.title || "\u0418\u0433\u0440\u0430" }),
          h(doc, "div", { class: "st-sub", text: sub || "\u041E\u0446\u0435\u043D\u043A\u0438 \u0438\u0433\u0440\u043E\u043A\u043E\u0432" })
        ),
        img(doc, d.cover, d.gameId || d.title, d.title, "st-cover")
      ),
      h(
        doc,
        "div",
        { class: "st-chart" },
        ...rx.map((x) => {
          const ht = Math.max(6, Math.round((x.val / maxV) * 92));
          return h(
            doc,
            "div",
            { class: "st-col" },
            h(doc, "div", { class: "st-pct", text: `${x.val}%` }),
            h(doc, "div", { class: "st-bar", style: `height:${ht}px;background:${x.color}` }),
            h(doc, "div", { class: "st-lbl", text: x.name })
          );
        })
      ),
      h(
        doc,
        "div",
        { class: "st-foot" },
        h(doc, "span", { text: "PANAX COMMUNITY" }),
        h(doc, "a", { href: panaxUrl, target: "_blank", rel: "noopener", text: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u2192" })
      )
    );
  }
  if (v === "type") {
    const maxV = Math.max(1, ...rx.map((x) => x.val));
    return h(
      doc,
      "div",
      { class: "w w-game v-type" },
      h(
        doc,
        "div",
        { class: "tp-hero" },
        h(doc, "div", { class: "tp-title", text: d.title || "\u0418\u0433\u0440\u0430" }),
        h(doc, "div", { class: "tp-meta", text: [d.year, d.dev].filter(Boolean).join(" \xB7 ") || "PANAX" })
      ),
      h(
        doc,
        "div",
        { class: "tp-rows" },
        ...rx.map((x) => {
          const w = Math.max(2, Math.round((x.val / maxV) * 100));
          return h(
            doc,
            "div",
            { class: "tp-row" },
            h(doc, "span", { class: "tp-name", text: x.name }),
            h(doc, "div", { class: "tp-track" }, h(doc, "div", { class: "tp-fill", style: `width:${w}%;background:${x.color}` })),
            h(doc, "span", { class: "tp-val", text: `${x.val}%` })
          );
        })
      ),
      h(doc, "div", { class: "tp-foot" }, h(doc, "a", { href: panaxUrl, target: "_blank", rel: "noopener", text: "PANAXGAMES \u2192" }))
    );
  }
  if (v === "brutal") {
    return h(
      doc,
      "div",
      { class: "w w-game v-brutal" },
      h(
        doc,
        "div",
        { class: "br-left" },
        h(
          doc,
          "div",
          { class: "br-top" },
          img(doc, d.cover, d.gameId || d.title, d.title, "br-cover"),
          h(
            doc,
            "div",
            {},
            h(doc, "div", { class: "br-meta", text: sub || "PANAX" }),
            h(doc, "div", { class: "br-title", text: d.title || "\u0418\u0433\u0440\u0430" })
          )
        ),
        h(
          doc,
          "div",
          { class: "br-dom" },
          h(doc, "span", { class: "br-dom-k", text: "\u0414\u041E\u041C\u0418\u041D\u0418\u0420\u0423\u0415\u0422" }),
          h(doc, "span", { class: "br-dom-v", style: `color:${top1.color}`, text: `${top1.name} \xB7 ${top1.val}%` })
        ),
        h(doc, "a", { class: "br-link", href: panaxUrl, target: "_blank", rel: "noopener", text: "PANAXGAMES \u2192" })
      ),
      h(
        doc,
        "div",
        { class: "br-right" },
        ...rx.map((x) =>
          h(
            doc,
            "div",
            { class: "br-row" },
            h(doc, "span", { class: "br-rname" }, h(doc, "span", { class: "br-dot", style: `background:${x.color}` }), x.name),
            h(doc, "span", { class: "br-rval", text: `${x.val}%` })
          )
        )
      )
    );
  }

  return h(
    doc,
    "div",
    { class: "w w-game v-classic" },
    img(doc, d.cover, d.gameId || d.title, d.title, "w-cover"),
    h(
      doc,
      "div",
      { class: "w-info" },
      h(doc, "div", { class: "w-kick", text: "\u{1F3AE} \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u0438\u0433\u0440\u044B" + (d.source ? " \xB7 " + d.source : "") }),
      h(doc, "div", { class: "w-title", text: d.title || "\u0418\u0433\u0440\u0430" }),
      h(doc, "div", { class: "w-sub", text: [d.year, d.dev, d.pub].filter(Boolean).join(" \xB7 ") }),
      h(doc, "div", { class: "w-tags" }, ...(d.genres || []).map((g) => h(doc, "span", { text: g }))),
      badges.length ? h(doc, "div", { class: "w-badges" }, ...badges) : null,
      links.length ? h(doc, "div", { class: "w-links" }, ...links) : null
    )
  );
}
function steamWidget(doc, d) {
  return h(
    doc,
    "div",
    { class: "w w-steam" },
    h(
      doc,
      "div",
      { class: "ws-head" },
      img(doc, d.cover, d.app || d.title, d.title, "ws-cap"),
      h(
        doc,
        "div",
        null,
        h(doc, "div", { class: "ws-t", text: d.title || "\u0418\u0433\u0440\u0430 \u0432 Steam" }),
        h(doc, "div", { class: "ws-s", text: "\u0412 \u043C\u0430\u0433\u0430\u0437\u0438\u043D\u0435 Steam" + (d.date ? " \xB7 \u0432\u044B\u043F\u0443\u0441\u043A " + d.date : "") }),
        h(doc, "div", { class: "ws-tags" }, ...(d.tags || []).map((t) => h(doc, "span", { text: t })))
      )
    ),
    h(
      doc,
      "div",
      { class: "ws-body" },
      h(
        doc,
        "div",
        { class: "ws-price" },
        d.disc ? h(doc, "span", { class: "disc", text: d.disc }) : null,
        d.old ? h(doc, "span", { class: "old", text: d.old }) : null,
        h(doc, "span", { class: "now", text: d.price || "\u0426\u0435\u043D\u0430 \u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u0430" })
      ),
      link(doc, d.url, "ws-btn", "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0432 Steam \u2192")
    )
  );
}
function ytWidget(doc, d) {
  const thumb = link(doc, d.url, "yt-thumb", img(doc, d.cover, d.url || d.title, d.title, "yt-img"), h(doc, "span", { class: "yt-play", text: "\u25B6" }), d.dur ? h(doc, "span", { class: "yt-dur", text: d.dur }) : null);
  return h(
    doc,
    "div",
    { class: "w w-yt" },
    thumb,
    h(
      doc,
      "div",
      { class: "yt-info" },
      h(doc, "div", { class: "yt-t", text: d.title || "\u0412\u0438\u0434\u0435\u043E" }),
      h(doc, "div", { class: "yt-c", text: (d.channel || "\u041A\u0430\u043D\u0430\u043B") + " \xB7 YouTube" }),
      link(doc, d.url, "yt-go", "\u25B6 \u0421\u043C\u043E\u0442\u0440\u0435\u0442\u044C \u043D\u0430 YouTube")
    )
  );
}
function wsWidget(doc, d) {
  const meta = "\u041C\u0430\u0441\u0442\u0435\u0440\u0441\u043A\u0430\u044F Steam \xB7 \u0430\u0432\u0442\u043E\u0440 " + (d.author || "\u2014") + (d.subs ? " \xB7 \u{1F465} " + d.subs + " \u043F\u043E\u0434\u043F\u0438\u0441\u0447\u0438\u043A\u043E\u0432" : "") + (d.game ? " \xB7 " + d.game : "");
  return h(
    doc,
    "div",
    { class: "w w-ws" },
    h(doc, "div", { class: "ws-ic", text: "\u{1F6E0}\uFE0F" }),
    h(doc, "div", null, h(doc, "div", { class: "ws-tt", text: d.title || "\u041F\u0440\u0435\u0434\u043C\u0435\u0442 \u043C\u0430\u0441\u0442\u0435\u0440\u0441\u043A\u043E\u0439" }), h(doc, "div", { class: "ws-ss", text: meta })),
    link(doc, d.url, "ws-sub", "\u041E\u0442\u043A\u0440\u044B\u0442\u044C")
  );
}
function imageItems(d) {
  if (Array.isArray(d.items) && d.items.length) return d.items;
  if (d && d.url) return [d];
  return [];
}
function imageBlock(doc, d) {
  const items = imageItems(d);
  const n = Math.min(Math.max(items.length, 0), 10);
  const fig = h(doc, "figure", { class: "blk img collage c" + (n || 1) });
  if (!items.length) {
    fig.append(h(doc, "div", { class: "img-err", text: "\u0418\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E (\u0430\u0434\u0440\u0435\u0441 \u043E\u0442\u043A\u043B\u043E\u043D\u0451\u043D \u0438\u043B\u0438 \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0451\u043D)" }));
    return fig;
  }
  const grid = h(doc, "div", { class: "collage-grid" });
  items.forEach((it, i) => {
    const href = safeUserImageUrl(it.url);
    const label = it.caption || it.alt || "\u0418\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 " + (i + 1);
    const cell = h(doc, "button", {
      type: "button",
      class: "cell",
      "data-gq-lb": String(i),
      "data-caption": it.caption || "",
      "aria-label": label
    });
    if (!href) {
      cell.append(h(doc, "div", { class: "img-err", text: "\u0418\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E (\u0430\u0434\u0440\u0435\u0441 \u043E\u0442\u043A\u043B\u043E\u043D\u0451\u043D \u0438\u043B\u0438 \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0451\u043D)" }));
    } else {
      const el = doc.createElement("img");
      el.setAttribute("src", href);
      el.setAttribute("alt", it.alt || it.caption || "");
      el.setAttribute("referrerpolicy", "no-referrer");
      el.setAttribute("loading", "eager");
      const err = h(doc, "div", { class: "img-err", text: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435" });
      err.hidden = true;
      el.addEventListener("error", () => {
        el.hidden = true;
        err.hidden = false;
      });
      cell.append(el, err);
    }
    grid.append(cell);
  });
  fig.append(grid);
  if (d.caption) fig.append(h(doc, "figcaption", { class: "img-cap", text: d.caption }));
  return fig;
}
function closeLightbox(root) {
  const lb = root && root.querySelector(":scope > .gq-lb");
  if (!lb) return;
  if (typeof lb._gqOff === "function") lb._gqOff();
  lb.remove();
}
function bindImageLightbox(root) {
  if (!root || root.getAttribute("data-gq-lb-bound")) return;
  root.setAttribute("data-gq-lb-bound", "1");
  const doc = root.ownerDocument;
  root.addEventListener("click", (e) => {
    const cell = e.target && e.target.closest && e.target.closest("[data-gq-lb]");
    if (!cell || !root.contains(cell)) return;
    e.preventDefault();
    e.stopPropagation();
    const fig = cell.closest(".blk.img");
    if (!fig) return;
    const cells = [...fig.querySelectorAll("[data-gq-lb]")];
    const items = cells.map((c) => {
      const im = c.querySelector("img");
      return {
        url: im && im.getAttribute("src") || "",
        caption: c.getAttribute("data-caption") || im && im.getAttribute("alt") || ""
      };
    }).filter((it) => it.url);
    if (!items.length) return;
    const start2 = Math.max(0, cells.indexOf(cell));
    const shared = fig.querySelector("figcaption") && fig.querySelector("figcaption").textContent || "";
    openLightbox(root, items, start2, shared);
  });
}
function openLightbox(root, items, start2, shared) {
  closeLightbox(root);
  const doc = root.ownerDocument;
  const overlay = h(doc, "div", { class: "gq-lb", role: "dialog", "aria-modal": "true", "aria-label": "\u041F\u0440\u043E\u0441\u043C\u043E\u0442\u0440 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F" });
  const img2 = doc.createElement("img");
  img2.setAttribute("alt", "");
  img2.setAttribute("referrerpolicy", "no-referrer");
  const cap = h(doc, "div", { class: "lb-cap" });
  const count = h(doc, "div", { class: "lb-count" });
  const closeBtn = h(doc, "button", { type: "button", class: "lb-x", "aria-label": "\u0417\u0430\u043A\u0440\u044B\u0442\u044C" }, "\u2715");
  const prev = h(doc, "button", { type: "button", class: "lb-nav lb-prev", "aria-label": "\u041F\u0440\u0435\u0434\u044B\u0434\u0443\u0449\u0435\u0435" }, "\u2039");
  const next = h(doc, "button", { type: "button", class: "lb-nav lb-next", "aria-label": "\u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0435\u0435" }, "\u203A");
  overlay.append(closeBtn, prev, img2, next, cap, count);
  let index = start2;
  const show = (i) => {
    if (!items.length) return;
    index = (i + items.length) % items.length;
    const it = items[index];
    img2.setAttribute("src", it.url);
    const text = it.caption || "";
    cap.textContent = text;
    cap.hidden = !text;
    count.textContent = items.length > 1 ? index + 1 + " / " + items.length : "";
    count.hidden = items.length < 2;
    prev.hidden = items.length < 2;
    next.hidden = items.length < 2;
  };
  const close = () => closeLightbox(root);
  closeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    close();
  });
  prev.addEventListener("click", (e) => {
    e.stopPropagation();
    show(index - 1);
  });
  next.addEventListener("click", (e) => {
    e.stopPropagation();
    show(index + 1);
  });
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  const onKey = (e) => {
    if (!root.querySelector(":scope > .gq-lb")) return;
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      show(index - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      show(index + 1);
    }
  };
  doc.addEventListener("keydown", onKey);
  overlay._gqOff = () => doc.removeEventListener("keydown", onKey);
  root.append(overlay);
  show(start2);
  try {
    closeBtn.focus();
  } catch {
  }
}
function block(doc, r, b) {
  switch (b.type) {
    case "h2":
      return richText(doc, b.html, "blk h2");
    case "h3":
      return richText(doc, b.html, "blk h3");
    case "text":
      return richText(doc, b.html, "blk txt");
    case "quote":
      return richText(doc, b.html, "blk quote");
    case "spoiler": {
      const det = h(doc, "details", { class: "blk spoiler" }, h(doc, "summary", null, "\u26A0\uFE0F \u0421\u043F\u043E\u0439\u043B\u0435\u0440 \u2014 \u043D\u0430\u0436\u043C\u0438\u0442\u0435, \u0447\u0442\u043E\u0431\u044B \u043F\u043E\u043A\u0430\u0437\u0430\u0442\u044C"));
      if (!b.hidden) det.setAttribute("open", "");
      det.append(richText(doc, b.html, "sp-body"));
      return det;
    }
    case "divider":
      return h(doc, "hr", { class: "divider d" + (b.data && b.data.style || 1) });
    case "game":
      return gameWidget(doc, r, b.data || {});
    case "steam":
      return steamWidget(doc, b.data || {});
    case "youtube":
      return ytWidget(doc, b.data || {});
    case "workshop":
      return wsWidget(doc, b.data || {});
    case "image":
      return imageBlock(doc, b.data || {});
    default:
      return null;
  }
}
function prosCons(doc, r) {
  if (!r.pros.length && !r.cons.length) return null;
  const col = (cls, title, items, sign) => h(doc, "div", { class: "pc " + cls }, h(doc, "h4", { text: title }), ...items.map((it) => h(doc, "div", { class: "pc-i" }, h(doc, "span", { class: "pc-ic", text: sign }), h(doc, "span", { text: it.text }))));
  return h(doc, "div", { class: "proscons" }, r.pros.length ? col("p", "\u2705 \u041F\u043B\u044E\u0441\u044B", r.pros, "+") : null, r.cons.length ? col("c", "\u274C \u041C\u0438\u043D\u0443\u0441\u044B", r.cons, "\u2212") : null);
}
export function renderReview(doc, r) {
  const root = h(doc, "article", { class: "gq" });
  const head = h(doc, "header", { class: "doc-head" });
  if (r.title) head.append(h(doc, "h1", { class: "doc-title", text: r.title }));
  const meta = [r.game ? "\u{1F3AE} " + r.game : "", r.author ? "\u270D\uFE0F " + r.author : ""].filter(Boolean);
  if (meta.length) head.append(h(doc, "div", { class: "doc-meta" }, ...meta.map((m) => h(doc, "span", { class: "chip", text: m }))));
  if (r.score || r.recommend !== "none") head.append(scoreBlock(doc, r));
  const asp = aspectsBlock(doc, r);
  if (asp) head.append(asp);
  if (head.childNodes.length) root.append(head);
  const blocks = h(doc, "div", { class: "blocks" });
  for (const b of r.blocks) {
    const n = block(doc, r, b);
    if (n) blocks.append(n);
  }
  root.append(blocks);
  const pc = prosCons(doc, r);
  if (pc) root.append(pc);
  bindImageLightbox(root);
  return root;
}
