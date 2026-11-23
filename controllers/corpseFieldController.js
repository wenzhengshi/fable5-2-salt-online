'use strict';

const corpseField = require('../services/corpseField');

module.exports = {
  list(req, res) {
    res.set('Cache-Control', 'no-store');
    const query = req.query || {};
    if (query.sync === '1') {
      if (query.history === '1') {
        return res.json({
          ok: true,
          lang: req.lang,
          ...corpseField.historyPage({
            limit: query.limit,
            before: query.before,
            base: query.base
          })
        });
      }
      const update = corpseField.sync(query.since, { paged: query.paged === '1' });
      if (!update) return res.status(204).end();
      return res.json({ ok: true, ...update });
    }
    res.json({
      ok: true,
      lang: req.lang,
      ...corpseField.snapshot({ limit: query.limit })
    });
  }
};
