const path = require('node:path');
const express = require('express');
const userController = require('../controllers/userController');
const gameController = require('../controllers/gameController');
const bulletMarkController = require('../controllers/bulletMarkController');
const corpseFieldController = require('../controllers/corpseFieldController');
const groupQr = require('../services/groupQr');
const goldSupply = require('../services/goldSupply');
const multer = require('multer');
const portAds = require('../services/portContainerAds');
const adUpload = multer({ limits: { fileSize: portAds.MAX_IMAGE_BYTES + 1, files: 1, fields: 3,
  fieldSize: 512, parts: 5 } }).single('image');
const locales = {
  'zh-CN': require('../locales/zh-CN.json'),
  'en-US': require('../locales/en-US.json')
};

const router = express.Router();

router.get('/hello', userController.hello);
router.get('/health', gameController.health);
router.get('/game/meta', gameController.meta);
router.get('/game/play-schedule', gameController.playSchedule);
router.get('/game/leaderboard', gameController.leaderboard);
router.get('/game/gold/pickups', gameController.goldPickups);
router.get('/game/gold/activity', gameController.goldActivity);
router.get('/game/gold/supply', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(goldSupply.publicStatus());
});
router.get('/game/chat/history', gameController.chatHistory);
router.get('/game/bullet-marks', bulletMarkController.list);
router.get('/game/corpse-field', corpseFieldController.list);
router.get('/game/container-ads', (req, res) => {
  const result = portAds.list(req.query.since);
  return result ? res.json(result) : res.status(204).end();
});
router.get('/game/container-ads/:id/:version.jpg', (req, res) => {
  const bytes = portAds.image(req.params.id, req.params.version);
  if (!bytes) return res.status(404).end();
  res.removeHeader('Pragma');
  res.removeHeader('Expires');
  return res.set('Cache-Control', 'private, max-age=60').type('image/jpeg').send(bytes);
});
router.post('/game/container-ads', (req, res) => {
  const token = req.get('X-Container-Ad-Ticket');
  try { portAds.ticketFor(token); }
  catch { return res.status(403).json({ error: 'expired' }); }
  adUpload(req, res, error => {
    if (error) return res.status(400).json({ error: 'image' });
    try {
      return res.json({ ad: portAds.publish(token, req.body.mode, req.body.text, req.body.days, req.file?.buffer) });
    } catch (failure) {
      const code = failure.message;
      if (['text', 'image', 'days', 'funds', 'occupied', 'expired'].includes(code)) {
        return res.status(400).json({ error: code });
      }
      console.error('[port-container-ads] purchase failed:', code);
      return res.status(503).json({ error: 'storage' });
    }
  });
});
router.get('/focus/status', userController.focusStatus);
router.post('/focus/start', userController.focusStart);

// 玩家群聊二维码：图片由后台上传，未上传时回退到内置 SVG。
router.get('/community/qr', (req, res) => {
  res.json({ ok: true, qr: groupQr.info() });
});
router.get('/community/qr/image', (req, res) => {
  const current = groupQr.image();
  if (!current) {
    res.type('image/svg+xml');
    return res.sendFile(path.join(__dirname, '..', 'public', groupQr.DEFAULT_IMAGE.replace(/^\//, '')));
  }
  res.set('Content-Type', current.mimeType);
  res.set('Content-Disposition', 'inline; filename="' + current.fileName.replace(/"/g, '') + '"');
  return res.send(current.buffer);
});

router.post('/lang', (req, res) => {
  const lang = req.body && req.body.lang === 'en-US' ? 'en-US' : 'zh-CN';
  res.cookie('lang', lang, {
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 365 * 24 * 3600 * 1000
  });
  const redirect = req.body && typeof req.body.redirect === 'string' ? req.body.redirect : '';
  const formSubmission = req.is('application/x-www-form-urlencoded') || req.accepts(['json', 'html']) === 'html';
  if (formSubmission && redirect.startsWith('/') && !redirect.startsWith('//')) {
    return res.redirect(303, redirect);
  }
  res.json({ ok: true, message: locales[lang].msg.langSet, lang });
});

module.exports = router;
