const axios = require("axios");

const CACHE_MS = 60 * 60 * 1000; // 1 hour
const cache = new Map();

const DEFAULT_BASE = process.env.PROCUREMENT_BASE_CURRENCY || "USD";

/**
 * How many `base` units equal 1 unit of `currency` (e.g. 1 EUR = 1.16 USD).
 */
async function getExchangeRate(currency, base = DEFAULT_BASE) {
  const from = String(currency || "USD").toUpperCase();
  const to = String(base || DEFAULT_BASE).toUpperCase();

  if (from === to) {
    return {
      currency: from,
      base: to,
      rate: 1,
      date: new Date().toISOString().slice(0, 10),
      source: "identity",
      label: `1 ${from} = 1 ${to}`,
    };
  }

  const cacheKey = `${from}:${to}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.fetchedAt < CACHE_MS) {
    return hit.data;
  }

  let result = await fetchFromOpenErApi(from, to);
  if (!result) {
    result = await fetchFromFrankfurter(from, to);
  }
  if (!result) {
    throw new Error(`No exchange rate available for ${from} → ${to}`);
  }

  cache.set(cacheKey, { fetchedAt: Date.now(), data: result });
  return result;
}

async function fetchFromOpenErApi(from, to) {
  try {
    const { data } = await axios.get(`https://open.er-api.com/v6/latest/${encodeURIComponent(from)}`, {
      timeout: 12000,
    });
    const rate = data?.rates?.[to];
    if (rate == null || !Number.isFinite(rate)) return null;
    const rounded = Math.round(Number(rate) * 1000000) / 1000000;
    const date = data.time_last_update_utc
      ? String(data.time_last_update_utc).slice(0, 10)
      : new Date().toISOString().slice(0, 10);
    return {
      currency: from,
      base: to,
      rate: rounded,
      date,
      source: "open.er-api",
      label: `1 ${from} = ${rounded.toFixed(4)} ${to}`,
    };
  } catch {
    return null;
  }
}

async function fetchFromFrankfurter(from, to) {
  try {
    const url = `https://api.frankfurter.app/latest?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    const { data } = await axios.get(url, { timeout: 12000 });
    const rate = data?.rates?.[to];
    if (rate == null || !Number.isFinite(rate)) return null;
    const rounded = Math.round(Number(rate) * 1000000) / 1000000;
    return {
      currency: from,
      base: to,
      rate: rounded,
      date: data.date || new Date().toISOString().slice(0, 10),
      source: "frankfurter",
      label: `1 ${from} = ${rounded.toFixed(4)} ${to}`,
    };
  } catch {
    return null;
  }
}

module.exports = {
  getExchangeRate,
  DEFAULT_BASE,
};
