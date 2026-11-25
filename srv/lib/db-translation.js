const cds = require('@sap/cds');
const { performance } = require('perf_hooks');

const round = (n) => Math.round(n * 100) / 100;
const normalize = (t) => String(t).trim().replace(/\s+/g, ' ').toLowerCase();

async function lookupInDb(text) {
  const { Translations } = cds.entities('com.invoicetranslation');
  const t0 = performance.now();
  try {
    const row = await SELECT.one.from(Translations).where({ sourceKey: normalize(text) });
    const ms = round(performance.now() - t0);
    return row
      ? { text: row.targetText, source: 'DATABASE', status: 'HIT', ms }
      : { text: null, source: 'DATABASE', status: 'MISS', ms };
  } catch (e) {
    return { text: null, source: 'DATABASE', status: 'FAILURE', ms: round(performance.now() - t0), error: e.message };
  }
}

async function lookupMany(keys) {
  const { Translations } = cds.entities('com.invoicetranslation');
  const t0 = performance.now();
  const rows = keys.length ? await SELECT.from(Translations).where({ sourceKey: { in: keys } }) : [];
  return { map: new Map(rows.map((r) => [r.sourceKey, r.targetText])), ms: round(performance.now() - t0) };
}

module.exports = { lookupInDb, lookupMany, normalize, round };
