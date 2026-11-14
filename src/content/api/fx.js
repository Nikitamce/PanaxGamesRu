import { bgRequest } from "./request.js";

var CURRENCY_SYMBOLS = {
  RUB: "\u20BD",
  USD: "$",
  EUR: "\u20AC",
  KZT: "\u20B8",
  UAH: "\u20B4",
  GBP: "\xA3",
  TRY: "\u20BA",
  CNY: "\xA5",
  PLN: "z\u0142",
  BRL: "R$",
  JPY: "\xA5",
  KRW: "\u20A9"
};
var cachedRates = null;
var lastFetch = 0;
async function fetchExchangeRates() {
  const now = Date.now();
  if (cachedRates && now - lastFetch < 6 * 3600 * 1e3) {
    return cachedRates;
  }
  try {
    const data = await bgRequest({
      url: "https://open.er-api.com/v6/latest/USD"
    });
    if (data?.rates?.RUB) {
      cachedRates = data.rates;
      lastFetch = now;
      return cachedRates;
    }
  } catch (_) {
  }
  try {
    const data = await bgRequest({
      url: "https://latest.currency-api.pages.dev/v1/currencies/usd.json"
    });
    if (data?.usd) {
      const upper = {};
      for (const [k, v] of Object.entries(data.usd)) {
        upper[k.toUpperCase()] = v;
      }
      cachedRates = upper;
      lastFetch = now;
      return cachedRates;
    }
  } catch (_) {
  }
  return {
    USD: 1,
    RUB: 95,
    KZT: 495,
    EUR: 0.92,
    UAH: 41,
    TRY: 34
  };
}
export async function convertCurrency(amount, fromCurrency, toCurrency = "RUB") {
  if (!amount || amount <= 0) return null;
  const from = String(fromCurrency || "").toUpperCase();
  const to = String(toCurrency || "").toUpperCase();
  if (!from || !to || from === to) return null;
  const rates = await fetchExchangeRates();
  if (!rates) return null;
  const rateFrom = rates[from];
  const rateTo = rates[to];
  if (!rateFrom || !rateTo) return null;
  const converted = amount / rateFrom * rateTo;
  const rounded = Math.round(converted);
  const symbol = CURRENCY_SYMBOLS[to] || to;
  return {
    amount: rounded,
    currency: to,
    symbol,
    formatted: `~ ${rounded.toLocaleString("ru-RU")} ${symbol}`
  };
}
