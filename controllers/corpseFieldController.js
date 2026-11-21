'use strict';

const corpseField = require('../services/corpseField');

module.exports = {
  list(req, res) {
    res.set('Cache-Control', 'no-store');
    if (req.query?.sync === '1') {
      const update = corpseField.sync(req.query.since);
      if (!update) return res.status(204).end();
      return res.json({ ok: true, ...update });
    }
    res.json({
      ok: true,
      lang: req.lang,
      ...corpseField.snapshot({ limit: req.query && req.query.limit })
    });
  }
};
