'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

const view = read('views/index.ejs');
const bootGate = read('public/js/boot-gate.js');
const client = read('public/js/multiplayer.js');
const server = read('realtime/multiplayer.js');
const select = read('public/js/soldier-select.js');
const mobileCss = read('public/css/mobile.css');
const zh = JSON.parse(read('locales/zh-CN.json'));
const en = JSON.parse(read('locales/en-US.json'));

for (const file of [
  'public/js/classic-avatar.js',
  'public/js/community.js',
  'public/js/death-replay-3d.js',
  'public/js/kill-streak.js',
  'public/js/replay.js',
  'public/css/community.css',
  'public/css/replay.css',
  'public/css/mobile.css',
  'public/img/saltline-wechat-group.svg'
]) {
  assert.ok(exists(file), file + ' 必须存在');
}

for (const file of ['public/js/compat-game.js', 'public/css/compat.css']) {
  assert.ok(!exists(file), file + ' 必须移除');
}

assert.match(bootGate, /'community\.js'/, '启动门控必须加载社区脚本');
assert.match(bootGate, /'kill-streak\.js'/, '启动门控必须加载连杀播报');
assert.match(bootGate, /'replay\.js'/, '启动门控必须加载本地回放');
assert.match(bootGate, /'death-replay-3d\.js'/, '启动门控必须加载 3D 死亡回放');
assert.ok(
  bootGate.indexOf('death-replay-3d.js') < bootGate.indexOf('multiplayer.js'),
  '3D 死亡回放必须在多人客户端之前加载'
);
assert.match(view, /\/css\/mobile\.css/, '首页必须加载紧凑移动端样式');
assert.doesNotMatch(view, /compat-game|compat\.css|SALT_FORCE_CANVAS/, '首页不得加载 2D 兼容模式');
assert.doesNotMatch(read('public/js/webgl-guard.js'), /gfx=2d|render=2d|SALT_FORCE_CANVAS/i, '渲染守卫不得保留 2D 切换');
assert.doesNotMatch(view, /\/js\/party\.js/, '不得引入新版小队联网客户端');

assert.match(client, /drone searchlights/, '必须包含无人机搜索灯');
assert.match(client, /machine wrecks/, '必须包含机械单位残骸');
assert.match(client, /death cam/, '必须包含死亡回放');
assert.match(client, /SaltDeathReplay3D/, '死亡回放必须接入 Three.js 渲染器');
assert.match(client, /chaseLightCleanup/, '搜索灯必须有离场清理路径');
assert.match(client, /recordSnapshotTrails/, '死亡回放必须使用老版快照数据');
assert.match(client, /snapshotTrails\.clear\(\)/, '断线时必须清空快照轨迹');
assert.match(client, /tulingai\.com\/app-market\.html\?id=49/, '标题页必须提供安卓应用市场入口');
assert.match(client, /createMarketLink\('title'\)/, '标题页必须挂载安卓应用市场入口');
assert.match(client, /createMarketLink\('paused'\)/, '暂停菜单必须挂载安卓应用市场入口');
assert.equal(zh.mp.appMarket, '安卓应用市场', '中文应用市场入口文案必须存在');
assert.equal(en.mp.appMarket, 'Android app market', '英文应用市场入口文案必须存在');
assert.match(mobileCss, /Compact phone type pass/, '手机端必须有紧凑字号规则');
assert.match(mobileCss, /\.m-word \{ font-size: clamp\(34px, 12\.8vw, 86px\)/, '手机端主标题必须缩小');
const compactMarker = mobileCss.lastIndexOf('/*', mobileCss.indexOf('Compact phone type pass'));
const compactType = mobileCss.slice(compactMarker);
const compactRules = compactType.replace(/\/\*[\s\S]*?\*\//g, '');
assert.doesNotMatch(compactRules, /\.btn|\.tab|button|\.seg/, '手机端字号压缩不得改动按钮');
assert.doesNotMatch(client, /mp-deathcam-map/, '死亡回放不得继续使用 2D 俯视地图');
assert.doesNotMatch(client, /drawDeathReplay/, '死亡回放不得保留 Canvas 2D 绘制函数');
const replay3d = read('public/js/death-replay-3d.js');
assert.match(replay3d, /PerspectiveCamera/, '3D 回放必须使用透视追踪镜头');
assert.match(replay3d, /createOperator/, '3D 回放必须重建击杀者与被击杀者模型');
assert.match(replay3d, /GridHelper/, '3D 回放必须重建港口地面环境');
assert.match(select, /classic-avatar|ClassicAvatar/, '单位选择必须支持方块人');
assert.match(server, /'classic'/, '老版服务器必须接受方块人别名');

assert.doesNotMatch(server, /positionFollowCredit|simAccumulator|authoritative input simulation/, '不得引入新版移动算法');
assert.doesNotMatch(client, /positionAuthority|softCorrection|serverFollow/, '不得引入新版位置校正协议');

console.log(JSON.stringify({
  ok: true,
  oldNetworkingPreserved: true,
  portableFeatures: [
    'community',
    'kill-streak',
    'local-replay',
    'android-market',
    'death-replay',
    'death-replay-3d',
    'drone-searchlight',
    'machine-wreck',
    'classic-avatar',
    'compact-mobile'
  ]
}, null, 2));
