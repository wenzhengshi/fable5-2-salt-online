const path = require('node:path');
const express = require('express');
const userController = require('../controllers/userController');
const gameController = require('../controllers/gameController');
const groupQr = require('../services/groupQr');
const locales = {
  'zh-CN': require('../locales/zh-CN.json'),
  'en-US': require('../locales/en-US.json')
};

const router = express.Router();

router.get('/hello', userController.hello);
router.get('/health', gameController.health);
router.get('/game/meta', gameController.meta);
router.get('/game/leaderboard', gameController.leaderboard);
router.get('/game/gold/pickups', gameController.goldPickups);
router.get('/game/gold/activity', gameController.goldActivity);
router.get('/game/chat/history', gameController.chatHistory);
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
