'use strict';

/**
 * 基础反作弊：违规计分、临时惩罚、事件落盘与统计。
 * 只做“服务端能确定的事实”判定（超速、伪造包、畸形包、消息洪泛），
 * 不猜测客户端内部状态，避免误伤高延迟玩家。
 */

const storage = require('../config/storage');

const LIMITS = {
  /* 输入包频率上限（每秒），客户端设计值为 30Hz，留出抖动余量。 */
  maxInputPerSec: 90,
  maxMessagePerSec: 160,
  /* 单条 WS 消息最大字节数。 */
  maxMessageBytes: 8 * 1024,
  /* 违规计分阈值 */
  warnEveryMs: 2500,
  punishScore: 45,
  kickScore: 90,
  /* 连续超速多少次触发短时移动锁 */
  speedLockCount: 8,
  /* 锁定时长 */
  moveLockMs: 1200,
  fireLockMs: 2000
};

const WEIGHTS = {
  speed: 6,
  bad_input: 1,
  bad_aim: 3,
  forged_packet: 14,
  rate: 2,
  malformed: 2,
  oversize: 4
};

const totals = {
  flagged: 0,
  rejected: 0,
  kicked: 0,
  byKind: Object.create(null)
};

const recent = [];
const MAX_RECENT = 200;
let lastPersistAt = 0;
let pending = [];

function nowIso() {
  return new Date().toISOString();
}

function createTracker() {
  return {
    score: 0,
    kinds: Object.create(null),
    flaggedAt: 0,
    lastWarnAt: 0,
    kicks: 0,
    lockedUntil: 0,
    fireLockedUntil: 0
  };
}

function count(kind, amount) {
  totals.flagged += amount;
  totals.byKind[kind] = (totals.byKind[kind] || 0) + amount;
}

/**
 * 记一次违规。返回 { action, score, kind }。
 * action: 'none' | 'warn' | 'lock_move' | 'lock_fire' | 'kick'
 */
function flag(player, kind, weight, detail) {
  if (!player || !player.cheat) return { action: 'none', score: 0, kind };
  const tracker = player.cheat;
  const amount = Number(weight) > 0 ? Number(weight) : (WEIGHTS[kind] || 1);
  const now = Date.now();
  tracker.score += amount;
  tracker.kinds[kind] = (tracker.kinds[kind] || 0) + 1;
  tracker.flaggedAt = now;
  count(kind, 1);

  let action = 'warn';
  if (tracker.score >= LIMITS.kickScore) {
    action = 'kick';
    totals.kicked += 1;
  } else if (kind === 'speed' && tracker.kinds.speed >= LIMITS.speedLockCount) {
    action = 'lock_move';
    tracker.lockedUntil = now + LIMITS.moveLockMs;
  } else if (kind === 'rate' && tracker.kinds.rate >= 12) {
    action = 'lock_fire';
    tracker.fireLockedUntil = now + LIMITS.fireLockMs;
  }

  if (action === 'warn' && now - tracker.lastWarnAt < LIMITS.warnEveryMs) {
    action = 'silent';
  }
  if (action !== 'silent') tracker.lastWarnAt = now;

  const entry = {
    at: nowIso(),
    id: player.id,
    name: player.name,
    kind,
    weight: amount,
    score: tracker.score,
    action,
    detail: detail ? String(detail).slice(0, 160) : null,
    ip: player.ip || null,
    engine: player.engine || null
  };
  recent.push(entry);
  if (recent.length > MAX_RECENT) recent.splice(0, recent.length - MAX_RECENT);
  totals.rejected += 1;
  if (action !== 'silent') {
    pending.push(entry);
    if (pending.length > 20) pending = pending.slice(-20);
  }
  persist();
  return { action, score: tracker.score, kind };
}

/** 批量落盘，避免被高频违规打爆磁盘。 */
function persist() {
  if (!pending.length) return;
  const now = Date.now();
  if (now - lastPersistAt < 1000) return;
  const batch = pending;
  pending = [];
  lastPersistAt = now;
  for (const entry of batch) {
    try {
      storage.appendJsonl('anticheat.jsonl', entry);
    } catch (err) {
      console.error('[anti-cheat] persist failed: ' + (err && err.message ? err.message : err));
      break;
    }
  }
}

function flush() {
  persist();
}

function recentEvents(limit) {
  const size = Math.max(1, Math.min(MAX_RECENT, Number(limit) || 40));
  return recent.slice(-size);
}

function stats() {
  return {
    limits: LIMITS,
    weights: WEIGHTS,
    totals: {
      flagged: totals.flagged,
      rejected: totals.rejected,
      kicked: totals.kicked,
      byKind: { ...totals.byKind }
    },
    recent: recentEvents(12)
  };
}

module.exports = {
  LIMITS,
  WEIGHTS,
  createTracker,
  flag,
  flush,
  recentEvents,
  stats
};
