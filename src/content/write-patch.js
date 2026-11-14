function normalizeKey2(s) {
  return String(s || "").replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/\s+/g, " ").trim();
}
function preserveEdges(raw, next) {
  const m = String(raw).match(/^(\s*)([\s\S]*?)(\s*)$/);
  if (!m) return next;
  return m[1] + next + m[3];
}
function startWritePatch(dict) {
  if (globalThis.__PANAX_RU_WRITE_PATCH__) return;
  globalThis.__PANAX_RU_WRITE_PATCH__ = true;
  const map = /* @__PURE__ */ new Map();
  const add = (en, ru) => {
    if (!en || !ru) return;
    map.set(en, ru);
    map.set(en.toLowerCase(), ru);
  };
  const pairs = [
    ["Public", dict.Public || "\u041F\u0443\u0431\u043B\u0438\u0447\u043D\u044B\u0439"],
    ["Private", dict.Private || "\u041F\u0440\u0438\u0432\u0430\u0442\u043D\u044B\u0439"],
    ["Followers only", dict["Followers only"] || "\u0422\u043E\u043B\u044C\u043A\u043E \u043F\u043E\u0434\u043F\u0438\u0441\u0447\u0438\u043A\u0438"],
    ["just dropped a new post", "\u043E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u043B \u043D\u043E\u0432\u044B\u0439 \u043F\u043E\u0441\u0442"],
    ["dropped a new post", "\u043E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u043B \u043D\u043E\u0432\u044B\u0439 \u043F\u043E\u0441\u0442"],
    ["Add to Wishlist", dict["Add to Wishlist"] || "\u0412 \u0436\u0435\u043B\u0430\u0435\u043C\u043E\u0435"],
    ["Add to wishlist", dict["Add to Wishlist"] || "\u0412 \u0436\u0435\u043B\u0430\u0435\u043C\u043E\u0435"],
    ["View Details", dict["View Details"] || "\u041F\u043E\u0434\u0440\u043E\u0431\u043D\u0435\u0435"],
    ["View details", dict["View Details"] || "\u041F\u043E\u0434\u0440\u043E\u0431\u043D\u0435\u0435"],
    ["View full details", dict["View full details"] || "\u041F\u043E\u0434\u0440\u043E\u0431\u043D\u0435\u0435"],
    ["View Full Details", dict["View full details"] || "\u041F\u043E\u0434\u0440\u043E\u0431\u043D\u0435\u0435"],
    ["Hot", dict.Hot || "\u0413\u043E\u0440\u044F\u0447\u0435\u0435"],
    ["New", dict.New || "\u041D\u043E\u0432\u043E\u0435"],
    ["HOT", "\u0413\u041E\u0420\u042F\u0427\u0415\u0415"],
    ["NEW", "\u041D\u041E\u0412\u041E\u0415"],
    ["Followers", dict.Followers || "\u041F\u043E\u0434\u043F\u0438\u0441\u0447\u0438\u043A\u0438"],
    ["Follower", dict.Follower || "\u041F\u043E\u0434\u043F\u0438\u0441\u0447\u0438\u043A"],
    ["Following", dict.Following || "\u041F\u043E\u0434\u043F\u0438\u0441\u043A\u0438"],
    ["Ratings", dict.Ratings || "\u041E\u0446\u0435\u043D\u043A\u0438"],
    ["Rating", dict.Rating || "\u041E\u0446\u0435\u043D\u043A\u0430"],
    ["Wishlist", dict.Wishlist || "\u0416\u0435\u043B\u0430\u0435\u043C\u043E\u0435"],
    ["Also Playing", dict["Also Playing"] || "\u0422\u043E\u0436\u0435 \u0438\u0433\u0440\u0430\u044E\u0442"],
    ["Also Wishlisted", dict["Also Wishlisted"] || "\u0422\u043E\u0436\u0435 \u0432 \u0436\u0435\u043B\u0430\u0435\u043C\u043E\u043C"],
    ["Set status", dict["Set status"] || "\u0421\u0442\u0430\u0442\u0443\u0441"],
    ["Platforms", dict.Platforms || "\u041F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u044B"],
    ["Developer", dict.Developer || "\u0420\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u0447\u0438\u043A"],
    ["Publisher", dict.Publisher || "\u0418\u0437\u0434\u0430\u0442\u0435\u043B\u044C"],
    ["Release", dict.Release || "\u0420\u0435\u043B\u0438\u0437"],
    ["Similar games", dict["Similar games"] || "\u041F\u043E\u0445\u043E\u0436\u0438\u0435 \u0438\u0433\u0440\u044B"],
    ["Similar", dict.Similar || "\u041F\u043E\u0445\u043E\u0436\u0438\u0435"],
    ["Get Started", dict["Get Started"] || "\u041D\u0430\u0447\u0430\u0442\u044C"],
    ["Join us for free", dict["Join us for free"] || "\u041F\u0440\u0438\u0441\u043E\u0435\u0434\u0438\u043D\u044F\u0439\u0441\u044F \u0431\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u043E"],
    ["Join now", dict["Join now"] || "\u041F\u0440\u0438\u0441\u043E\u0435\u0434\u0438\u043D\u0438\u0442\u044C\u0441\u044F"],
    ["Join now and level up your gaming!", dict["Join now and level up your gaming!"] || "\u041F\u0440\u0438\u0441\u043E\u0435\u0434\u0438\u043D\u044F\u0439\u0441\u044F \u0438 \u043F\u0440\u043E\u043A\u0430\u0447\u0438\u0432\u0430\u0439 \u0441\u0432\u043E\u0439 \u0433\u0435\u0439\u043C\u0438\u043D\u0433!"],
    ["What's Buzzing?", dict["What's Buzzing?"] || "\u041E \u0447\u0451\u043C \u0433\u043E\u0432\u043E\u0440\u044F\u0442?"],
    ["Most talked about right now", dict["Most talked about right now"] || "\u0421\u0435\u0439\u0447\u0430\u0441 \u043E\u0431\u0441\u0443\u0436\u0434\u0430\u044E\u0442 \u0431\u043E\u043B\u044C\u0448\u0435 \u0432\u0441\u0435\u0433\u043E"],
    ["Who to follow", dict["Who to follow"] || "\u041A\u043E\u0433\u043E \u0447\u0438\u0442\u0430\u0442\u044C"],
    ["New post", dict["New post"] || "\u041D\u043E\u0432\u044B\u0439 \u043F\u043E\u0441\u0442"],
    ["Public", dict.Public || "\u041F\u0443\u0431\u043B\u0438\u0447\u043D\u043E"],
    ["Completionist", dict.Completionist || "100% \u043F\u0440\u043E\u0445\u043E\u0436\u0434\u0435\u043D\u0438\u0435"],
    ["Main Story", dict["Main Story"] || "\u041E\u0441\u043D\u043E\u0432\u043D\u043E\u0439 \u0441\u044E\u0436\u0435\u0442"],
    ["Main + Sides", dict["Main + Sides"] || "\u0421\u044E\u0436\u0435\u0442 + \u043F\u043E\u0431\u043E\u0447\u043A\u0438"],
    ["How Long To Beat", dict["How Long To Beat"] || "How Long To Beat"],
    ["Level Up!", dict["Level Up!"] || "\u041D\u043E\u0432\u044B\u0439 \u0443\u0440\u043E\u0432\u0435\u043D\u044C!"],
    ["Level up!", dict["Level Up!"] || "\u041D\u043E\u0432\u044B\u0439 \u0443\u0440\u043E\u0432\u0435\u043D\u044C!"],
    ["\u0423\u0440\u043E\u0432\u0435\u043D\u044C Up!", "\u041D\u043E\u0432\u044B\u0439 \u0443\u0440\u043E\u0432\u0435\u043D\u044C!"],
    ["\u0423\u0440\u043E\u0432\u0435\u043D\u044C Up", "\u041D\u043E\u0432\u044B\u0439 \u0443\u0440\u043E\u0432\u0435\u043D\u044C"],
    ["Check your profile to see what's new.", "\u0417\u0430\u0433\u043B\u044F\u043D\u0438\u0442\u0435 \u0432 \u0441\u0432\u043E\u0439 \u043F\u0440\u043E\u0444\u0438\u043B\u044C, \u0447\u0442\u043E\u0431\u044B \u0443\u0437\u043D\u0430\u0442\u044C, \u0447\u0442\u043E \u043D\u043E\u0432\u043E\u0433\u043E."],
    ["Check your profile to see what\u2019s new.", "\u0417\u0430\u0433\u043B\u044F\u043D\u0438\u0442\u0435 \u0432 \u0441\u0432\u043E\u0439 \u043F\u0440\u043E\u0444\u0438\u043B\u044C, \u0447\u0442\u043E\u0431\u044B \u0443\u0437\u043D\u0430\u0442\u044C, \u0447\u0442\u043E \u043D\u043E\u0432\u043E\u0433\u043E."],
    ["Check your \u041F\u0440\u043E\u0444\u0438\u043B\u044C to see what's new.", "\u0417\u0430\u0433\u043B\u044F\u043D\u0438\u0442\u0435 \u0432 \u0441\u0432\u043E\u0439 \u043F\u0440\u043E\u0444\u0438\u043B\u044C, \u0447\u0442\u043E\u0431\u044B \u0443\u0437\u043D\u0430\u0442\u044C, \u0447\u0442\u043E \u043D\u043E\u0432\u043E\u0433\u043E."],
    ["Check your \u041F\u0440\u043E\u0444\u0438\u043B\u044C to see what\u2019s new.", "\u0417\u0430\u0433\u043B\u044F\u043D\u0438\u0442\u0435 \u0432 \u0441\u0432\u043E\u0439 \u043F\u0440\u043E\u0444\u0438\u043B\u044C, \u0447\u0442\u043E\u0431\u044B \u0443\u0437\u043D\u0430\u0442\u044C, \u0447\u0442\u043E \u043D\u043E\u0432\u043E\u0433\u043E."],
    ["Check your \u043F\u0440\u043E\u0444\u0438\u043B\u044C to see what's new.", "\u0417\u0430\u0433\u043B\u044F\u043D\u0438\u0442\u0435 \u0432 \u0441\u0432\u043E\u0439 \u043F\u0440\u043E\u0444\u0438\u043B\u044C, \u0447\u0442\u043E\u0431\u044B \u0443\u0437\u043D\u0430\u0442\u044C, \u0447\u0442\u043E \u043D\u043E\u0432\u043E\u0433\u043E."],
    ["Check your \u043F\u0440\u043E\u0444\u0438\u043B\u044C to see what\u2019s new.", "\u0417\u0430\u0433\u043B\u044F\u043D\u0438\u0442\u0435 \u0432 \u0441\u0432\u043E\u0439 \u043F\u0440\u043E\u0444\u0438\u043B\u044C, \u0447\u0442\u043E\u0431\u044B \u0443\u0437\u043D\u0430\u0442\u044C, \u0447\u0442\u043E \u043D\u043E\u0432\u043E\u0433\u043E."],
    ["Check your", "\u0417\u0430\u0433\u043B\u044F\u043D\u0438\u0442\u0435 \u0432 \u0441\u0432\u043E\u0439"],
    ["to see what's new.", ", \u0447\u0442\u043E\u0431\u044B \u0443\u0437\u043D\u0430\u0442\u044C, \u0447\u0442\u043E \u043D\u043E\u0432\u043E\u0433\u043E."],
    ["to see what\u2019s new.", ", \u0447\u0442\u043E\u0431\u044B \u0443\u0437\u043D\u0430\u0442\u044C, \u0447\u0442\u043E \u043D\u043E\u0432\u043E\u0433\u043E."],
    ["see what's new.", ", \u0447\u0442\u043E\u0431\u044B \u0443\u0437\u043D\u0430\u0442\u044C, \u0447\u0442\u043E \u043D\u043E\u0432\u043E\u0433\u043E."],
    ["see what\u2019s new.", ", \u0447\u0442\u043E\u0431\u044B \u0443\u0437\u043D\u0430\u0442\u044C, \u0447\u0442\u043E \u043D\u043E\u0432\u043E\u0433\u043E."],
    ["Log in daily to level up unlock avatar items! Streak resets daily at 3 AM.", "\u0417\u0430\u0445\u043E\u0434\u0438\u0442\u0435 \u043A\u0430\u0436\u0434\u044B\u0439 \u0434\u0435\u043D\u044C, \u0447\u0442\u043E\u0431\u044B \u043F\u043E\u0432\u044B\u0448\u0430\u0442\u044C \u0443\u0440\u043E\u0432\u0435\u043D\u044C \u0438 \u043E\u0442\u043A\u0440\u044B\u0432\u0430\u0442\u044C \u043F\u0440\u0435\u0434\u043C\u0435\u0442\u044B \u0430\u0432\u0430\u0442\u0430\u0440\u0430! \u0421\u0435\u0440\u0438\u044F \u0441\u0431\u0440\u0430\u0441\u044B\u0432\u0430\u0435\u0442\u0441\u044F \u043A\u0430\u0436\u0434\u044B\u0439 \u0434\u0435\u043D\u044C \u0432 3:00."],
    ["Log in daily to level up & unlock avatar items! Streak resets daily at 3 AM.", "\u0417\u0430\u0445\u043E\u0434\u0438\u0442\u0435 \u043A\u0430\u0436\u0434\u044B\u0439 \u0434\u0435\u043D\u044C, \u0447\u0442\u043E\u0431\u044B \u043F\u043E\u0432\u044B\u0448\u0430\u0442\u044C \u0443\u0440\u043E\u0432\u0435\u043D\u044C \u0438 \u043E\u0442\u043A\u0440\u044B\u0432\u0430\u0442\u044C \u043F\u0440\u0435\u0434\u043C\u0435\u0442\u044B \u0430\u0432\u0430\u0442\u0430\u0440\u0430! \u0421\u0435\u0440\u0438\u044F \u0441\u0431\u0440\u0430\u0441\u044B\u0432\u0430\u0435\u0442\u0441\u044F \u043A\u0430\u0436\u0434\u044B\u0439 \u0434\u0435\u043D\u044C \u0432 3:00."],
    ["Log in daily to \u041D\u043E\u0432\u044B\u0439 \u0443\u0440\u043E\u0432\u0435\u043D\u044C! unlock avatar items! Streak resets daily at 3 AM.", "\u0417\u0430\u0445\u043E\u0434\u0438\u0442\u0435 \u043A\u0430\u0436\u0434\u044B\u0439 \u0434\u0435\u043D\u044C, \u0447\u0442\u043E\u0431\u044B \u043F\u043E\u0432\u044B\u0448\u0430\u0442\u044C \u0443\u0440\u043E\u0432\u0435\u043D\u044C \u0438 \u043E\u0442\u043A\u0440\u044B\u0432\u0430\u0442\u044C \u043F\u0440\u0435\u0434\u043C\u0435\u0442\u044B \u0430\u0432\u0430\u0442\u0430\u0440\u0430! \u0421\u0435\u0440\u0438\u044F \u0441\u0431\u0440\u0430\u0441\u044B\u0432\u0430\u0435\u0442\u0441\u044F \u043A\u0430\u0436\u0434\u044B\u0439 \u0434\u0435\u043D\u044C \u0432 3:00."],
    ["just dropped a new post", dict["just dropped a new post"] || "\u043E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u043B(\u0430) \u043D\u043E\u0432\u044B\u0439 \u043F\u043E\u0441\u0442"],
    ["dropped a new post", dict["dropped a new post"] || "\u043E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u043B(\u0430) \u043D\u043E\u0432\u044B\u0439 \u043F\u043E\u0441\u0442"],
    ["replied on your comment", "\u043E\u0442\u0432\u0435\u0442\u0438\u043B \u043D\u0430 \u0432\u0430\u0448 \u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439"],
    ["replied to your comment", "\u043E\u0442\u0432\u0435\u0442\u0438\u043B \u043D\u0430 \u0432\u0430\u0448 \u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439"],
    ["replied on your Comment", "\u043E\u0442\u0432\u0435\u0442\u0438\u043B \u043D\u0430 \u0432\u0430\u0448 \u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439"],
    ["replied to your Comment", "\u043E\u0442\u0432\u0435\u0442\u0438\u043B \u043D\u0430 \u0432\u0430\u0448 \u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439"],
    ["replied on your \u041A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439", "\u043E\u0442\u0432\u0435\u0442\u0438\u043B \u043D\u0430 \u0432\u0430\u0448 \u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439"],
    ["replied to your \u041A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439", "\u043E\u0442\u0432\u0435\u0442\u0438\u043B \u043D\u0430 \u0432\u0430\u0448 \u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439"],
    ["liked your comment", "\u043E\u0446\u0435\u043D\u0438\u043B \u0432\u0430\u0448 \u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439"],
    ["liked your Comment", "\u043E\u0446\u0435\u043D\u0438\u043B \u0432\u0430\u0448 \u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439"],
    ["liked your \u041A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439", "\u043E\u0446\u0435\u043D\u0438\u043B \u0432\u0430\u0448 \u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439"],
    ["\u041D\u0440\u0430\u0432\u0438\u0442\u0441\u044F your comment", "\u043E\u0446\u0435\u043D\u0438\u043B \u0432\u0430\u0448 \u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439"],
    ["\u041D\u0440\u0430\u0432\u0438\u0442\u0441\u044F your Comment", "\u043E\u0446\u0435\u043D\u0438\u043B \u0432\u0430\u0448 \u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439"],
    ["\u041D\u0440\u0430\u0432\u0438\u0442\u0441\u044F your \u041A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439", "\u043E\u0446\u0435\u043D\u0438\u043B \u0432\u0430\u0448 \u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439"],
    ["liked your post", "\u043E\u0446\u0435\u043D\u0438\u043B \u0432\u0430\u0448 \u043F\u043E\u0441\u0442"],
    ["liked your Post", "\u043E\u0446\u0435\u043D\u0438\u043B \u0432\u0430\u0448 \u043F\u043E\u0441\u0442"],
    ["liked your \u041F\u043E\u0441\u0442", "\u043E\u0446\u0435\u043D\u0438\u043B \u0432\u0430\u0448 \u043F\u043E\u0441\u0442"],
    ["\u041D\u0440\u0430\u0432\u0438\u0442\u0441\u044F your post", "\u043E\u0446\u0435\u043D\u0438\u043B \u0432\u0430\u0448 \u043F\u043E\u0441\u0442"],
    ["\u041D\u0440\u0430\u0432\u0438\u0442\u0441\u044F your Post", "\u043E\u0446\u0435\u043D\u0438\u043B \u0432\u0430\u0448 \u043F\u043E\u0441\u0442"],
    ["\u041D\u0440\u0430\u0432\u0438\u0442\u0441\u044F your \u041F\u043E\u0441\u0442", "\u043E\u0446\u0435\u043D\u0438\u043B \u0432\u0430\u0448 \u043F\u043E\u0441\u0442"],
    ["commented on your post", "\u043F\u0440\u043E\u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0438\u0440\u043E\u0432\u0430\u043B \u0432\u0430\u0448 \u043F\u043E\u0441\u0442"],
    ["commented on your Post", "\u043F\u0440\u043E\u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0438\u0440\u043E\u0432\u0430\u043B \u0432\u0430\u0448 \u043F\u043E\u0441\u0442"],
    ["commented on your \u041F\u043E\u0441\u0442", "\u043F\u0440\u043E\u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0438\u0440\u043E\u0432\u0430\u043B \u0432\u0430\u0448 \u043F\u043E\u0441\u0442"],
    ["is now", "\u2014 \u0441\u043A\u0438\u0434\u043A\u0430"],
    ["is \u0441\u0435\u0439\u0447\u0430\u0441", "\u2014 \u0441\u043A\u0438\u0434\u043A\u0430"],
    ["Get it", "\u041A\u0443\u043F\u0438\u0442\u0435"],
    ["Get it on Steam", "\u041A\u0443\u043F\u0438\u0442\u0435 \u0432 Steam"],
    ["Get it on Steam for", "\u041A\u0443\u043F\u0438\u0442\u0435 \u0432 Steam \u0437\u0430"],
    ["before the sale ends", "\u0434\u043E \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u044F \u0441\u043A\u0438\u0434\u043A\u0438"],
    ["before the sale ends on", "\u0434\u043E \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u044F \u0441\u043A\u0438\u0434\u043A\u0438"],
    ["What game is this about?", dict["What game is this about?"] || "\u041E \u043A\u0430\u043A\u043E\u0439 \u0438\u0433\u0440\u0435 \u043F\u043E\u0441\u0442?"],
    ["What's on your mind? Use ## to tag a game", dict["What's on your mind? Use ## to tag a game"] || "\u041E \u0447\u0451\u043C \u0434\u0443\u043C\u0430\u0435\u0448\u044C? \u0427\u0435\u0440\u0435\u0437 ## \u043C\u043E\u0436\u043D\u043E \u043E\u0442\u043C\u0435\u0442\u0438\u0442\u044C \u0438\u0433\u0440\u0443"],
    ["Spoiler alert", dict["Spoiler alert"] || "\u0421\u043F\u043E\u0439\u043B\u0435\u0440"],
    ["Turn off comments", dict["Turn off comments"] || "\u041E\u0442\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0438"],
    ["Frequently used", dict["Frequently used"] || "\u0427\u0430\u0441\u0442\u043E \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u043C\u044B\u0435"],
    ["Smileys & People", dict["Smileys & People"] || "\u0421\u043C\u0430\u0439\u043B\u044B \u0438 \u043B\u044E\u0434\u0438"],
    ["Animals & Nature", dict["Animals & Nature"] || "\u0416\u0438\u0432\u043E\u0442\u043D\u044B\u0435 \u0438 \u043F\u0440\u0438\u0440\u043E\u0434\u0430"],
    ["Food & Drink", dict["Food & Drink"] || "\u0415\u0434\u0430 \u0438 \u043D\u0430\u043F\u0438\u0442\u043A\u0438"],
    ["Travel & Places", dict["Travel & Places"] || "\u041F\u0443\u0442\u0435\u0448\u0435\u0441\u0442\u0432\u0438\u044F \u0438 \u043C\u0435\u0441\u0442\u0430"],
    ["Pick an emoji...", dict["Pick an emoji..."] || "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u044D\u043C\u043E\u0434\u0437\u0438\u2026"],
    ["Pick an emoji", dict["Pick an emoji"] || "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u044D\u043C\u043E\u0434\u0437\u0438"],
    ["Tag a game", dict["Tag a game"] || "\u041E\u0442\u043C\u0435\u0442\u0438\u0442\u044C \u0438\u0433\u0440\u0443"],
    ["Enter a game title", dict["Enter a game title"] || "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0438\u0433\u0440\u044B"],
    ["Choose a label for this post", dict["Choose a label for this post"] || "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u044F\u0440\u043B\u044B\u043A \u0434\u043B\u044F \u043F\u043E\u0441\u0442\u0430"],
    ["Off-Topic", dict["Off-Topic"] || "\u041E\u0444\u0444\u0442\u043E\u043F"],
    ["Not interested in this game?", dict["Not interested in this game?"] || "\u042D\u0442\u0430 \u0438\u0433\u0440\u0430 \u043D\u0435 \u0438\u043D\u0442\u0435\u0440\u0435\u0441\u043D\u0430?"],
    ["Hide", dict.Hide || "\u0421\u043A\u0440\u044B\u0442\u044C"],
    [
      "Link games so others can jump straight into the info! In comments, simply type ## to link.",
      dict["Link games so others can jump straight into the info! In comments, simply type ## to link."] || "\u041E\u0442\u043C\u0435\u0447\u0430\u0439\u0442\u0435 \u0438\u0433\u0440\u044B, \u0447\u0442\u043E\u0431\u044B \u0434\u0440\u0443\u0433\u0438\u0435 \u0441\u0440\u0430\u0437\u0443 \u043E\u0442\u043A\u0440\u044B\u0432\u0430\u043B\u0438 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0443. \u0412 \u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u044F\u0445 \u0434\u043B\u044F \u044D\u0442\u043E\u0433\u043E \u043F\u0438\u0448\u0438\u0442\u0435 ##."
    ],
    [
      "Games you posted about in the last 7 days, or trending games.",
      dict["Games you posted about in the last 7 days, or trending games."] || "\u0418\u0433\u0440\u044B, \u043E \u043A\u043E\u0442\u043E\u0440\u044B\u0445 \u0432\u044B \u043F\u0438\u0441\u0430\u043B\u0438 \u0437\u0430 \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0435 7 \u0434\u043D\u0435\u0439, \u0438 \u0438\u0433\u0440\u044B \u0432 \u0442\u0440\u0435\u043D\u0434\u0435."
    ],
    ["Discard this post?", dict["Discard this post?"] || "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u044D\u0442\u043E\u0442 \u043F\u043E\u0441\u0442?"],
    ["If you leave now, your draft won't be saved.", dict["If you leave now, your draft won't be saved."] || "\u0415\u0441\u043B\u0438 \u0432\u044B\u0439\u0442\u0438 \u0441\u0435\u0439\u0447\u0430\u0441, \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A \u043D\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u0441\u044F."],
    ["Keep posting", dict["Keep posting"] || "\u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C"],
    ["Discard", dict.Discard || "\u0423\u0434\u0430\u043B\u0438\u0442\u044C"],
    ["Pin games", dict["Pin games"] || "\u0417\u0430\u043A\u0440\u0435\u043F\u0438\u0442\u044C \u0438\u0433\u0440\u044B"],
    ["Want quick access to your games?", dict["Want quick access to your games?"] || "\u041D\u0443\u0436\u0435\u043D \u0431\u044B\u0441\u0442\u0440\u044B\u0439 \u0434\u043E\u0441\u0442\u0443\u043F \u043A \u0438\u0433\u0440\u0430\u043C?"],
    ["Pin them to the top!", dict["Pin them to the top!"] || "\u0417\u0430\u043A\u0440\u0435\u043F\u0438\u0442\u0435 \u0438\u0445 \u043D\u0430\u0432\u0435\u0440\u0445\u0443!"],
    ["About Us", dict["About Us"] || "\u041E \u043D\u0430\u0441"],
    ["Settings", dict.Settings || "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438"],
    ["Send feedback", dict["Send feedback"] || "\u041D\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u043E\u0442\u0437\u044B\u0432"],
    ["Space", dict.Space || "\u041F\u0440\u043E\u0441\u0442\u0440\u0430\u043D\u0441\u0442\u0432\u043E"],
    ["Discover", dict.Discover || "\u041E\u0431\u0437\u043E\u0440"],
    ["Arcade", dict.Arcade || "\u0410\u0440\u043A\u0430\u0434\u0430"],
    ["Community", dict.Community || "\u0421\u043E\u043E\u0431\u0449\u0435\u0441\u0442\u0432\u043E"],
    ["Translate", dict.Translate || "\u041F\u0435\u0440\u0435\u0432\u0435\u0441\u0442\u0438"],
    ["No comments yet", dict["No comments yet"] || "\u041F\u043E\u043A\u0430 \u043D\u0435\u0442 \u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0435\u0432"],
    ["New review", dict["New review"] || "\u041D\u043E\u0432\u0430\u044F \u0440\u0435\u0446\u0435\u043D\u0437\u0438\u044F"],
    ["Trophy grade", dict["Trophy grade"] || "\u0420\u0435\u0434\u043A\u043E\u0441\u0442\u044C \u0442\u0440\u043E\u0444\u0435\u0435\u0432"],
    ["Earned date", dict["Earned date"] || "\u0414\u0430\u0442\u0430 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u044F"],
    ["Most common", dict["Most common"] || "\u0421\u0430\u043C\u044B\u0435 \u0447\u0430\u0441\u0442\u044B\u0435"],
    ["Most rare", dict["Most rare"] || "\u0421\u0430\u043C\u044B\u0435 \u0440\u0435\u0434\u043A\u0438\u0435"],
    ["Link PS", dict["Link PS"] || "\u041F\u0440\u0438\u0432\u044F\u0437\u0430\u0442\u044C PS"],
    ["Link PS now", dict["Link PS now"] || "\u041F\u0440\u0438\u0432\u044F\u0437\u0430\u0442\u044C PS \u0441\u0435\u0439\u0447\u0430\u0441"],
    ["Link PS account to share trophies", dict["Link PS account to share trophies"] || "\u041F\u0440\u0438\u0432\u044F\u0436\u0438\u0442\u0435 \u0430\u043A\u043A\u0430\u0443\u043D\u0442 PS, \u0447\u0442\u043E\u0431\u044B \u0434\u0435\u043B\u0438\u0442\u044C\u0441\u044F \u0442\u0440\u043E\u0444\u0435\u044F\u043C\u0438"],
    ["Connect with players to grab and guard badges!", dict["Connect with players to grab and guard badges!"] || "\u041E\u0431\u0449\u0430\u0439\u0442\u0435\u0441\u044C \u0441 \u0438\u0433\u0440\u043E\u043A\u0430\u043C\u0438, \u0447\u0442\u043E\u0431\u044B \u043F\u043E\u043B\u0443\u0447\u0430\u0442\u044C \u0438 \u0437\u0430\u0449\u0438\u0449\u0430\u0442\u044C \u0437\u043D\u0430\u0447\u043A\u0438!"],
    ["Game Rate", dict["Game Rate"] || "\u041E\u0446\u0435\u043D\u043A\u0438 \u0438\u0433\u0440"],
    ["Preferences", dict.Preferences || "\u041F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u044B"],
    ["Language", dict.Language || "\u042F\u0437\u044B\u043A"],
    ["Blocked management", dict["Blocked management"] || "\u0417\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0435"],
    ["Service", dict.Service || "\u0421\u0435\u0440\u0432\u0438\u0441"],
    ["FAQ", dict.FAQ || "\u0412\u043E\u043F\u0440\u043E\u0441\u044B \u0438 \u043E\u0442\u0432\u0435\u0442\u044B"],
    ["Privacy Policy", dict["Privacy Policy"] || "\u041F\u043E\u043B\u0438\u0442\u0438\u043A\u0430 \u043A\u043E\u043D\u0444\u0438\u0434\u0435\u043D\u0446\u0438\u0430\u043B\u044C\u043D\u043E\u0441\u0442\u0438"],
    ["Terms of Service", dict["Terms of Service"] || "\u0423\u0441\u043B\u043E\u0432\u0438\u044F \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u044F"],
    ["Cookie Policy", dict["Cookie Policy"] || "\u041F\u043E\u043B\u0438\u0442\u0438\u043A\u0430 cookie"],
    ["Community Guideline", dict["Community Guideline"] || "\u041F\u0440\u0430\u0432\u0438\u043B\u0430 \u0441\u043E\u043E\u0431\u0449\u0435\u0441\u0442\u0432\u0430"],
    ["Account", dict.Account || "\u0410\u043A\u043A\u0430\u0443\u043D\u0442"],
    ["Signed in with Google", dict["Signed in with Google"] || "\u0412\u0445\u043E\u0434 \u0447\u0435\u0440\u0435\u0437 Google"],
    ["Manage account", dict["Manage account"] || "\u0423\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u043E\u043C"],
    ["Platforms & games", dict["Platforms & games"] || "\u041F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u044B \u0438 \u0438\u0433\u0440\u044B"],
    ["Linked platforms", dict["Linked platforms"] || "\u041F\u0440\u0438\u0432\u044F\u0437\u0430\u043D\u043D\u044B\u0435 \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u044B"],
    ["Hidden games", dict["Hidden games"] || "\u0421\u043A\u0440\u044B\u0442\u044B\u0435 \u0438\u0433\u0440\u044B"],
    ["Display language", dict["Display language"] || "\u042F\u0437\u044B\u043A \u0438\u043D\u0442\u0435\u0440\u0444\u0435\u0439\u0441\u0430"],
    ["Content language", dict["Content language"] || "\u042F\u0437\u044B\u043A \u043A\u043E\u043D\u0442\u0435\u043D\u0442\u0430"],
    ["English", dict.English || "\u0410\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u0438\u0439"],
    ["Korean", dict.Korean || "\u041A\u043E\u0440\u0435\u0439\u0441\u043A\u0438\u0439"],
    ["Japanese", dict.Japanese || "\u042F\u043F\u043E\u043D\u0441\u043A\u0438\u0439"],
    ["Portuguese", dict.Portuguese || "\u041F\u043E\u0440\u0442\u0443\u0433\u0430\u043B\u044C\u0441\u043A\u0438\u0439"],
    ["Spanish", dict.Spanish || "\u0418\u0441\u043F\u0430\u043D\u0441\u043A\u0438\u0439"],
    ["French", dict.French || "\u0424\u0440\u0430\u043D\u0446\u0443\u0437\u0441\u043A\u0438\u0439"],
    ["More languages are on the way.", dict["More languages are on the way."] || "\u0421\u043A\u043E\u0440\u043E \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F \u0434\u0440\u0443\u0433\u0438\u0435 \u044F\u0437\u044B\u043A\u0438."],
    [
      "Select the language we'll translate posts, reviews, and comments into.",
      dict["Select the language we'll translate posts, reviews, and comments into."] || "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u044F\u0437\u044B\u043A, \u043D\u0430 \u043A\u043E\u0442\u043E\u0440\u044B\u0439 \u043F\u0435\u0440\u0435\u0432\u043E\u0434\u0438\u0442\u044C \u043F\u043E\u0441\u0442\u044B, \u0440\u0435\u0446\u0435\u043D\u0437\u0438\u0438 \u0438 \u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0438."
    ],
    [
      "Select the language for menus, buttons, and system text.",
      dict["Select the language for menus, buttons, and system text."] || "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u044F\u0437\u044B\u043A \u043C\u0435\u043D\u044E, \u043A\u043D\u043E\u043F\u043E\u043A \u0438 \u0441\u0438\u0441\u0442\u0435\u043C\u043D\u043E\u0433\u043E \u0442\u0435\u043A\u0441\u0442\u0430."
    ],
    [
      "Initially set to match your system language (or English if unsupported). Any changes you make will be saved.",
      dict["Initially set to match your system language (or English if unsupported). Any changes you make will be saved."] || "\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0431\u0435\u0440\u0451\u0442\u0441\u044F \u044F\u0437\u044B\u043A \u0441\u0438\u0441\u0442\u0435\u043C\u044B (\u0438\u043B\u0438 \u0430\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u0438\u0439, \u0435\u0441\u043B\u0438 \u044F\u0437\u044B\u043A \u043D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044F). \u0418\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u044E\u0442\u0441\u044F."
    ],
    [
      "Language for menus, buttons, and system text",
      dict["Language for menus, buttons, and system text"] || "\u042F\u0437\u044B\u043A \u043C\u0435\u043D\u044E, \u043A\u043D\u043E\u043F\u043E\u043A \u0438 \u0441\u0438\u0441\u0442\u0435\u043C\u043D\u043E\u0433\u043E \u0442\u0435\u043A\u0441\u0442\u0430"
    ],
    [
      "Language for translated posts, reviews, and comments",
      dict["Language for translated posts, reviews, and comments"] || "\u042F\u0437\u044B\u043A \u043F\u0435\u0440\u0435\u0432\u0435\u0434\u0451\u043D\u043D\u044B\u0445 \u043F\u043E\u0441\u0442\u043E\u0432, \u0440\u0435\u0446\u0435\u043D\u0437\u0438\u0439 \u0438 \u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0435\u0432"
    ],
    ["Connect to update your Trophy Hall", dict["Connect to update your Trophy Hall"] || "\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u0435, \u0447\u0442\u043E\u0431\u044B \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0437\u0430\u043B \u0442\u0440\u043E\u0444\u0435\u0435\u0432"],
    ["How to disconnect", dict["How to disconnect"] || "\u041A\u0430\u043A \u043E\u0442\u043A\u043B\u044E\u0447\u0438\u0442\u044C"]
  ];
  for (const [en, ru] of pairs) add(en, ru);
  const EDITOR_SEL = '.edit-btn, .edit-label, .footer-btn, .floating-btn, .subtab-btn, .tab-btn, [class*="subtab-btn"], [class*="footer-btn"], [class*="floating-btn"]';
  function translateRaw(raw, parent) {
    if (typeof raw !== "string") return null;
    const key = normalizeKey2(raw);
    if (!key || key.length > 240) return null;
    if (!(parent && parent.isContentEditable)) {
      const stamped = translateTimestamp(raw) ?? translateTimeFragment(raw, parent) ?? translateNotice(raw) ?? translateActivity(raw) ?? translateCount(raw);
      if (stamped != null && normalizeKey2(stamped) !== key) return preserveEdges(raw, stamped);
    }
    const level = key.match(/^Lv\.?\s*(\d+)$/i);
    if (level) return preserveEdges(raw, `\u041B\u0432\u043B ${level[1]}`);
    if (/^Lv$/i.test(key)) return preserveEdges(raw, "\u041B\u0432\u043B");
    const profileTab = key.match(/^(Posts|Reviews|Collections|Following games|Top)(?:\s+([\d.,]+\s*[KMBkmb]?))?(?:\s*[▾▼˅])?$/i);
    if (profileTab) {
      const labels = {
        posts: "\u041F\u043E\u0441\u0442\u044B",
        reviews: "\u0420\u0435\u0446\u0435\u043D\u0437\u0438\u0438",
        collections: "\u041A\u043E\u043B\u043B\u0435\u043A\u0446\u0438\u0438",
        "following games": "\u0418\u0433\u0440\u044B \u0432 \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0430\u0445",
        top: "\u0422\u043E\u043F"
      };
      const label = labels[profileTab[1].toLowerCase()];
      if (label) return preserveEdges(raw, profileTab[2] ? `${label} ${profileTab[2]}` : label);
    }
    if (/\bLv\.?\s*\d+\b/i.test(key) && key.length < 80) {
      const next = key.replace(/\bLv\.?\s*(\d+)\b/gi, "\u041B\u0432\u043B $1");
      if (next !== key) return preserveEdges(raw, next);
    }
    const liked = key.match(/^(.+?)\s+and\s+(?:(\d+)\s+)?others?\s+liked$/i);
    if (liked && key.length < 120) {
      const who = liked[1];
      const n = liked[2];
      const forms = ["\u0447\u0435\u043B\u043E\u0432\u0435\u043A", "\u0447\u0435\u043B\u043E\u0432\u0435\u043A\u0430", "\u0447\u0435\u043B\u043E\u0432\u0435\u043A"];
      const nAbs = Math.abs(Number(n) || 0);
      const mod10 = nAbs % 10;
      const mod100 = nAbs % 100;
      const form = mod100 >= 11 && mod100 <= 14 ? forms[2] : mod10 === 1 ? forms[0] : mod10 >= 2 && mod10 <= 4 ? forms[1] : forms[2];
      const tail = /got help/i.test(key) ? n ? `\u0438 \u0435\u0449\u0451 ${n} \u043F\u043E\u043C\u043E\u0433\u043B\u043E` : "\u0438 \u0434\u0440\u0443\u0433\u0438\u043C \u043F\u043E\u043C\u043E\u0433\u043B\u043E" : n ? `\u0438 \u0435\u0449\u0451 ${n} ${form} \u043E\u0446\u0435\u043D\u0438\u043B\u0438` : "\u0438 \u0434\u0440\u0443\u0433\u0438\u0435 \u043E\u0446\u0435\u043D\u0438\u043B\u0438";
      return preserveEdges(raw, `${who} ${tail}`);
    }
    if (parent && /^more$/i.test(key) && (parent.classList?.contains("more-button-inline") || parent.closest?.(".more-button-inline"))) {
      return preserveEdges(raw, "\u0415\u0449\u0451");
    }
    if (parent?.closest?.(EDITOR_SEL) || parent?.matches?.(EDITOR_SEL)) {
      const editor = {
        edit: "\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C",
        exit: "\u0412\u044B\u0439\u0442\u0438",
        colors: "\u0426\u0432\u0435\u0442\u0430",
        hair: "\u0412\u043E\u043B\u043E\u0441\u044B",
        beard: "\u0411\u043E\u0440\u043E\u0434\u0430",
        shape: "\u0424\u043E\u0440\u043C\u0430",
        brows: "\u0411\u0440\u043E\u0432\u0438",
        eyes: "\u0413\u043B\u0430\u0437\u0430",
        nose: "\u041D\u043E\u0441",
        mouth: "\u0420\u043E\u0442",
        top: "\u0412\u0435\u0440\u0445",
        bottom: "\u041D\u0438\u0437",
        shoes: "\u041E\u0431\u0443\u0432\u044C",
        glasses: "\u041E\u0447\u043A\u0438",
        cap: "\u041A\u0435\u043F\u043A\u0430",
        age: "\u0412\u043E\u0437\u0440\u0430\u0441\u0442",
        makeup: "\u041C\u0430\u043A\u0438\u044F\u0436",
        paint: "\u041A\u0440\u0430\u0441\u043A\u0430",
        scar: "\u0428\u0440\u0430\u043C",
        spot: "\u041F\u044F\u0442\u043D\u043E",
        pose: "\u041F\u043E\u0437\u0430",
        custom: "\u0421\u0432\u043E\u0451"
      }[key.toLowerCase()];
      if (editor) return preserveEdges(raw, editor);
    }
    if (parent) {
      if (shouldSkipRoot(parent) || parent.isContentEditable) return null;
      if (!key.includes(" ")) {
        if (!isChromeContext(parent)) return null;
        let host2 = parent;
        for (let i = 0; i < 4 && host2.parentElement && normalizeKey2(host2.textContent || "") === key; i += 1) {
          host2 = host2.parentElement;
        }
        const hostText = normalizeKey2(host2.textContent || "");
        if (hostText && hostText !== key && hostText.length > key.length + 2 && !parent.closest?.('button, [role="button"], [role="tab"], [role="menuitem"], [role="option"], nav, header, [role="navigation"], [class*="tab-button"], select, option, label')) {
          const extra = hostText.toLowerCase().split(key.toLowerCase()).join(" ").trim().split(/\s+/).filter((w) => w.length >= 2 && /^[a-z]+$/i.test(w));
          if (extra.length >= 1) return null;
        }
      }
    }
    const hit = map.get(key) ?? map.get(key.toLowerCase());
    if (!hit || hit === key) return null;
    return preserveEdges(raw, hit);
  }
  function patchAccessor(obj, prop) {
    const desc = Object.getOwnPropertyDescriptor(obj, prop);
    if (!desc || !desc.set || !desc.get || !desc.configurable) return false;
    Object.defineProperty(obj, prop, {
      configurable: true,
      enumerable: desc.enumerable,
      get() {
        return desc.get.call(this);
      },
      set(v) {
        try {
          if (typeof v === "string" && v.length >= 2 && v.length <= 160) {
            const parent = this.nodeType === 3 ? this.parentElement : this;
            const next = translateRaw(v, parent);
            if (next != null) v = next;
          }
        } catch {
        }
        return desc.set.call(this, v);
      }
    });
    return true;
  }
  patchAccessor(Node.prototype, "nodeValue");
  if (typeof CharacterData !== "undefined") {
    patchAccessor(CharacterData.prototype, "data");
  }
  const textDesc = Object.getOwnPropertyDescriptor(Node.prototype, "textContent");
  if (textDesc?.set && textDesc.configurable) {
    Object.defineProperty(Node.prototype, "textContent", {
      configurable: true,
      enumerable: textDesc.enumerable,
      get() {
        return textDesc.get.call(this);
      },
      set(v) {
        try {
          if (typeof v === "string" && this.nodeType === 1 && this.childElementCount === 0) {
            const next = translateRaw(v, this);
            if (next != null) v = next;
          }
        } catch {
        }
        return textDesc.set.call(this, v);
      }
    });
  }
  const EDITOR_WORDS = {
    edit: "\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C",
    exit: "\u0412\u044B\u0439\u0442\u0438",
    colors: "\u0426\u0432\u0435\u0442\u0430",
    hair: "\u0412\u043E\u043B\u043E\u0441\u044B",
    beard: "\u0411\u043E\u0440\u043E\u0434\u0430",
    shape: "\u0424\u043E\u0440\u043C\u0430",
    brows: "\u0411\u0440\u043E\u0432\u0438",
    eyes: "\u0413\u043B\u0430\u0437\u0430",
    nose: "\u041D\u043E\u0441",
    mouth: "\u0420\u043E\u0442",
    top: "\u0412\u0435\u0440\u0445",
    bottom: "\u041D\u0438\u0437",
    shoes: "\u041E\u0431\u0443\u0432\u044C",
    glasses: "\u041E\u0447\u043A\u0438",
    cap: "\u041A\u0435\u043F\u043A\u0430",
    age: "\u0412\u043E\u0437\u0440\u0430\u0441\u0442",
    makeup: "\u041C\u0430\u043A\u0438\u044F\u0436",
    paint: "\u041A\u0440\u0430\u0441\u043A\u0430",
    scar: "\u0428\u0440\u0430\u043C",
    spot: "\u041F\u044F\u0442\u043D\u043E",
    pose: "\u041F\u043E\u0437\u0430",
    custom: "\u0421\u0432\u043E\u0451"
  };
  const editorHost = (el) => el?.closest?.(EDITOR_SEL);
  function paintEditorTree(node) {
    if (!node) return;
    if (node.nodeType === 3) {
      const word = EDITOR_WORDS[normalizeKey2(node.nodeValue || "").toLowerCase()];
      if (word && editorHost(node.parentElement)) node.nodeValue = word;
      return;
    }
    if (node.nodeType !== 1) return;
    if (node.matches?.(EDITOR_SEL) || editorHost(node)) {
      for (const child of node.childNodes) paintEditorTree(child);
      return;
    }
    const nested = node.querySelectorAll?.(EDITOR_SEL);
    if (nested) for (const host2 of nested) paintEditorTree(host2);
  }
  const setAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function(name, value) {
    try {
      if (typeof value === "string" && /^(?:data-placeholder|placeholder|aria-placeholder|aria-label)$/i.test(name)) {
        const key = normalizeKey2(value);
        const thoughts = key.match(/^what are your thoughts on\s+(.+?)\??$/i);
        if (thoughts) {
          value = "\u0427\u0442\u043E \u0432\u044B \u0434\u0443\u043C\u0430\u0435\u0442\u0435 \u043E " + thoughts[1].trim() + "?";
        } else {
          const direct = map.get(key.toLowerCase()) || map.get(key);
          if (direct) value = direct;
        }
      }
    } catch {
    }
    return setAttribute.call(this, name, value);
  };
  const appendChild = Node.prototype.appendChild;
  Node.prototype.appendChild = function(child) {
    try {
      if (child?.nodeType === 3 && editorHost(this)) {
        const word = EDITOR_WORDS[normalizeKey2(child.nodeValue || "").toLowerCase()];
        if (word) child.nodeValue = word;
      }
    } catch {
    }
    const out = appendChild.call(this, child);
    return out;
  };
  const insertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function(child, ref) {
    try {
      if (child?.nodeType === 3 && editorHost(this)) {
        const word = EDITOR_WORDS[normalizeKey2(child.nodeValue || "").toLowerCase()];
        if (word) child.nodeValue = word;
      }
    } catch {
    }
    return insertBefore.call(this, child, ref);
  };
  const mo = new MutationObserver((list) => {
    for (const rec of list) {
      if (rec.type === "attributes") {
        if (editorHost(rec.target) || rec.target.matches?.(EDITOR_SEL)) paintEditorTree(rec.target);
        continue;
      }
      for (const node of rec.addedNodes) paintEditorTree(node);
    }
  });
  const shadowRoots = /* @__PURE__ */ new Set();
  const watchRoot = (root) => {
    if (!root || shadowRoots.has(root)) return;
    shadowRoots.add(root);
    try {
      mo.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    } catch {
    }
  };
  watchRoot(document.documentElement);
  const attachShadow = Element.prototype.attachShadow;
  Element.prototype.attachShadow = function(init) {
    const root = attachShadow.call(this, init);
    watchRoot(root);
    return root;
  };
  function paintHost(host2) {
    paintEditorTree(host2);
    const whole = normalizeKey2(host2.textContent || "").toLowerCase();
    const ru = EDITOR_WORDS[whole];
    if (ru) {
      const texts = [];
      const walk = (n) => {
        for (const c of n.childNodes) {
          if (c.nodeType === 3) texts.push(c);
          else if (c.nodeType === 1 && c.tagName !== "IMG" && c.tagName !== "SVG" && c.tagName !== "CANVAS") walk(c);
        }
      };
      walk(host2);
      if (texts.length) {
        const lead = (texts[0].nodeValue.match(/^\s*/) || [""])[0];
        texts[0].nodeValue = lead + ru;
        for (let i = 1; i < texts.length; i += 1) texts[i].nodeValue = "";
      }
    }
    let pending = false;
    const see = (n) => {
      for (const c of n.childNodes) {
        if (c.nodeType === 3 && EDITOR_WORDS[normalizeKey2(c.nodeValue || "").toLowerCase()]) pending = true;
        else if (c.nodeType === 1 && c.tagName !== "IMG" && c.tagName !== "SVG") see(c);
      }
    };
    see(host2);
    if (!pending) host2.setAttribute("data-panax-ru-on", "");
  }
  const paintRoot = (root) => {
    if (!root?.querySelectorAll) return;
    let hosts;
    try {
      hosts = root.querySelectorAll(EDITOR_SEL);
    } catch {
      return;
    }
    for (const host2 of hosts) paintHost(host2);
  };
  const paintFrame = () => {
    try {
      paintRoot(document);
      for (const root of shadowRoots) paintRoot(root);
    } catch {
    }
    requestAnimationFrame(paintFrame);
  };
  requestAnimationFrame(paintFrame);
  console.info("[PANAX RU] write-patch active (stubborn chrome)");
}
