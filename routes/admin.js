'use strict';

const { randomBytes } = require('node:crypto');
const express = require('express');
const credentials = require('../services/adminCredentials');
const { createBackup } = require('../services/serverBackup');
const router = express.Router();

const cookie = 'salt_backup_admin';
const sessionLifetime = 60 * 60 * 1000;
const windowMs = 60 * 1000;
const sessions = new Map();
let failedAttempts = 0;
let retryAt = 0;
let backingUp = false;
let changingPassword = false;
let loginsInFlight = 0;

function page(res, status, view, session, message = '') {
  return res.status(status).render('admin', { view, csrf: session?.csrf || '', firstLogin: !!session?.firstLogin, message });
}

router.use((req, res, next) => {
  res.set({
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'none'; style-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"
  });
  const now = Date.now();
  for (const [token, session] of sessions) if (session.until <= now) sessions.delete(token);
  req.backupSession = sessions.get(req.cookies[cookie]);
  next();
});
router.use(express.urlencoded({ extended: false, limit: '4kb', parameterLimit: 4 }));

function sessionView(session) {
  return session ? (session.firstLogin ? 'password' : 'backup') : 'login';
}

router.get('/', (req, res) => page(res, 200, sessionView(req.backupSession), req.backupSession));
router.get('/password', (req, res) => {
  if (!req.backupSession) return res.redirect(303, '/admin');
  return page(res, 200, 'password', req.backupSession);
});

router.post('/login', async (req, res, next) => {
  const now = Date.now();
  if (now >= retryAt) {
    retryAt = now + windowMs;
    failedAttempts = 0;
  }
  if (failedAttempts >= 20 || loginsInFlight >= 4 || changingPassword) {
    res.set('Retry-After', String(Math.max(1, Math.ceil((retryAt - now) / 1000))));
    return page(res, 429, 'login', null, '暂时无法登录，请稍后再试。');
  }
  loginsInFlight += 1;
  try {
    const record = await credentials.read();
    if (req.body?.username !== credentials.username || !await credentials.matches(req.body?.password, record)) {
      failedAttempts += 1;
      return page(res, 401, 'login', null, '账号或密码不正确。');
    }
    const latest = await credentials.read();
    if (changingPassword || latest?.hash !== record?.hash) return page(res, 409, 'login', null, '密码刚刚修改，请重新登录。');
    sessions.delete(req.cookies[cookie]);
    if (sessions.size >= 32) sessions.delete(sessions.keys().next().value);
    const token = randomBytes(32).toString('hex');
    sessions.set(token, { csrf: randomBytes(32).toString('hex'), until: now + sessionLifetime, firstLogin: !record });
    res.cookie(cookie, token, { path: '/admin', httpOnly: true, sameSite: 'strict', secure: req.secure, maxAge: sessionLifetime });
    return res.redirect(303, '/admin');
  } catch (error) {
    next(error);
  } finally {
    loginsInFlight -= 1;
  }
});

function requireSession(req, res, next) {
  const session = req.backupSession;
  if (!session) return res.redirect(303, '/admin');
  if (req.body?.csrf !== session.csrf) return page(res, 403, sessionView(session), session, '请求已失效，请刷新后重试。');
  next();
}

router.post('/logout', requireSession, (req, res) => {
  sessions.delete(req.cookies[cookie]);
  res.clearCookie(cookie, { path: '/admin', httpOnly: true, sameSite: 'strict', secure: req.secure });
  res.redirect(303, '/admin');
});

router.post('/password', requireSession, async (req, res, next) => {
  const session = req.backupSession;
  const { current, password, confirm } = req.body;
  if (!credentials.validLength(password) || password === credentials.defaultPassword || password === current) {
    return page(res, 400, 'password', session, '请输入至少 12 个字符的新密码，且与当前密码不同。');
  }
  if (password !== confirm) return page(res, 400, 'password', session, '两次输入的新密码不一致。');
  if (changingPassword) return page(res, 409, 'password', session, '正在修改密码，请稍后再试。');
  changingPassword = true;
  try {
    const record = await credentials.read();
    if (!await credentials.matches(current, record)) return page(res, 401, 'password', session, '当前密码不正确。');
    await credentials.save(password);
    sessions.clear();
    failedAttempts = 0;
    res.clearCookie(cookie, { path: '/admin', httpOnly: true, sameSite: 'strict', secure: req.secure });
    return page(res, 200, 'login', null, '密码已更新，请用新密码登录。');
  } catch (error) {
    next(error);
  } finally {
    changingPassword = false;
  }
});

router.get('/signs', async (req, res, next) => {
  const session = req.backupSession;
  if (!session) return res.redirect(303, '/admin');
  if (session.firstLogin) return res.redirect(303, '/admin/password');
  try {
    const { listRoadSignsForReview } = require('../realtime/multiplayer');
    const result = await listRoadSignsForReview(req.query.page);
    const mapNames = { qingyun: '青云宗',
      bayhaven: req.t('expedition.maps.bayhaven'), dustfall: req.t('expedition.maps.dustfall'),
      mothlight: req.t('expedition.maps.mothlight') };
    return res.render('admin', { view: 'signs', csrf: session.csrf, result, mapNames,
      message: req.query.flagged === '1' ? '已标记违规，牌面已替换为「该牌子违规」。' : '' });
  } catch (error) {
    next(error);
  }
});

router.post('/signs/:id/flag', requireSession, async (req, res, next) => {
  if (req.backupSession.firstLogin) return res.redirect(303, '/admin/password');
  try {
    const { flagRoadSign } = require('../realtime/multiplayer');
    const flagged = await flagRoadSign(req.params.id);
    const query = new URLSearchParams({ page: String(Math.max(1, Math.trunc(Number(req.body.page) || 1))) });
    if (flagged) query.set('flagged', '1');
    return res.redirect(303, '/admin/signs?' + query.toString());
  } catch (error) {
    next(error);
  }
});

router.post('/backup', requireSession, async (req, res) => {
  if (req.backupSession.firstLogin) return res.redirect(303, '/admin/password');
  if (backingUp) return page(res, 409, 'backup', req.backupSession, '有一份备份正在生成或下载，请稍后再试。');
  backingUp = true;
  const controller = new AbortController();
  res.once('close', () => controller.abort());
  let backup;
  try {
    const { flushForBackup } = require('../realtime/multiplayer');
    if (!await flushForBackup()) throw new Error('Unable to flush persistent game data');
    controller.signal.throwIfAborted();
    backup = await createBackup(controller.signal);
    controller.signal.throwIfAborted();
    await new Promise((resolve, reject) => {
      res.download(backup.file, backup.name, error => error ? reject(error) : resolve());
    });
  } catch (error) {
    if (!controller.signal.aborted) {
      console.error('[backup]', error.message);
      if (!res.headersSent) {
        res.removeHeader('Content-Disposition');
        page(res, 500, 'backup', req.backupSession, '备份失败。请检查服务器存储和日志后重试。');
      } else res.destroy(error);
    }
  } finally {
    backingUp = false;
    if (backup) await backup.cleanup().catch(error => console.error('[backup] cleanup:', error.message));
  }
});

module.exports = router;
