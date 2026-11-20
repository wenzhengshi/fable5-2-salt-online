'use strict';

/*
  机械猎犬「被击杀 → 后空翻」的运行期概率配置
  ------------------------------------------------------------------------------------
  优先级（高 → 低）：
    1. 环境变量 HOUND_FLIP_CHANCE（0~1）：运维改部署环境即可，不需要改文件/后台
    2. data/hound-tuning.json 的 flipChance：管理后台 /admin/tuning 写入
    3. DEFAULT_CHANCE（0.50）：代码里的兜底值，与 game.bundle.js 里的 Kv.flipDieChance 一致

  只被读取/写入「一个数字」，不参与任何实时帧计算：
    · 页面渲染时注入 window.__SALT_FLIP__
    · 后台保存后用 broadcastHoundFlip() 推给已入场玩家即时生效
*/

const storage = require('../config/storage');

const FILE = 'hound-tuning.json';
const DEFAULT_CHANCE = 0.5;
const MIN = 0;
const MAX = 1;

function normalize(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= MIN && n <= MAX ? n : null;
}

function envChance() {
  const raw = String(process.env.HOUND_FLIP_CHANCE ?? '').trim();
  if (!raw) return null;
  return normalize(raw);
}

/* 文件里存的值（没有或非法 → null） */
function stored() {
  const data = storage.readJson(FILE);
  if (!data || Array.isArray(data) || typeof data !== 'object') return null;
  return normalize(data.flipChance);
}

/* 生效值 + 来源，供页面注入与后台展示 */
function read() {
  const env = envChance();
  if (env !== null) {
    return { chance: env, source: 'env', defaultChance: DEFAULT_CHANCE, stored: stored() };
  }
  const file = stored();
  if (file !== null) return { chance: file, source: 'file', defaultChance: DEFAULT_CHANCE, stored: file };
  return { chance: DEFAULT_CHANCE, source: 'default', defaultChance: DEFAULT_CHANCE, stored: null };
}

/* chance 取值 0~1；返回 null 表示非法 */
function save(chance) {
  const value = normalize(chance);
  if (value === null) return null;
  storage.updateJson(FILE, raw => {
    const current = raw && !Array.isArray(raw) && typeof raw === 'object' ? raw : {};
    return { ...current, flipChance: value, updatedAt: new Date().toISOString() };
  });
  return read();
}

module.exports = { read, save, stored, DEFAULT_CHANCE, FILE, MIN, MAX };
