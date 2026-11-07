import { bgRequest } from './request.js';

let cachedRates = null;
let lastFetch = 0;

export async function fetchExchangeRates() {
  const now = Date.now();
  if (cachedRates && (now - lastFetch < 12 * 3600 * 1000)) {
    return cachedRates;
  }

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

  // Fallback approx rates
  return {
    USD: 1,
    RUB: 95,
    KZT: 495,
    EUR: 0.92,
  };
}

export async function convertToRub(amount, fromCurrency) {
  if (!amount || amount <= 0) return null;
  const curr = String(fromCurrency || '').toUpperCase();
  if (curr === 'RUB') return Math.round(amount);

  const rates = await fetchExchangeRates();
  if (!rates) return null;

  const rateFrom = rates[curr];
  const rateRub = rates.RUB;
  if (!rateFrom || !rateRub) return null;

  // (amount / rateFrom) * rateRub
  const inRub = (amount / rateFrom) * rateRub;
  return Math.round(inRub);
}

