'use strict';

const bulletMarks = require('../services/bulletMarks');

module.exports = {
  list(req, res) {
    res.json({
      ok: true,
      lang: req.lang,
      ...bulletMarks.snapshot({ limit: req.query && req.query.limit })
    });
  }
};
