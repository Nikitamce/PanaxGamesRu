import { bgRequest } from './request.js';

/** Currencies offered as conversion target in Settings */
export const CONVERT_CURRENCIES = [
  { code: 'RUB', symbol: '₽', name: 'Рубль (RUB)' },
  { code: 'USD', symbol: '$', name: 'Доллар (USD)' },
  { code: 'EUR', symbol: '€', name: 'Евро (EUR)' },
  { code: 'KZT', symbol: '₸', name: 'Тенге (KZT)' },
  { code: 'UAH', symbol: '₴', name: 'Гривна (UAH)' },
  { code: 'TRY', symbol: '₺', name: 'Лира (TRY)' },
];

export const CURRENCY_SYMBOLS = {
  RUB: '₽',
  USD: '$',
  EUR: '€',
  KZT: '₸',
  UAH: '₴',
  GBP: '£',
  TRY: '₺',
  CNY: '¥',
  PLN: 'zł',
  BRL: 'R$',
  JPY: '¥',
  KRW: '₩',
};

export const STEAM_REGIONS = [
  { code: 'KZ', name: 'Казахстан (KZ, ₸)' },
  { code: 'RU', name: 'Россия (RU, ₽)' },
  { code: 'US', name: 'США (US, $)' },
  { code: 'UA', name: 'Украина (UA, ₴)' },
  { code: 'TR', name: 'Турция (TR, $)' },
  { code: 'EU', name: 'Европа (EU, €)' },
  { code: 'GB', name: 'Великобритания (GB, £)' },
  { code: 'PL', name: 'Польша (PL, zł)' },
  { code: 'AR', name: 'Аргентина (AR, $)' },
  { code: 'BR', name: 'Бразилия (BR, R$)' },
  { code: 'JP', name: 'Япония (JP, ¥)' },
  { code: 'KR', name: 'Корея (KR, ₩)' },
  { code: 'CN', name: 'Китай (CN, ¥)' },
];

let cachedRates = null;
let lastFetch = 0;

export async function fetchExchangeRates() {
  const now = Date.now();
  if (cachedRates && (now - lastFetch < 6 * 3600 * 1000)) {
    return cachedRates;
  }

  // Primary: open.er-api.com
  try {
    const data = await bgRequest({
      url: 'https://open.er-api.com/v6/latest/USD',
    });
    if (data?.rates?.RUB) {
      cachedRates = data.rates;
      lastFetch = now;
      return cachedRates;
    }
  } catch (_) {}

  // Fallback: latest.currency-api.pages.dev
  try {
    const data = await bgRequest({
      url: 'https://latest.currency-api.pages.dev/v1/currencies/usd.json',
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
  } catch (_) {}

  // Safe offline fallback
  return {
    USD: 1,
    RUB: 95,
    KZT: 495,
    EUR: 0.92,
    UAH: 41,
    TRY: 34,
  };
}

/**
 * Converts an amount from one currency to target currency.
 * Returns formatted string like "~ 892 ₽" or null if not applicable / same currency.
 */
export async function convertCurrency(amount, fromCurrency, toCurrency = 'RUB') {
  if (!amount || amount <= 0) return null;
  const from = String(fromCurrency || '').toUpperCase();
  const to = String(toCurrency || '').toUpperCase();
  if (!from || !to || from === to) return null;

  const rates = await fetchExchangeRates();
  if (!rates) return null;

  const rateFrom = rates[from];
  const rateTo = rates[to];
  if (!rateFrom || !rateTo) return null;

  // Base is USD in rates: (amount / rateFrom) * rateTo
  const converted = (amount / rateFrom) * rateTo;
  const rounded = Math.round(converted);
  const symbol = CURRENCY_SYMBOLS[to] || to;

  return {
    amount: rounded,
    currency: to,
    symbol,
    formatted: `~ ${rounded.toLocaleString('ru-RU')} ${symbol}`,
  };
}

/** Legacy helper */
export async function convertToRub(amount, fromCurrency) {
  const res = await convertCurrency(amount, fromCurrency, 'RUB');
  return res ? res.amount : null;
}
