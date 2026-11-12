const focusMode = require('../services/focusMode');
const multiplayer = require('../realtime/multiplayer');

function requestIp(req) {
  const forwarded = req.headers && req.headers['x-forwarded-for'];
  const raw = forwarded ? String(forwarded).split(',')[0] : (req.ip || req.socket && req.socket.remoteAddress);
  return focusMode.normalizeIp(raw);
}

module.exports = {
  hello(req, res) {
    res.json({ message: req.t('msg.hello') });
  },

  focusStatus(req, res) {
    const clientId = focusMode.normalizeClientId(req.query && req.query.clientId);
    const fingerprint = focusMode.normalizeFingerprint(req.query && req.query.fingerprint);
    if (!clientId && !fingerprint) {
      return res.status(400).json({ ok: false, message: req.t('focus.invalidRequest') });
    }
    const current = focusMode.status(clientId, fingerprint);
    res.json({
      ok: true,
      now: Date.now(),
      focus: {
        active: current.active,
        durationMs: focusMode.DURATION_MS,
        record: current.record
      }
    });
  },

  focusStart(req, res) {
    const body = req.body || {};
    try {
      const result = focusMode.start({
        clientId: body.clientId,
        fingerprint: body.fingerprint,
        ip: requestIp(req),
        userAgent: req.headers && req.headers['user-agent'],
        lang: req.lang
      });
      const record = result.record;
      const sessions = multiplayer.applyFocusLock({
        clientId: record.clientId,
        fingerprint: record.fingerprint,
        until: record.expiresAt,
        recordId: record.id
      });
      res.status(result.created ? 201 : 200).json({
        ok: true,
        now: Date.now(),
        reused: !result.created,
        sessions,
        focus: {
          active: true,
          durationMs: focusMode.DURATION_MS,
          record: focusMode.publicRecord(record)
        },
        message: req.t('focus.started')
      });
    } catch (err) {
      const status = Number(err && err.status) || 500;
      const key = err && err.code === 'FOCUS_FINGERPRINT'
        ? 'focus.invalidFingerprint'
        : err && err.code === 'FOCUS_CLIENT_ID'
          ? 'focus.invalidRequest'
          : 'msg.serverError';
      res.status(status).json({ ok: false, message: req.t(key) });
    }
  }
};
