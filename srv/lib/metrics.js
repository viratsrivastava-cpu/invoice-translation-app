const cds = require('@sap/cds');
const crypto = require('crypto');

async function logMetric({ kind, text = '', source, dbMs, hubMs, status, error }) {
  try {
    const { TranslationLogs } = cds.entities('com.invoicetranslation');
    await INSERT.into(TranslationLogs).entries({
      requestId: cds.context?.id || crypto.randomUUID(),
      kind, source, dbMs, hubMs, status,
      error: error ? String(error).slice(0, 200) : null,
      inputRef: `${crypto.createHash('sha256').update(text).digest('hex').slice(0, 12)}:${text.length}`,
    });
  } catch { /* logging must never break a request */ }
}

module.exports = { logMetric };
