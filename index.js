require('dotenv').config();
const path = require('path');
const http = require('http');
const express = require('express');
const ejs = require('ejs');
const compression = require('compression');
const apiRouter = require('./routes/api');
const raceRouter = require('./routes/race');
const race = require('./services/race');
const raceLive = require('./realtime/race');
const adminRouter = require('./routes/admin');
const chatHistory = require('./services/chatHistory');
const focusMode = require('./services/focusMode');
const bulletMarks = require('./services/bulletMarks');
const persistenceQueue = require('./services/persistenceQueue');
const groupQr = require('./services/groupQr');
const houndTuning = require('./services/houndTuning');
const roadSigns = require('./services/roadSigns');
const { attachMultiplayer, shutdownMultiplayer } = require('./realtime/multiplayer');
const { version: RELEASE_VERSION } = require('./package.json');

const app = express();
const PORT = process.env.PORT || 3000;
// 托管平台的反向代理通常不在应用所在容器的回环命名空间内。
// 默认监听所有网卡；预览网关会显式注入 HOST=127.0.0.1，仍按平台值启动。
const HOST = process.env.HOST || '0.0.0.0';
const ASSET_VERSION = '20261121-impact-ammo-v' + RELEASE_VERSION;

app.set('view engine', 'ejs');
app.engine('html', ejs.renderFile);
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', 1);

// 源码安全默认：只允许同源页面 iframe 嵌入。
// 突灵AI自己的“临时托管预览”不会依赖这段源码放行，
// 平台会在 source.zip 生成之后，仅对临时 Node 进程注入运行时兼容层。
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  const csp = "default-src 'self';script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval';style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;img-src 'self' data: blob:;connect-src 'self' ws: wss: blob:;font-src 'self' data: https://fonts.gstatic.com;media-src 'self' data: blob:;worker-src 'self' blob:;frame-ancestors 'self';base-uri 'self';form-action 'self';object-src 'none';script-src-attr 'none'";
  // On plain-HTTP LAN deployments this directive upgrades CSS/JS to HTTPS,
  // which makes every local resource fail. Only enable it for real HTTPS.
  res.setHeader('Content-Security-Policy', req.secure ? csp + ';upgrade-insecure-requests' : csp);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(compression({ threshold: 1024 }));

const locales = {
  'zh-CN': require('./locales/zh-CN.json'),
  'en-US': require('./locales/en-US.json')
};

function parseCookies(header) {
  const cookies = {};
  if (!header) return cookies;
  String(header).split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx > 0) {
      const rawKey = pair.slice(0, idx).trim();
      const rawValue = pair.slice(idx + 1).trim();
      try {
        cookies[decodeURIComponent(rawKey)] = decodeURIComponent(rawValue);
      } catch (err) {
        cookies[rawKey] = rawValue;
      }
    }
  });
  return cookies;
}

function parseAcceptLanguage(header) {
  const value = String(header || '').split(',')[0] || '';
  return value.trim().toLowerCase();
}

// i18n 中间件：解析 lang cookie 与 Accept-Language，提供 req.lang / req.t(key)
app.use((req, res, next) => {
  const cookies = parseCookies(req.headers.cookie);
  req.cookies = cookies;
  const accepted = parseAcceptLanguage(req.headers['accept-language']);
  let lang = cookies.lang;
  if (lang !== 'zh-CN' && lang !== 'en-US') {
    lang = accepted === 'en-us' || accepted.startsWith('en') ? 'en-US' : 'zh-CN';
  }
  req.lang = lang;
  const dictionary = locales[lang] || locales['zh-CN'];
  req.t = (key) => {
    return String(key || '').split('.').reduce((acc, part) => (acc == null ? acc : acc[part]), dictionary) || String(key || '');
  };
  res.locals.lang = lang;
  res.locals.t = req.t;
  res.locals.messages = dictionary;
  next();
});

app.use('/admin', adminRouter);
app.use('/api/race', raceRouter);
app.get('/race-ads',(req,res)=>res.redirect('/'));
app.get('/race/models/:kind', (req,res,next) => {
  if (!['hound','drone'].includes(req.params.kind)) return next();
  res.set('Content-Type','application/json');
  res.set('Content-Encoding','gzip');
  res.sendFile(path.join(__dirname,'public','models','race-'+req.params.kind+'.json.gz'), { maxAge:'5m' });
});
function renderRace(req,res,plazaVisit) {
  res.render('race.html',{
    lang:req.lang,
    messages:locales[req.lang]||locales['zh-CN'],
    assetVersion:ASSET_VERSION,
    plazaVisit
  });
}
function renderRaceEntry(req, res, plazaVisit, sceneOnly) {
  if (!plazaVisit) {
    const owner = roadSigns.ownerFromRequest({ headers: { ...req.headers, origin: 'http://' + req.headers.host } });
    const ticket = typeof req.query.ticket === 'string' ? req.query.ticket : '';
    if (!owner || !race.canLoad(owner, ticket)) {
      if (sceneOnly) return res.sendStatus(403);
      return res.redirect('/');
    }
  }
  if (sceneOnly) {
    roadSigns.issueCookie(req, res);
    res.setHeader('Cache-Control', 'no-store');
    return renderRace(req, res, plazaVisit);
  }
  return renderGame(req, res, '', plazaVisit ? 'plaza' : 'challenge');
}
app.get('/race/plaza', (req, res) => renderRaceEntry(req, res, true, false));
app.get(['/race','/race/index.html'], (req, res) => renderRaceEntry(req, res, false, false));
app.get('/race/scene/:mode', (req, res, next) => {
  if (!['plaza', 'challenge'].includes(req.params.mode)) return next();
  return renderRaceEntry(req, res, req.params.mode === 'plaza', true);
});
app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'), {
  etag: true,
  maxAge: 0,
  setHeaders(res, filePath) {
    // JS/CSS are versioned in the page URL, but an old HTML page can keep an
    // old ?v= URL. Revalidation here makes a normal reload pick up the new
    // file even before the Node process is restarted; images/audio keep the
    // browser's normal conditional-cache behaviour.
    if (/\.(?:js|css)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    }
  }
}));

app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

app.use('/api', apiRouter);

// Small deployment diagnostic: lets you verify which asset version the
// running Node process is actually serving, without opening the game.
app.get('/version', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.type('text/plain').send(ASSET_VERSION);
});

const raceDestinations = new Set(['port','qingyun','bayhaven','mothlight','dustfall','lunar']);
app.get(['/','/race/transfer/:map'], (req, res, next) => {
  const destination = req.params.map || req.query.raceExit;
  const raceTransfer = raceDestinations.has(destination) ? destination : '';
  if (req.params.map && !raceTransfer) return next();
  return renderGame(req, res, raceTransfer);
});
function renderGame(req, res, raceTransfer, raceStart = '') {
  roadSigns.issueCookie(req, res);
  const queryLang = req.query && req.query.lang;
  const lang = queryLang === 'en-US' || queryLang === 'zh-CN' ? queryLang : req.lang;
  if (lang !== req.lang) {
    res.cookie('lang', lang, { httpOnly: false, sameSite: 'lax', maxAge: 365 * 24 * 3600 * 1000 });
  }
  res.setHeader('Cache-Control', 'no-store');
  res.render('index', {
    t: (key) => {
      const dict = locales[lang] || locales['zh-CN'];
      return String(key || '').split('.').reduce((acc, part) => (acc == null ? acc : acc[part]), dict) || String(key || '');
    },
    lang,
    messages: locales[lang] || locales['zh-CN'],
    groupQr: groupQr.info(),
    raceTransfer,
    raceStart,
    preloadQingyun: raceTransfer === 'qingyun',
    houndFlipChance: houndTuning.read().chance,
    assetVersion: ASSET_VERSION
  });
}

app.use('/api', (req, res) => {
  res.status(404).json({ ok: false, message: req.t('msg.apiNotFound') });
});

app.use((req, res) => {
  res.status(404).send(req.t('msg.pageNotFound'));
});

app.use((err, req, res, next) => {
  console.error('[server]', err && err.stack ? err.stack : err);
  if (res.headersSent) return next(err);
  const t = typeof req.t === 'function' ? req.t : (key) => key;
  const status = Number(err && (err.status || err.statusCode)) || 500;
  const message = status >= 500 ? t('msg.serverError') : t('msg.badRequest');
  if (req.path.startsWith('/api/')) {
    return res.status(status).json({ ok: false, message: message });
  }
  res.status(status).send(message);
});

const server = http.createServer(app);
attachMultiplayer(server);
raceLive.attach(server);

server.on('error', (err) => {
  console.error('[server] listen failed at ' + HOST + ':' + PORT + ': ' + (err && err.stack ? err.stack : err));
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  const address = server.address();
  const boundHost = address && typeof address === 'object' ? address.address : HOST;
  const boundPort = address && typeof address === 'object' ? address.port : PORT;
  console.log('Server running at http://' + boundHost + ':' + boundPort);
  console.log('Multiplayer WebSocket ready at ws://' + boundHost + ':' + boundPort + '/ws');
  const chatStorage = chatHistory.status();
  console.log('[chat] history file ' + chatStorage.file +
    ' · dataDir=' + chatStorage.dataDir +
    ' (' + chatStorage.dataSource + ')' +
    ' · records=' + chatStorage.records +
    ' · pending=' + chatStorage.pending +
    ' · writable=' + chatStorage.writable);
  const focusStorage = focusMode.persistence();
  console.log('[focus] records file data/' + focusMode.FILE +
    ' · dataDir=' + focusStorage.dataDir +
    ' (' + focusStorage.dataSource + ')' +
    ' · pending=' + focusStorage.pending +
    ' · writable=' + focusStorage.writable);
  const bulletMarkStorage = bulletMarks.status();
  console.log('[bullet-marks] history file data/' + bulletMarks.FILE +
    ' · dataDir=' + bulletMarkStorage.dataDir +
    ' (' + bulletMarkStorage.dataSource + ')' +
    ' · records=' + bulletMarkStorage.records +
    ' · pending=' + bulletMarkStorage.pending +
    ' · writable=' + bulletMarkStorage.writable);
});

let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  raceLive.close();
  console.log('[server] received ' + signal + ', shutting down');
  try {
    shutdownMultiplayer();
  } catch (err) {
    console.error('[server] shutdown persist failed', err && err.message);
  }
  chatHistory.flush();
  focusMode.flush();
  bulletMarks.flush();
  groupQr.flush();
  persistenceQueue.flush();
  persistenceQueue.shutdown();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1500).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
