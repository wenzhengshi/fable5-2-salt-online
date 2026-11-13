'use strict';

/**
 * 服务端权威仿真：移动积分、跳跃/飞行、射击命中裁决。
 *
 * 客户端只提交“意图”（移动方向、速度、朝向、开火键），
 * 这里的每一个坐标、伤害、击杀都由服务端计算，客户端位置永远不被采信。
 */

const world = require('./world');

const TICK_MS = 50;
const TICK_HZ = 1000 / TICK_MS;

/* 速度上限（米/秒）。当前仅支持 WebGL 渲染。 */
const SPEED_LIMITS = {
  webgl: { walk: 4.4, sprint: 7.4 }
};
const UNIT_SPEED = {
  hound: { walk: 8.8, sprint: 11.4 },
  drone: { walk: 12.5, sprint: 12.5 },
  vehicle: 20
};
const MAX_INPUT_SPEED = 20;

const FIRE_COOLDOWN_MS = 100;
const WEAPON_RANGE = 90;
const DAMAGE_MAX = 34;
const DAMAGE_MIN = 17;
const DAMAGE_FALLOFF_START = 24;
const GRAVITY = 21;
const JUMP_SPEED = 6.5;
const DRONE_CLIMB = 4.6;
const DRONE_MIN_CLEARANCE = 1.05;
const DRONE_MAX_Y = 22;
const KILL_CREDIT_WINDOW_MS = 8000;

const EYE_HEIGHT = {
  male: 1.62,
  female: 1.6,
  hound: 0.72,
  drone: 0.95
};

/* 命中盒与客户端 avatar 渲染保持一致（见 public/js/multiplayer.js）。 */
const HITBOX = {
  male: { hx: 0.46, hz: 0.46, bottom: 0.02, height: 1.92 },
  female: { hx: 0.44, hz: 0.44, bottom: 0.02, height: 1.84 },
  hound: { hx: 0.58, hz: 0.46, bottom: 0.18, height: 0.58 },
  drone: { hx: 0.55, hz: 0.55, bottom: 0.28, height: 0.62 }
};

function clamp(value, min, max) {
  return value < min ? min : (value > max ? max : value);
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeSoldier(value) {
  return value === 'female' || value === 'hound' || value === 'drone' ? value : 'male';
}

function speedCap(player, sprint) {
  if (player.soldier === 'drone') return UNIT_SPEED.drone.walk;
  if (player.vehicle) return UNIT_SPEED.vehicle;
  if (player.soldier === 'hound') {
    return sprint ? UNIT_SPEED.hound.sprint : UNIT_SPEED.hound.walk;
  }
  const table = SPEED_LIMITS.webgl;
  return sprint ? table.sprint : table.walk;
}

function radiusOf(player) {
  return player.soldier === 'drone' || player.soldier === 'hound' ? world.DRONE_RADIUS : world.PLAYER_RADIUS;
}

function heightOf(player) {
  const box = HITBOX[normalizeSoldier(player.soldier)];
  return box.height;
}

function eyeOf(player) {
  const kind = normalizeSoldier(player.soldier);
  return {
    x: player.pos.x,
    y: player.pos.y + (EYE_HEIGHT[kind] || 1.62),
    z: player.pos.z
  };
}

function hitboxOf(player) {
  const kind = normalizeSoldier(player.soldier);
  const box = HITBOX[kind];
  return {
    minX: player.pos.x - box.hx,
    maxX: player.pos.x + box.hx,
    minY: player.pos.y + box.bottom,
    maxY: player.pos.y + box.bottom + box.height,
    minZ: player.pos.z - box.hz,
    maxZ: player.pos.z + box.hz
  };
}

function createInputState() {
  return {
    seq: -1,
    f: 0,
    s: 0,
    mvx: 0,
    mvz: 0,
    spd: 0,
    sprint: false,
    yaw: 0,
    pitch: 0,
    up: false,
    down: false,
    jump: false,
    fire: false,
    ads: false,
    active: true,
    visible: true,
    jump: false,
    engine: 'webgl',
    aim: null,
    updatedAt: 0
  };
}

/**
 * 解析并清洗 input 包。返回 { input, flags }，flags 是需要计违规的字段。
 * `mv` 是客户端相机空间的水平移动方向（世界坐标），服务端只接受单位向量。
 */
function normalizeInput(msg, previous) {
  const input = previous || createInputState();
  const flags = [];
  const f = clamp(finiteNumber(msg.f, 0), -1, 1);
  const s = clamp(finiteNumber(msg.s, 0), -1, 1);

  let mvx = 0;
  let mvz = 0;
  if (msg.mv && typeof msg.mv === 'object') {
    mvx = finiteNumber(msg.mv.x, 0);
    mvz = finiteNumber(msg.mv.z, 0);
  } else {
    /* 兼容旧客户端：由 yaw + 前后/左右轴推导方向。 */
    const yaw = finiteNumber(msg.yaw, 0);
    mvx = s * Math.cos(yaw) - f * Math.sin(yaw);
    mvz = -s * Math.sin(yaw) - f * Math.cos(yaw);
  }
  const magnitude = Math.hypot(mvx, mvz);
  if (!Number.isFinite(magnitude)) {
    mvx = 0;
    mvz = 0;
    flags.push('bad_input');
  } else if (magnitude > 1.05) {
    flags.push('speed');
  }
  if (magnitude > 1) {
    mvx /= magnitude;
    mvz /= magnitude;
  }
  if (magnitude < 0.02) {
    mvx = 0;
    mvz = 0;
  }

  let aim = null;
  if (msg.aim && typeof msg.aim === 'object') {
    const ax = finiteNumber(msg.aim.x, 0);
    const ay = finiteNumber(msg.aim.y, 0);
    const az = finiteNumber(msg.aim.z, 0);
    const mag = Math.hypot(ax, ay, az);
    if (mag > 1e-4 && Math.abs(ay) / mag <= 0.94) {
      aim = { x: ax / mag, y: ay / mag, z: az / mag };
    } else {
      flags.push('bad_aim');
    }
  }

  const speed = finiteNumber(msg.spd, 0);
  if (speed < -0.01 || speed > MAX_INPUT_SPEED + 0.01) flags.push('speed');

  input.f = f;
  input.s = s;
  input.mvx = mvx;
  input.mvz = mvz;
  input.spd = clamp(speed, 0, MAX_INPUT_SPEED);
  input.sprint = !!msg.sprint;
  input.yaw = finiteNumber(msg.yaw, input.yaw);
  input.pitch = clamp(finiteNumber(msg.pitch, 0), -1.55, 1.55);
  input.aim = aim || input.aim || null;
  input.up = !!msg.up;
  input.down = !!msg.down;
  input.jump = !!msg.jump;
  input.fire = !!msg.fire;
  input.ads = !!msg.ads;
  input.active = msg.active !== false;
  input.visible = msg.visible !== false;
  input.engine = 'webgl';
  input.updatedAt = Date.now();
  return { input, flags };
}

/**
 * 单个玩家的固定步长积分。
 * 返回 { moved, collided, cap, speed } 供反作弊/统计使用。
 */
function stepPlayer(player, dt, now) {
  const input = player.input || createInputState();
  const alive = player.alive && player.active;
  const frozen = now < (player.moveLockUntil || 0) || now < (player.focusUntil || 0);
  const sprint = !!input.sprint;
  const cap = speedCap(player, sprint);
  let speed = clamp(input.spd, 0, cap);
  if (!alive || frozen || !input.active) speed = 0;

  const dx = input.mvx * speed * dt;
  const dz = input.mvz * speed * dt;
  const radius = radiusOf(player);
  const headY = player.pos.y + heightOf(player);

  let collided = false;
  if (Math.abs(dx) > 1e-5 || Math.abs(dz) > 1e-5) {
    collided = world.moveHorizontal(player.pos, dx, dz, radius, player.pos.y, headY);
  }
  player.collided = collided;
  player.sprinting = alive && sprint && speed > 1;
  player.speed = speed;

  if (player.soldier === 'drone') {
    const ground = world.groundHeight(player.pos.x, player.pos.z, player.pos.y + 3);
    let flight = finiteNumber(player.flightY, player.pos.y);
    const minY = ground + DRONE_MIN_CLEARANCE;
    if (input.up) flight += DRONE_CLIMB * dt;
    if (input.down) flight -= DRONE_CLIMB * dt;
    if (!alive) flight = Math.max(minY, flight - DRONE_CLIMB * dt);
    flight = clamp(flight, minY, DRONE_MAX_Y);
    player.flightY = flight;
    player.pos.y = flight;
    player.vy = 0;
    player.onGround = false;
  } else {
    const support = world.groundHeight(player.pos.x, player.pos.z, player.pos.y + 0.55);
    if (alive && input.jump && player.onGround) {
      player.vy = JUMP_SPEED;
      player.onGround = false;
    }
    player.vy -= GRAVITY * dt;
    player.pos.y += player.vy * dt;
    if (player.pos.y <= support) {
      player.pos.y = support;
      player.vy = 0;
      player.onGround = true;
    } else if (player.pos.y > support + 0.02) {
      player.onGround = false;
    }
    if (!alive) player.onGround = true;
  }

  player.rotation = input.yaw;
  player.pitch = input.pitch;
  return { moved: speed > 0.01, collided, cap, speed };
}

function aimDirection(player) {
  const input = player.input || {};
  if (input.aim) return input.aim;
  const pitch = clamp(finiteNumber(input.pitch, 0), -1.5, 1.5);
  const yaw = finiteNumber(input.yaw, 0);
  return {
    x: -Math.cos(pitch) * Math.sin(yaw),
    y: Math.sin(pitch),
    z: -Math.cos(pitch) * Math.cos(yaw)
  };
}

function damageFor(distance) {
  if (distance <= DAMAGE_FALLOFF_START) return DAMAGE_MAX;
  const t = clamp((distance - DAMAGE_FALLOFF_START) / (WEAPON_RANGE - DAMAGE_FALLOFF_START), 0, 1);
  return Math.max(DAMAGE_MIN, Math.round(DAMAGE_MAX - (DAMAGE_MAX - DAMAGE_MIN) * t));
}

/**
 * 服务端射击裁决。
 * @param {object} shooter
 * @param {Array<object>} players
 * @param {number} now
 * @param {object} hooks { isProtected(player), onHit(target, info), onKill(target, info), onBlocked(target) }
 */
function resolveShot(shooter, players, now, hooks) {
  const origin = eyeOf(shooter);
  const dir = aimDirection(shooter);
  const worldDist = world.raycast(origin, dir, WEAPON_RANGE);
  let best = null;
  let bestBox = null;

  for (const other of players) {
    if (other === shooter || !other.active || !other.alive) continue;
    if (other.id === shooter.id) continue;
    const box = hitboxOf(other);
    const t = world.rayBox(origin, dir, box);
    if (t == null || t <= 0 || t > WEAPON_RANGE) continue;
    if (t > worldDist + 0.05) continue;
    if (!best || t < best.distance) {
      best = { player: other, distance: t };
      bestBox = box;
    }
  }

  const endDist = best ? best.distance : worldDist;
  const end = Number.isFinite(endDist)
    ? { x: origin.x + dir.x * endDist, y: origin.y + dir.y * endDist, z: origin.z + dir.z * endDist }
    : { x: origin.x + dir.x * WEAPON_RANGE, y: origin.y + dir.y * WEAPON_RANGE, z: origin.z + dir.z * WEAPON_RANGE };

  if (!best) {
    return {
      fired: true,
      origin,
      dir,
      end,
      distance: Number.isFinite(worldDist) ? worldDist : WEAPON_RANGE,
      blockedByWorld: Number.isFinite(worldDist) && worldDist < WEAPON_RANGE,
      hit: null
    };
  }

  const target = best.player;
  const distance = best.distance;
  const damage = damageFor(distance);
  const shielded = now < (target.protectedUntil || 0);

  if (shielded) {
    if (hooks && hooks.onBlocked) hooks.onBlocked(target, { distance, box: bestBox });
    return {
      fired: true,
      origin,
      dir,
      end,
      distance,
      blockedByWorld: false,
      hit: { id: target.id, shielded: true, damage: 0, hp: target.hp, killed: false }
    };
  }

  target.hp = Math.max(0, target.hp - damage);
  target.lastDamagedAt = now;
  target.lastAttackerId = shooter.id;
  const killed = target.hp <= 0;
  if (killed) {
    target.alive = false;
    target.deaths += 1;
    target.streak = 0;
    target.killerId = shooter.id;
    target.diedAt = now;
    target.respawnAt = now + (target.respawnDelayMs || 5000);
    target.vy = 0;
  }
  if (hooks && hooks.onHit) {
    hooks.onHit(target, { damage, distance, killed, box: bestBox, attacker: shooter });
  }
  if (killed && hooks && hooks.onKill) {
    hooks.onKill(target, { attacker: shooter, damage, distance, weapon: 'rifle' });
  }
  return {
    fired: true,
    origin,
    dir,
    end,
    distance,
    blockedByWorld: false,
    hit: {
      id: target.id,
      damage,
      hp: target.hp,
      killed,
      shielded: false
    }
  };
}

/** 服务端独立挑选出生点：优先离敌人远、且未卡墙的位置。 */
function pickSpawn(player, players, spawnPoints) {
  const points = Array.isArray(spawnPoints) && spawnPoints.length ? spawnPoints : player.spawnFallback || [];
  let best = null;
  let bestScore = -Infinity;
  for (const point of points) {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.z)) continue;
    if (!world.inBounds(point.x, point.z)) continue;
    const y = world.groundHeight(point.x, point.z, (Number(point.y) || 0) + 1.2);
    if (world.blocked(point.x, point.z, world.PLAYER_RADIUS, y, y + 1.8)) continue;
    let nearest = Infinity;
    for (const other of players) {
      if (other === player || !other.active) continue;
      nearest = Math.min(nearest, Math.hypot(other.pos.x - point.x, other.pos.z - point.z));
    }
    if (!Number.isFinite(nearest)) nearest = 999;
    const score = nearest + Math.random() * 4;
    if (score > bestScore) {
      bestScore = score;
      best = { x: point.x, y, z: point.z, yaw: Number(point.yaw) || 0 };
    }
  }
  return best;
}

module.exports = {
  TICK_MS,
  TICK_HZ,
  SPEED_LIMITS,
  UNIT_SPEED,
  FIRE_COOLDOWN_MS,
  WEAPON_RANGE,
  DAMAGE_MIN,
  DAMAGE_MAX,
  DAMAGE_FALLOFF_START,
  KILL_CREDIT_WINDOW_MS,
  aimDirection,
  createInputState,
  damageFor,
  eyeOf,
  hitboxOf,
  normalizeInput,
  normalizeSoldier,
  pickSpawn,
  resolveShot,
  speedCap,
  stepPlayer
};
