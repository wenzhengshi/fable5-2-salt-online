#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const failures = [];
const warnings = [];

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

function validateJson(relative) {
  try {
    return JSON.parse(read(relative));
  } catch (err) {
    fail(relative + ' 不是有效 JSON: ' + err.message);
    return null;
  }
}

const required = [
  'package.json',
  '.env',
  'index.js',
  'API.md',
  'routes/api.js',
  'controllers/userController.js',
  'views/index.ejs',
  'public/css/style.css',
  'config/storage.js',
  'locales/zh-CN.json',
  'locales/en-US.json',
  'public/js/game.bundle.js',
  'public/js/boot-gate.js',
  'public/js/audio-tap.js',
  'public/js/replay.js',
  'public/js/multiplayer.js',
  'realtime/multiplayer.js'
];

for (const relative of required) {
  if (!fs.existsSync(path.join(root, relative))) fail('缺少必需文件: ' + relative);
}

const pkg = validateJson('package.json');
const lock = validateJson('package-lock.json');
const zh = validateJson('locales/zh-CN.json');
const en = validateJson('locales/en-US.json');

if (pkg) {
  if (pkg.type === 'module') fail('package.json 禁止设置 type=module');
  if (pkg.main !== 'index.js') fail('package.json main 必须为 index.js');
  if (!pkg.scripts || pkg.scripts.start !== 'node index.js') {
    fail('npm start 必须等价 node index.js');
  }
  if (!pkg.engines || !/>=?18/.test(String(pkg.engines.node || ''))) {
    fail('engines.node 必须声明 Node.js 18+');
  }

  const allowed = new Set([
    'express', 'ejs', 'dotenv', 'cors', 'helmet', 'compression', 'morgan',
    'ws', 'socket.io', 'jsonwebtoken', 'bcryptjs', 'express-rate-limit',
    'validator', 'sanitize-html', 'multer', 'mime-types', 'archiver',
    'adm-zip', 'axios', 'dayjs', 'lodash', 'uuid', 'write-file-atomic',
    'proper-lockfile', 'sharp', 'qrcode', 'nodemailer', 'cheerio', 'pdfkit',
    'exceljs'
  ]);
  for (const dependency of Object.keys(pkg.dependencies || {})) {
    if (!allowed.has(dependency)) fail('服务端依赖不在白名单: ' + dependency);
  }
}

if (pkg && lock && lock.packages && lock.packages['']) {
  if (lock.version !== pkg.version || lock.packages[''].version !== pkg.version) {
    fail('package-lock.json 版本必须与 package.json 一致');
  }
}

const indexSource = fs.existsSync(path.join(root, 'index.js')) ? read('index.js') : '';
if (!/process\.env\.PORT/.test(indexSource) || !/process\.env\.HOST/.test(indexSource)) {
  fail('index.js 必须从 process.env.PORT / process.env.HOST 读取监听地址');
}
if (!/server\.listen\(PORT,\s*HOST/.test(indexSource)) {
  fail('index.js 必须使用 PORT / HOST 启动 HTTP 服务');
}

for (const [name, dictionary] of [['zh-CN', zh], ['en-US', en]]) {
  if (!dictionary) continue;
  for (const section of ['meta', 'nav', 'ui', 'msg']) {
    if (!dictionary[section] || typeof dictionary[section] !== 'object') {
      fail('locales/' + name + '.json 缺少 i18n 分区: ' + section);
    }
  }
}

if (pkg) {
  const version = String(pkg.version || '');
  const api = fs.existsSync(path.join(root, 'API.md')) ? read('API.md') : '';
  const changelog = fs.existsSync(path.join(root, 'CHANGELOG.md')) ? read('CHANGELOG.md') : '';
  if (version && !api.includes('`' + version + '`')) fail('API.md 未记录当前版本 ' + version);
  if (version && !changelog.includes('v' + version)) fail('CHANGELOG.md 未记录 v' + version);
  if (!/^## WebSocket `\/ws`/m.test(api)) fail('API.md 缺少 WebSocket 章节');
}

const dataDir = path.join(root, 'data');
if (!fs.existsSync(dataDir)) {
  fail('缺少 data/ 目录');
} else {
  const unexpected = fs.readdirSync(dataDir).filter((name) => name !== '.gitkeep');
  if (unexpected.length) fail('data/ 只能保留 .gitkeep，发现运行数据: ' + unexpected.join(', '));
  const mode = fs.statSync(dataDir).mode & 0o777;
  if ((mode & 0o002) === 0) {
    warn('data/ 未对其他账号开放写权限，临时托管跨账号重试可能失败');
  }
}

if (warnings.length) {
  for (const message of warnings) console.warn('[release-check] WARN ' + message);
}

if (failures.length) {
  for (const message of failures) console.error('[release-check] FAIL ' + message);
  process.exit(1);
}

console.log('[release-check] OK v' + (pkg && pkg.version) + ' · required files, CommonJS, i18n, data and API docs verified');
