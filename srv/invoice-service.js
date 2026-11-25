const cds = require('@sap/cds');
const { lookupInDb, normalize, round } = require('./lib/db-translation');
const { translateWithHub } = require('./lib/hub-translation');
const { logMetric } = require('./lib/metrics');
const { performance } = require('perf_hooks');

const MAX_TEXT_LENGTH = 5000;

module.exports = cds.service.impl(function () {
  const clean = (req) => {
    const t = req.data.text;
    if (typeof t !== 'string' || !t.trim()) return req.reject(400, 'Text is required.');
    if (t.trim().length > MAX_TEXT_LENGTH) return req.reject(400, 'Text is too long.');
    return t.trim();
  };

  this.on('lookupDb', async (req) => {
    const text = clean(req);
    const r = await lookupInDb(text);
    await logMetric({ kind: 'DB', text, source: r.source, dbMs: r.ms, status: r.status, error: r.error });
    return r;
  });

  this.on('translateHub', async (req) => {
    const text = clean(req);
    const r = await translateWithHub(text);
    await logMetric({ kind: 'HUB', text, source: r.source, hubMs: r.ms, status: r.status, error: r.error });
    return r;
  });

  this.on('compare', async (req) => {
    const text = clean(req);
    const database = await lookupInDb(text);   // sequential, so they don't compete
    const hub = await translateWithHub(text);
    const diffMs = database.status === 'HIT' && hub.status === 'SUCCESS'
  ? round(hub.ms - database.ms) : null;
    const savedPercent = database.status === 'HIT' && hub.status === 'SUCCESS' && hub.ms > 0
      ? round((diffMs / hub.ms) * 100) : null;
    await logMetric({ kind: 'COMPARE', text, dbMs: database.ms, hubMs: hub.ms,
                      status: `${database.status}/${hub.status}` });
    return { input: text, database, hub, diffMs, savedPercent };
  });

  this.on('addTranslation', async (req) => {
    const { sourceText, targetText } = req.data;
    if (!sourceText?.trim() || !targetText?.trim()) return req.reject(400, 'Both texts are required.');
    const { Translations } = cds.entities('com.invoicetranslation');
    const sourceKey = normalize(sourceText);
    if (await SELECT.one.from(Translations).where({ sourceKey })) {
      return req.reject(409, 'This Spanish text already exists.');
    }
    await INSERT.into(Translations).entries({
      sourceKey, sourceText: sourceText.trim(), targetText: targetText.trim(), origin: 'MANUAL',
    });
    return 'Added';
  });
    this.on('translateAndSave', async (req) => {
    const text = clean(req);
    const database = await lookupInDb(text);
    if (database.status === 'HIT') {
      await logMetric({ kind: 'STORE', text, dbMs: database.ms, status: 'HIT' });
      return { input: text, database, hub: null, saved: false, saveMs: null };
    }
    const hub = await translateWithHub(text);
    let saved = false;
    let saveMs = null;
    if (hub.status === 'SUCCESS') {
      const { Translations } = cds.entities('com.invoicetranslation');
      const t0 = performance.now();
      try {
        await INSERT.into(Translations).entries({
          sourceKey: normalize(text), sourceText: text, targetText: hub.text, origin: 'HUB',
        });
        saved = true;
      } catch (e) { /* a parallel request already saved it */ }
      saveMs = round(performance.now() - t0);
    }
    await logMetric({ kind: 'STORE', text, dbMs: database.ms, hubMs: hub.ms,
                      status: `${database.status}/${hub.status}` });
    return { input: text, database, hub, saved, saveMs };
  });
  
});
