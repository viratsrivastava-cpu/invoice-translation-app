const { performance } = require('perf_hooks');
const { round } = require('./db-translation');

async function translateWithHub(text) {
  const t0 = performance.now();
  const base = { source: 'SAP_TRANSLATION_HUB' };
  try {
    if (!process.env.TRANSLATION_API_URL || !process.env.TRANSLATION_API_KEY) {
      return { ...base, text: null, status: 'FAILURE', ms: 0, error: 'API URL or key not configured' };
    }
    const url = new URL(process.env.TRANSLATION_API_URL);
    url.searchParams.set('text', text);
    const res = await fetch(url, {
      headers: { 'x-api-key': process.env.TRANSLATION_API_KEY },
      signal: AbortSignal.timeout(10000),
    });
    const ms = round(performance.now() - t0);
    if (!res.ok) return { ...base, text: null, status: 'FAILURE', ms, error: `HTTP ${res.status}` };
    const json = await res.json();
    // TEMPORARY: the deployed API returns '+' instead of spaces. Remove once it is fixed there.
    const clean = typeof json.value === 'string' ? json.value.replace(/\+/g, ' ') : null;
    return { ...base, text: clean, status: clean ? 'SUCCESS' : 'FAILURE', ms };
  } catch (e) {
    return { ...base, text: null, status: 'FAILURE', ms: round(performance.now() - t0), error: e.message };
  }
}

module.exports = { translateWithHub };
