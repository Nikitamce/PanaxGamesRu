function startMessagesPatch(dict) {
  const fold = /* @__PURE__ */ new Map();
  for (const [k, v] of Object.entries(dict)) {
    fold.set(k, v);
    fold.set(k.toLowerCase(), v);
  }
  const BY_KEY = {
    "following-title": dict.Following || "\u041F\u043E\u0434\u043F\u0438\u0441\u043A\u0438",
    "following-common": dict.Following || "\u041F\u043E\u0434\u043F\u0438\u0441\u043A\u0438",
    "follower-common-one": dict.Follower || "\u041F\u043E\u0434\u043F\u0438\u0441\u0447\u0438\u043A",
    "follower-common-other": dict.Followers || "\u041F\u043E\u0434\u043F\u0438\u0441\u0447\u0438\u043A\u0438",
    "c-hot-common": dict.Hot || "\u0413\u043E\u0440\u044F\u0447\u0435\u0435",
    "c-latest-common": dict.Latest || "\u0421\u0432\u0435\u0436\u0435\u0435",
    "news-common": dict.News || "\u041D\u043E\u0432\u043E\u0441\u0442\u0438",
    "wishlist-common": dict.Wishlist || "\u0416\u0435\u043B\u0430\u0435\u043C\u043E\u0435",
    "join-banner-title": dict["Join now and level up your gaming!"] || "\u041F\u0440\u0438\u0441\u043E\u0435\u0434\u0438\u043D\u044F\u0439\u0441\u044F \u0438 \u043F\u0440\u043E\u043A\u0430\u0447\u0438\u0432\u0430\u0439 \u0441\u0432\u043E\u0439 \u0433\u0435\u0439\u043C\u0438\u043D\u0433!",
    "join-banner-button": dict["Join us for free"] || "\u041F\u0440\u0438\u0441\u043E\u0435\u0434\u0438\u043D\u044F\u0439\u0441\u044F \u0431\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u043E",
    "join-now-button": dict["Join now"] || "\u041F\u0440\u0438\u0441\u043E\u0435\u0434\u0438\u043D\u0438\u0442\u044C\u0441\u044F",
    "start-button": dict["Get Started"] || "\u041D\u0430\u0447\u0430\u0442\u044C",
    "view-full-details-button": dict["View full details"] || dict["View Details"] || "\u041F\u043E\u0434\u0440\u043E\u0431\u043D\u0435\u0435",
    "welcome-trending-label": dict["Trending Games Now"] || "\u0412 \u0442\u0440\u0435\u043D\u0434\u0435",
    "discover-common": dict.Discover || "\u041E\u0431\u0437\u043E\u0440",
    "follow-common": dict.Follow || "\u041F\u043E\u0434\u043F\u0438\u0441\u043A\u0430",
    "unfollow-button": dict.Unfollow || "\u041E\u0442\u043F\u0438\u0441\u043A\u0430",
    "playing-common": dict.Playing || "\u0418\u0433\u0440\u0430\u044E",
    "backlog-common": dict.Backlog || "\u0412 \u043F\u043B\u0430\u043D\u0430\u0445",
    "beaten-common": dict.Beaten || dict.Completed || "\u041F\u0440\u043E\u0439\u0434\u0435\u043D\u043E",
    "paused-common": dict.Paused || "\u041F\u0430\u0443\u0437\u0430",
    "quit-common": dict.Quit || dict.Dropped || "\u0411\u0440\u043E\u0448\u0435\u043D\u043E",
    "write-review-button": dict["Write a review"] || dict["Write a Review"] || "\u041D\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u0440\u0435\u0446\u0435\u043D\u0437\u0438\u044E",
    "more-link": dict.More || "\u0415\u0449\u0451",
    "rating-common-one": dict.Rating || "\u041E\u0446\u0435\u043D\u043A\u0430",
    "rating-common-other": dict.Ratings || "\u041E\u0446\u0435\u043D\u043A\u0438",
    "platforms-common": dict.Platforms || "\u041F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u044B",
    "developer-common": dict.Developer || "\u0420\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u0447\u0438\u043A",
    "publisher-common": dict.Publisher || "\u0418\u0437\u0434\u0430\u0442\u0435\u043B\u044C",
    "release-common": dict.Release || "\u0420\u0435\u043B\u0438\u0437",
    "similar-game-common": dict["Similar games"] || "\u041F\u043E\u0445\u043E\u0436\u0438\u0435 \u0438\u0433\u0440\u044B",
    "set-status-label": dict["Set status"] || "\u0421\u0442\u0430\u0442\u0443\u0441",
    "status-common": dict.Status || "\u0421\u0442\u0430\u0442\u0443\u0441",
    "game-info-common": dict["Game info"] || "\u041E\u0431 \u0438\u0433\u0440\u0435",
    "about-label": dict.About || "\u041E \u0438\u0433\u0440\u0435",
    "dscrp-common": dict.Description || "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435",
    "storyline-common": dict.Storyline || "\u0421\u044E\u0436\u0435\u0442",
    "achv-title": dict.Achievements || "\u0414\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u044F",
    "other-status-section": dict["Players with this game"] || "\u0418\u0433\u0440\u043E\u043A\u0438 \u0441 \u044D\u0442\u043E\u0439 \u0438\u0433\u0440\u043E\u0439",
    "other-wishlist-title": dict["Wishlist Users"] || "\u0412 \u0436\u0435\u043B\u0430\u0435\u043C\u043E\u043C",
    "rate-status-section": dict["How was it?"] || "\u041A\u0430\u043A \u0432\u0430\u043C?",
    "most-helpful-review-section": dict["Most helpful reviews"] || "\u0421\u0430\u043C\u044B\u0435 \u043F\u043E\u043B\u0435\u0437\u043D\u044B\u0435 \u0440\u0435\u0446\u0435\u043D\u0437\u0438\u0438",
    "player-data-label": dict["Player data"] || "\u0414\u0430\u043D\u043D\u044B\u0435 \u0438\u0433\u0440\u043E\u043A\u043E\u0432",
    "suggest-edit-link": dict["Suggest an edit"] || "\u041F\u0440\u0435\u0434\u043B\u043E\u0436\u0438\u0442\u044C \u043F\u0440\u0430\u0432\u043A\u0443",
    "wrong-info-dscrp": dict["See something wrong?"] || "\u041D\u0430\u0448\u043B\u0438 \u043E\u0448\u0438\u0431\u043A\u0443?",
    "info-title": dict.Information || "\u0418\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F",
    "genre-common": dict.Genre || dict.Genres || "\u0416\u0430\u043D\u0440",
    "add-to-title": dict["Add to"] || "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0432",
    "first-review-micro": dict["Be the first to write a review"] || "\u041D\u0430\u043F\u0438\u0448\u0438\u0442\u0435 \u043F\u0435\u0440\u0432\u0443\u044E \u0440\u0435\u0446\u0435\u043D\u0437\u0438\u044E",
    "whats-buzzing-section": dict["What's Buzzing?"] || "\u041E \u0447\u0451\u043C \u0433\u043E\u0432\u043E\u0440\u044F\u0442?",
    "who-follow-title": dict["Who to follow"] || "\u041A\u043E\u0433\u043E \u0447\u0438\u0442\u0430\u0442\u044C",
    "new-post-title": dict["New post"] || "\u041D\u043E\u0432\u044B\u0439 \u043F\u043E\u0441\u0442",
    "public-option": dict.Public || "\u041F\u0443\u0431\u043B\u0438\u0447\u043D\u043E",
    "public-micro": dict.Public || "\u041F\u0443\u0431\u043B\u0438\u0447\u043D\u043E",
    "public-label": dict.Public || "\u041F\u0443\u0431\u043B\u0438\u0447\u043D\u043E",
    "public-common": dict.Public || "\u041F\u0443\u0431\u043B\u0438\u0447\u043D\u043E",
    "c-public-common": dict.Public || "\u041F\u0443\u0431\u043B\u0438\u0447\u043D\u043E",
    "completionist-micro": dict.Completionist || "100% \u043F\u0440\u043E\u0445\u043E\u0436\u0434\u0435\u043D\u0438\u0435",
    "main-story-micro": dict["Main Story"] || "\u041E\u0441\u043D\u043E\u0432\u043D\u043E\u0439 \u0441\u044E\u0436\u0435\u0442",
    "main-sides-micro": dict["Main + Sides"] || "\u0421\u044E\u0436\u0435\u0442 + \u043F\u043E\u0431\u043E\u0447\u043A\u0438",
    "hltb-section": dict["How Long To Beat"] || "How Long To Beat",
    "spoiler-alert": dict["Spoiler alert"] || "\u0421\u043F\u043E\u0439\u043B\u0435\u0440",
    "cmnt-off-option": dict["Turn off comments"] || "\u041E\u0442\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0438"
  };
  function tr(s) {
    if (typeof s !== "string" || s.length < 2 || s.length > 240) return null;
    return fold.get(s) ?? fold.get(s.toLowerCase()) ?? null;
  }
  function trKey(key, val) {
    if (typeof val !== "string") return null;
    const leaf = String(key).split(".").pop();
    if (leaf && BY_KEY[leaf] && BY_KEY[leaf] !== val) return BY_KEY[leaf];
    return tr(val);
  }
  function patchObject(obj, seen2, depth) {
    if (!obj || typeof obj !== "object" || depth > 12 || seen2.has(obj)) return 0;
    seen2.add(obj);
    let n = 0;
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i += 1) {
        if (typeof obj[i] === "string") {
          const next = tr(obj[i]);
          if (next && next !== obj[i]) {
            obj[i] = next;
            n += 1;
          }
        } else n += patchObject(obj[i], seen2, depth + 1);
      }
      return n;
    }
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (typeof val === "string") {
        const next = trKey(key, val);
        if (next && next !== val) {
          obj[key] = next;
          n += 1;
        }
      } else if (val && typeof val === "object") {
        n += patchObject(val, seen2, depth + 1);
      }
    }
    return n;
  }
  function fiberMessages(fiber, depth) {
    if (!fiber || depth > 60) return 0;
    let n = 0;
    const props = fiber.memoizedProps || fiber.pendingProps;
    if (props) {
      if (props.messages && typeof props.messages === "object") {
        n += patchObject(props.messages, /* @__PURE__ */ new WeakSet(), 0);
      }
      if (props.value?.messages && typeof props.value.messages === "object") {
        n += patchObject(props.value.messages, /* @__PURE__ */ new WeakSet(), 0);
      }
      if (props.value && typeof props.value === "object" && props.value.locale) {
        n += patchObject(props.value, /* @__PURE__ */ new WeakSet(), 0);
      }
    }
    const state2 = fiber.memoizedState;
    if (state2 && typeof state2 === "object") {
      let s = state2;
      let guard = 0;
      while (s && guard < 24) {
        if (s.memoizedState?.messages) n += patchObject(s.memoizedState.messages, /* @__PURE__ */ new WeakSet(), 0);
        if (s.queue?.lastRenderedState?.messages) {
          n += patchObject(s.queue.lastRenderedState.messages, /* @__PURE__ */ new WeakSet(), 0);
        }
        if (s.memoizedState && typeof s.memoizedState === "object" && !Array.isArray(s.memoizedState)) {
          const ms = s.memoizedState;
          if (ms.common || ms.community || ms.game) n += patchObject(ms, /* @__PURE__ */ new WeakSet(), 0);
        }
        s = s.next;
        guard += 1;
      }
    }
    n += fiberMessages(fiber.child, depth + 1);
    n += fiberMessages(fiber.sibling, depth + 1);
    return n;
  }
  function scan2() {
    const roots = [document.getElementById("__next"), document.body, document.documentElement].filter(Boolean);
    let total = 0;
    for (const el of roots) {
      for (const key of Object.keys(el)) {
        if (!key.startsWith("__react") && !key.startsWith("_react")) continue;
        const fiber = el[key];
        if (!fiber) continue;
        const start2 = fiber.stateNode || fiber.child || fiber;
        try {
          total += fiberMessages(start2, 0);
        } catch {
        }
      }
    }
    if (total > 0) console.info(`[PANAX RU] patched ${total} next-intl message values`);
    return total;
  }
  let tries = 0;
  const tick2 = () => {
    scan2();
    tries += 1;
    if (tries < 80) setTimeout(tick2, 200);
    else if (tries < 160) setTimeout(tick2, 800);
    else if (tries < 220) setTimeout(tick2, 3e3);
  };
  setTimeout(tick2, 50);
}
