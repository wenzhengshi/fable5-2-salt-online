const express = require('express');
const userController = require('../controllers/userController');
const gameController = require('../controllers/gameController');
const locales = {
  'zh-CN': require('../locales/zh-CN.json'),
  'en-US': require('../locales/en-US.json')
};

const router = express.Router();

router.get('/hello', userController.hello);
router.get('/health', gameController.health);
router.get('/game/meta', gameController.meta);
router.get('/game/leaderboard', gameController.leaderboard);
router.get('/game/netcode', gameController.netcode);
router.get('/game/anticheat', gameController.anticheat);
router.get('/game/world', gameController.worldInfo);
router.get('/game/chat/history', gameController.chatHistory);
router.get('/focus/status', userController.focusStatus);
router.post('/focus/start', userController.focusStart);

router.post('/lang', (req, res) => {
  const lang = req.body && req.body.lang === 'en-US' ? 'en-US' : 'zh-CN';
  res.cookie('lang', lang, {
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 365 * 24 * 3600 * 1000
  });
  res.json({ ok: true, message: locales[lang].msg.langSet, lang });
});

module.exports = router;
