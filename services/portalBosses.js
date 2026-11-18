'use strict';

const { randomUUID } = require('node:crypto');
const storage = require('../config/storage');
const { maps } = require('../public/js/expedition-zones');
const qingyun = require('../public/js/qingyun-zone');
const { HEIGHT, SMALL_HEIGHT, TEAM_SIZE, TEAM_WINDOW_MS, GROWTH_MS, MAX_STAGE, SPLIT_TIMES, STOMP_RADIUS, rayDistance, SPLIT_ANIMATION_MS, splitPosition, splitProgress, weakPointDistance } = require('../public/js/portal-boss-rules');
const terrain = require('./portal-boss-world.json');

const FILE = 'portal-bosses.json';
const LEASH = 74;
const SIGHT = 58;
const WINDUP_MS = 750;
const RECOVER_MS = 1250;
const FIRE_WINDUP_MS = 700;
const BURST_GAP_MS = 180;
const FIRE_COOLDOWN_MS = 2400;
const FIRE_RANGE = 58;
const stats = {
  cat: { hp: 2400, speed: 7.2, damage: 38, bullet: 7, muzzle: [.65, .54] },
  hound: { hp: 3000, speed: 7.8, damage: 44, bullet: 9, muzzle: [.82, .41] }
};
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const limit = (n, max) => Math.max(0, Math.min(n, max));
const worldOffset = map => map === 'qingyun' ? qingyun.offsetZ : maps[map]?.offset || 0;

function ground(map, x, z, fallback) {
  const area = terrain[map];
  if (!area) return fallback;
  const { x0, z0, n, step, heights } = area;
  const gx = limit((x - x0) / step, n - 1.001);
  const gz = limit((z - worldOffset(map) - z0) / step, n - 1.001);
  const ix = Math.floor(gx), iz = Math.floor(gz);
  const u = gx - ix, v = gz - iz;
  const i = iz * n + ix;
  return ((heights[i] * (1 - u) + heights[i + 1] * u) * (1 - v) +
    (heights[i + n] * (1 - u) + heights[i + n + 1] * u) * v) / 100;
}

function blocked(map, a, b, clearance = 0) {
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
  const z = a.z - worldOffset(map);
  const endZ = z + dz;
  const minX = Math.min(a.x, b.x), maxX = Math.max(a.x, b.x);
  const minZ = Math.min(z, endZ), maxZ = Math.max(z, endZ);
  const axes = [[0, a.x, dx], [1, a.y, dy], [2, z, dz]];
  for (const box of terrain[map]?.boxes || []) {
    if (box[0] - clearance > maxX || box[3] + clearance < minX ||
        box[2] - clearance > maxZ || box[5] + clearance < minZ) continue;
    let near = 0, far = 1;
    for (const [axis, start, delta] of axes) {
      const padding = axis === 1 ? 0 : clearance;
      const low = box[axis] - padding, high = box[axis + 3] + padding;
      if (Math.abs(delta) < 1e-8) {
        if (start < low || start > high) { far = -1; break; }
        continue;
      }
      const t0 = (low - start) / delta, t1 = (high - start) / delta;
      near = Math.max(near, Math.min(t0, t1));
      far = Math.min(far, Math.max(t0, t1));
      if (near > far) break;
    }
    if (near <= far && far > 1e-5 && near < .998) return true;
  }
  if (clearance || !terrain[map]) return false;
  const steps = Math.ceil(Math.hypot(dx, dz) / 1.5);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (ground(map, a.x + dx * t, a.z + dz * t, a.y) > a.y + dy * t + .12) return true;
  }
  return false;
}

function createPortalBosses({ mapKey, players, damage, send, fire = () => {}, settleReward = () => {}, explode = () => {} }) {
  let saved;
  try { saved = storage.readJson(FILE); }
  catch (error) { console.error('[portal-bosses] state load failed:', error.message); }
  const bosses = new Map();
  const sites = [
    ['cat', 'dustfall', maps.dustfall.exit, -5, 0, 16],
    ['hound', 'port', qingyun.gate, -4.6, 1.5, 0],
    ['hound', 'qingyun', qingyun.hubReturnGate, 4.6, -1.6, qingyun.hubReturnGate.y],
    ...Object.values(maps).map(map => ['hound', map.id, map.exit, 5, 0, map.landing.y])
  ];
  function createBody(id, kind, map, home, maxHp, parentId = null) {
    return { id, kind, map, home, ...home, maxHp, hp: maxHp, parentId,
      phase: parentId ? 'active' : 'idle', moving: false, attack: null, ranged: null, nextRangedAt: 0, recoverAt: 0,
      lastAttacker: '', prioritizeUntil: 0, patrolIndex: 0, nextPatrolAt: 0 };
  }

  function restore(body, state) {
    if (!Number.isInteger(state?.hp) || state.hp <= 0 || state.hp > body.maxHp) return;
    body.phase = 'active';
    body.hp = state.hp;
    if ([state.x, state.y, state.z, state.yaw].every(Number.isFinite) &&
        distance(body.home, state) <= LEASH) {
      Object.assign(body, { x: state.x, y: state.y, z: state.z, yaw: state.yaw });
    }
  }

  function stage(boss) {
    return Math.min(MAX_STAGE, Math.floor(boss.elapsed / GROWTH_MS));
  }

  function height(boss) {
    if (boss.parentId) return 10;
    return boss.phase === 'idle' ? SMALL_HEIGHT[boss.kind] : HEIGHT + 3 * stage(boss);
  }

  function childBody(parent, serial, spot) {
    const child = createBody(parent.id + '-split-' + serial, parent.kind, parent.map, parent.home,
      Math.round(parent.maxHp * .25), parent.id);
    return Object.assign(child, spot);
  }

  for (const [kind, map, gate, dx, dz, y] of sites) {
    const id = kind + '-' + map;
    const home = { x: gate.x + dx, y, z: gate.z + dz, yaw: dx < 0 ? .85 : -.85 };
    home.y = ground(map, home.x, home.z, y);
    const enemy = Object.assign(createBody(id, kind, map, home, stats[kind].hp), {
      children: [], splitCount: 0, elapsed: 0, savedElapsed: 0, contributors: new Map(), rewardDamage: {}, gate
    });
    const previous = saved?.[id];
    if (previous?.phase === 'active') restore(enemy, previous);
    enemy.pendingReward = previous?.pendingReward ?? null;
    if (enemy.phase === 'active') {
      enemy.encounterId = previous.encounterId || randomUUID();
      enemy.rewardDamage = previous.rewardDamage || {};
      enemy.elapsed = limit(Number(previous.elapsed) || 0, SPLIT_TIMES.at(-1));
      enemy.savedElapsed = enemy.elapsed;
      enemy.splitCount = limit(Math.floor(Number(previous.splitCount) || 0), SPLIT_TIMES.length);
      for (let serial = 1; serial <= enemy.splitCount; serial++) {
        const state = previous.children?.[serial];
        if (!state || ![state.x, state.y, state.z, state.yaw].every(Number.isFinite) ||
            distance(home, state) > LEASH || !Number.isInteger(state.hp) || state.hp <= 0) continue;
        const child = childBody(enemy, serial);
        restore(child, state);
        if (state.birth && [state.birth.x, state.birth.y, state.birth.z, state.birth.at].every(Number.isFinite)) {
          child.birth = state.birth;
          enemy.splitUntil = Math.max(enemy.splitUntil || 0, child.birth.at + SPLIT_ANIMATION_MS);
        }
        enemy.children.push(child);
      }
    }
    if (!bosses.has(map)) bosses.set(map, []);
    bosses.get(map).push(enemy);
  }

  function bodyState({ phase, hp, x, y, z, yaw, birth }) {
    return { phase, hp, x, y, z, yaw, birth };
  }

  function save(root, next) {
    const children = Object.fromEntries(next.children.map(child =>
      [child.id.split('-').at(-1), bodyState(child)]));
    try {
      storage.updateJson(FILE, data => ({
        ...data, [root.id]: { ...bodyState(next), elapsed: next.elapsed, splitCount: next.splitCount, children,
          encounterId: next.encounterId, rewardDamage: next.rewardDamage, pendingReward: next.pendingReward }
      }));
      Object.assign(root, next, { savedElapsed: next.elapsed });
      return true;
    } catch (error) {
      console.error('[portal-bosses] state save failed:', error.message);
      return false;
    }
  }

  function deliverReward(root, now) {
    if (!root.pendingReward || now < (root.rewardRetryAt || 0)) return;
    root.rewardRetryAt = now + 5000;
    try {
      settleReward(root.pendingReward);
      save(root, { ...root, pendingReward: null, rewardRetryAt: 0 });
    } catch (error) {
      console.error('[portal-bosses] reward settlement failed:', error.message);
    }
  }

  function eligible(player, now) {
    return player.joined && player.active && player.alive && !(player.focusUntil > now) &&
      player.ws?.readyState === 1 && !player.frontierDrop;
  }

  function participantKey(player) {
    return player.signOwner || player.clientId || player.fingerprint || player.id;
  }

  function inArena(player, boss) {
    return distance(player.pos, boss) <= SIGHT + 8 && distance(player.pos, boss.home) <= LEASH &&
      Math.abs(player.pos.y - boss.y) <= height(boss) + 5;
  }

  function teamCount(boss, nearby, now) {
    for (const [id, time] of boss.contributors) {
      if (now - time >= TEAM_WINDOW_MS) boss.contributors.delete(id);
    }
    return new Set(nearby.filter(person => inArena(person, boss) &&
      boss.contributors.has(participantKey(person))).map(participantKey)).size;
  }

  function shot(player, origin, dir, profile, now) {
    if (profile.id === 'knife' || !eligible(player, now)) return false;
    const map = mapKey(player);
    const nearby = [...players()].filter(person => mapKey(person) === map && eligible(person, now));
    let root, boss, weak = false, nearest = profile.range;
    for (const parent of bosses.get(map) || []) for (const candidate of [parent, ...parent.children]) {
      if (candidate.birth && now < candidate.birth.at + SPLIT_ANIMATION_MS) continue;
      const body = { ...candidate, height: height(candidate) };
      const ordinary = rayDistance(body, origin, dir, nearest);
      const direct = player.soldier === 'drone'
        ? weakPointDistance(body, player.pos, origin, dir, ordinary ?? nearest) : null;
      const hit = direct ?? ordinary;
      if (hit === null) continue;
      nearest = hit;
      boss = candidate;
      root = parent;
      weak = direct !== null;
    }
    if (!boss) return false;
    if (root.pendingReward) return true;
    const impact = { x: origin.x + dir.x * nearest, y: origin.y + dir.y * nearest, z: origin.z + dir.z * nearest };
    if (blocked(map, origin, impact)) return false;
    // A nearer player already occupies the shot path.
    for (const other of nearby) {
      if (other === player) continue;
      const { x, y, z } = other.pos;
      const along = (x - origin.x) * dir.x + (z - origin.z) * dir.z + (y + .85 - origin.y) * dir.y;
      if (along < .35 || along >= nearest) continue;
      const ox = origin.x + dir.x * along - x, oz = origin.z + dir.z * along - z;
      const hitY = origin.y + dir.y * along;
      if (Math.hypot(ox, oz) < .4 && hitY >= y && hitY <= y + 1.85) return false;
    }

    if (inArena(player, root)) root.contributors.set(participantKey(player), now);
    const count = teamCount(root, nearby, now);
    const multiplier = count >= TEAM_SIZE ? 2 : count === 2 ? 1.35 : 1;
    const floor = !boss.parentId && count < TEAM_SIZE ? Math.ceil(boss.maxHp * .2) : 0;
    const damage = weak ? boss.hp : Math.max(0, Math.min(boss.hp - floor, Math.round(profile.damage * multiplier)));
    if (!damage) {
      send(player.ws, { type: 'hitConfirm', targetId: boss.id, hp: boss.hp, teamBlocked: true });
      return true;
    }
    const hp = boss.hp - damage;
    const defeated = hp === 0;
    const hit = { ...boss, hp, phase: 'active', lastAttacker: player.id, prioritizeUntil: now + 1700 };
    let next = hit;
    if (boss.parentId) {
      next = { ...root, children: defeated ? root.children.filter(child => child !== boss) :
        root.children.map(child => child === boss ? hit : child) };
    } else if (defeated) {
      next = { ...root, ...root.home, hp: root.maxHp, phase: 'idle', moving: false, attack: null,
        ranged: null, nextRangedAt: 0, recoverAt: 0, lastAttacker: '', prioritizeUntil: 0, patrolIndex: 0, nextPatrolAt: 0,
        children: [], splitCount: 0, splitUntil: 0, elapsed: 0, contributors: new Map() };
    }
    const score = { ...root.rewardDamage };
    const owner = player.signOwner;
    if (owner) {
      const previous = score[owner] || { hits: 0, damage: 0 };
      score[owner] = { hits: previous.hits + 1, damage: previous.damage + damage };
    }
    const encounterId = root.encounterId || randomUUID();
    if (defeated && !boss.parentId) {
      const present = new Set([...players()].filter(person => person.joined && person.ws?.readyState === 1 &&
        mapKey(person) === map).map(person => person.signOwner));
      const participants = Object.entries(score).filter(([key, row]) => row.hits >= 3 && present.has(key))
        .map(([key, row]) => ({ owner: key, damage: row.damage }));
      next.encounterId = null;
      next.rewardDamage = {};
      next.pendingReward = participants.length ? { id: encounterId, bossId: root.id, map, at: now, participants } : null;
    } else {
      next.encounterId = encounterId;
      next.rewardDamage = score;
    }
    const burst = weak ? [root, ...root.children].map(body => {
      const pos = splitPosition(body, now);
      const progress = body.birth ? splitProgress(body.birth, now) : 1;
      const bodyHeight = height(body) * (.06 + progress * .94);
      return { id: body.id, x: pos.x, y: pos.y + (1 - progress) * 3 + bodyHeight * .5, z: pos.z,
        scale: body.parentId ? 1.7 : 3 };
    }) : null;
    if (!save(root, next)) return true;
    if (burst) explode(map, burst);
    deliverReward(root, now);
    send(player.ws, { type: 'hitConfirm', targetId: boss.id, damage, hp, killed: defeated });
    return true;
  }

  function move(boss, goal, dt, idle = false) {
    const toward = Math.atan2(goal.x - boss.x, goal.z - boss.z);
    const speed = idle ? 1.2 : stats[boss.kind].speed;
    const step = Math.min(distance(boss, goal), speed * dt);
    if (step < .02) return;
    for (const turn of [0, .48, -.48, 1, -1, 1.48, -1.48]) {
      const yaw = toward + turn;
      const x = boss.x + Math.sin(yaw) * step;
      const z = boss.z + Math.cos(yaw) * step;
      const point = { x, z };
      if (distance(boss.home, point) > (idle ? 3.6 : LEASH) ||
          (idle && distance(boss.gate, point) < 2)) continue;
      const y = ground(boss.map, x, z, boss.y);
      const lift = idle ? SMALL_HEIGHT[boss.kind] * .45 : 1.15;
      if (Math.abs(y - boss.y) > 1.3 || blocked(boss.map,
        { x: boss.x, y: boss.y + lift, z: boss.z }, { x, y: y + lift, z }, idle ? .35 : 1.2)) continue;
      Object.assign(boss, { x, y, z, yaw, moving: true });
      return;
    }
  }

  function patrol(boss, dt, now) {
    const angle = boss.home.yaw + boss.patrolIndex * Math.PI / 3;
    const point = { x: boss.home.x + 2.8 * Math.sin(angle), z: boss.home.z + 2.8 * Math.cos(angle) };
    if (!boss.nextPatrolAt) boss.nextPatrolAt = now + 7000;
    move(boss, point, dt, true);
    if (distance(boss, point) < .15 || now >= boss.nextPatrolAt) {
      boss.patrolIndex = (boss.patrolIndex + 1) % 6;
      boss.nextPatrolAt = now + 7000;
    }
  }

  function splitSpot(boss) {
    const turn = boss.splitCount % 2 ? -1 : 1;
    const hound = boss.kind === 'hound';
    const anchors = hound ? [boss] : [boss, boss.home];
    const reaches = hound ? [20, 16, 12] : [13, 8, 4];
    for (const anchor of anchors) for (const reach of reaches) {
      for (const offset of [1.57, .8, 2.35, 3.14, 0, -1.57]) {
        const yaw = anchor.yaw + offset * turn;
        const x = anchor.x + Math.sin(yaw) * reach, z = anchor.z + Math.cos(yaw) * reach;
        const y = ground(boss.map, x, z, anchor.y);
        const point = { x, y, z };
        if (distance(boss.home, point) <= LEASH && distance(boss.gate, point) > 2 &&
            Math.abs(y - anchor.y) <= 3 && !boss.children.some(child => distance(child, point) < 4) &&
            !blocked(boss.map, { ...anchor, y: anchor.y + 1.15 }, { x, y: y + 1.15, z }, 1.2)) {
          return { ...point, yaw: boss.yaw };
        }
      }
    }
    return null;
  }

  function advance(boss, nearby, dt, now) {
    if (!nearby.some(player => inArena(player, boss))) return;
    const previousStage = stage(boss);
    boss.elapsed = Math.min(SPLIT_TIMES.at(-1), boss.elapsed + Math.round(dt * 1000));
    if (boss.elapsed >= SPLIT_TIMES[boss.splitCount]) {
      const spot = splitSpot(boss);
      if (spot) {
        const serial = boss.splitCount + 1;
        const child = childBody(boss, serial, spot);
        if (boss.kind === 'hound') {
          const yaw = Math.atan2(spot.x - boss.x, spot.z - boss.z);
          child.birth = { x: boss.x + 2 * Math.sin(yaw), y: boss.y, z: boss.z + 2 * Math.cos(yaw), at: now };
        }
        const splitState = child.birth ? { splitUntil: now + SPLIT_ANIMATION_MS, attack: null, ranged: null } : {};
        save(boss, { ...boss, ...splitState, splitCount: serial, children: [...boss.children, child] });
        return;
      }
    }
    if (stage(boss) !== previousStage || boss.elapsed - boss.savedElapsed >= 5000) save(boss, boss);
  }

  function rangedStart(boss, target, now) {
    const aim = { ...target.pos, y: target.pos.y + (target.soldier === 'hound' || target.soldier === 'drone' ? .45 : 1) };
    const yaw = Math.atan2(aim.x - boss.x, aim.z - boss.z);
    const [rise, forward] = stats[boss.kind].muzzle;
    const scale = height(boss);
    const base = { x: boss.x, y: boss.y + rise * scale, z: boss.z };
    const origin = { x: base.x + forward * scale * Math.sin(yaw), y: base.y,
      z: base.z + forward * scale * Math.cos(yaw) };
    const length = Math.hypot(aim.x - origin.x, aim.y - origin.y, aim.z - origin.z);
    if (length < .5 || length > FIRE_RANGE || distance(base, aim) < forward * scale + .5 ||
        blocked(boss.map, base, origin) || blocked(boss.map, origin, aim)) return false;
    const dir = { x: (aim.x - origin.x) / length, y: (aim.y - origin.y) / length, z: (aim.z - origin.z) / length };
    boss.yaw = yaw;
    // Lock the line of fire on the warning. Players can sidestep the entire burst.
    boss.ranged = { origin, dir, aim, started: now, at: now + FIRE_WINDUP_MS, rounds: boss.parentId ? 2 : 3 };
    return true;
  }

  function fireRound(boss, nearby, now) {
    const burst = boss.ranged;
    if (now < burst.at) return;
    const { origin, dir } = burst;
    let victim;
    let range = FIRE_RANGE;
    for (const player of nearby) {
      if (!player.alive || now < player.protectedUntil) continue;
      const { x, y, z } = player.pos;
      const machine = player.soldier === 'hound' || player.soldier === 'drone';
      const center = y + (machine ? .45 : 1);
      const hit = (x - origin.x) * dir.x + (center - origin.y) * dir.y + (z - origin.z) * dir.z;
      if (hit <= 0 || hit >= range) continue;
      const point = { x: origin.x + dir.x * hit, y: origin.y + dir.y * hit, z: origin.z + dir.z * hit };
      if (Math.hypot(point.x - x, point.z - z) >= .38 ||
          Math.abs(point.y - center) >= (machine ? .48 : .95) || blocked(boss.map, origin, point)) continue;
      victim = player;
      range = hit;
    }
    fire(boss, { origin, dir, range });
    if (victim) {
      const power = boss.parentId ? .55 : 1 + stage(boss) * .2;
      damage(victim, boss, Math.round(stats[boss.kind].bullet * power), now, origin);
    }
    if (--burst.rounds > 0) burst.at = now + BURST_GAP_MS;
    else {
      boss.ranged = null;
      boss.nextRangedAt = now + FIRE_COOLDOWN_MS;
      boss.recoverAt = now + 450;
    }
  }

  function fight(boss, nearby, dt, now) {
    const map = boss.map;
    const size = height(boss) / HEIGHT;
    const radius = STOMP_RADIUS[boss.kind] * size;
    boss.moving = false;
    if (boss.ranged) {
      fireRound(boss, nearby, now);
      return;
    }
    if (boss.attack) {
      if (now < boss.attack.at) return;
      const strike = boss.attack;
      boss.attack = null;
      boss.recoverAt = now + RECOVER_MS;
      for (const player of nearby) {
        if (!player.alive || now < player.protectedUntil || distance(strike, player.pos) > strike.radius ||
            Math.abs(player.pos.y - strike.y) > 1.35 ||
            blocked(map, { ...strike, y: strike.y + .55 }, { ...player.pos, y: player.pos.y + .65 })) continue;
        damage(player, boss, strike.damage, now);
      }
      return;
    }
    if (now < boss.recoverAt) return;
    let target;
    let best = Infinity;
    for (const player of nearby) {
      const d = distance(player.pos, boss);
      if (d > SIGHT || distance(player.pos, boss.home) > LEASH - 3) continue;
      const priority = player.id === boss.lastAttacker && now < boss.prioritizeUntil ? -1 : d;
      if (priority >= best || blocked(map, { x: boss.x, y: boss.y + height(boss) * .6, z: boss.z },
        { ...player.pos, y: player.pos.y + 1 })) continue;
      target = player;
      best = priority;
    }
    if (!target) {
      if (distance(boss, boss.home) > .6) move(boss, boss.home, dt);
      return;
    }
    const d = distance(boss, target.pos);
    if (d < 8.3 * size && Math.abs(target.pos.y - boss.y) < 2.3) {
      boss.yaw = Math.atan2(target.pos.x - boss.x, target.pos.z - boss.z);
      const reach = Math.min(d, 5.4 * size);
      const x = boss.x + Math.sin(boss.yaw) * reach, z = boss.z + Math.cos(boss.yaw) * reach;
      const y = ground(map, x, z, boss.y);
      if (blocked(map, { x: boss.x, y: boss.y + 1.15, z: boss.z }, { x, y: y + 1, z })) {
        move(boss, target.pos, dt);
        return;
      }
      const power = boss.parentId ? .55 : 1 + stage(boss) * .2;
      boss.attack = { x, y, z, radius, damage: Math.round(stats[boss.kind].damage * power), at: now + WINDUP_MS };
    } else if (now < boss.nextRangedAt || !rangedStart(boss, target, now)) {
      move(boss, target.pos, dt);
    }
  }

  let lastTick = 0;
  let sampleTime = 0;
  const byMap = new Map();
  function tick(now) {
    const dt = lastTick ? Math.max(0, Math.min(.2, (now - lastTick) / 1000)) : .1;
    lastTick = sampleTime = now;
    byMap.clear();
    for (const player of players()) {
      if (!eligible(player, now)) continue;
      const map = mapKey(player);
      if (!byMap.has(map)) byMap.set(map, []);
      byMap.get(map).push(player);
    }
    for (const [map, group] of bosses) for (const boss of group) {
      const nearby = byMap.get(map) || [];
      if (boss.phase === 'idle') {
        deliverReward(boss, now);
        boss.moving = false;
        if (nearby.length) patrol(boss, dt, now);
        continue;
      }
      advance(boss, nearby, dt, now);
      if (now >= (boss.splitUntil || 0)) fight(boss, nearby, dt, now);
      else boss.moving = false;
      for (const child of boss.children) {
        if (child.birth && now < child.birth.at + SPLIT_ANIMATION_MS) continue;
        child.birth = null;
        fight(child, nearby, dt, now);
      }
    }
  }

  function snapshot(map) {
    return (bosses.get(map) || []).flatMap(root => {
      const count = root.phase === 'active' ? teamCount(root, byMap.get(map) || [], sampleTime) : 0;
      return [root, ...root.children].map(boss => {
        const { id, parentId, kind, phase, hp, maxHp, x, y, z, yaw, moving, attack } = boss;
        const aim = boss.ranged ? { origin: boss.ranged.origin, at: boss.ranged.started,
          target: boss.ranged.aim, windupMs: FIRE_WINDUP_MS } : null;
        return { id, parentId, kind, phase, hp, maxHp, x, y, z, yaw, moving, attack, aim, birth: boss.birth, height: height(boss),
          ...(parentId || phase === 'idle' ? {} : {
            team: count, elapsed: root.elapsed, nextSplitMs: SPLIT_TIMES[root.splitCount] ?? null
          }) };
      });
    });
  }

  return { shot, tick, snapshot };
}

module.exports = { createPortalBosses, ground, blocked };
