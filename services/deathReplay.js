'use strict';

const VERSION = 1;
const WINDOW_MS = 4500;
const RETENTION_MS = 10000;
const MAX_SAMPLES = 110;
const MAX_SHOTS = 48;
const MAX_HITS = 48;
const MIN_SAMPLE_GAP_MS = 45;

const histories = new Map();
const shots = [];
const hits = [];
let sequence = 0;

function round(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function fighter(player) {
  if (!player) return null;
  return {
    id: String(player.id),
    name: player.name,
    color: player.color,
    soldier: player.soldier
  };
}

function pushSample(player, at, force) {
  if (!player || player.id == null || !player.pos) return null;
  const now = Number(at) || Date.now();
  const id = String(player.id);
  let list = histories.get(id);
  if (!list) {
    list = [];
    histories.set(id, list);
  }
  const last = list[list.length - 1];
  if (!force && last && now - last.t < MIN_SAMPLE_GAP_MS) return last;
  const sample = {
    t: now,
    x: round(player.pos.x),
    y: round(player.pos.y),
    z: round(player.pos.z),
    yaw: round(player.yaw),
    pitch: round(player.pitch)
  };
  list.push(sample);
  while (list.length && (now - list[0].t > RETENTION_MS || list.length > MAX_SAMPLES)) {
    list.shift();
  }
  return sample;
}

function recordPlayer(player, at) {
  pushSample(player, at, false);
}

function recordPlayers(players, at) {
  if (!players) return;
  for (const player of players) recordPlayer(player, at);
}

function trimEvents(list, now, max) {
  while (list.length && (now - list[0].t > RETENTION_MS || list.length > max)) {
    list.shift();
  }
}

function recordShot(player, origin, dir, at) {
  if (!player || player.id == null || !origin || !dir) return;
  const now = Number(at) || Date.now();
  shots.push({
    t: now,
    shooterId: String(player.id),
    ox: round(origin.x),
    oy: round(origin.y),
    oz: round(origin.z),
    dx: round(dir.x),
    dy: round(dir.y),
    dz: round(dir.z)
  });
  trimEvents(shots, now, MAX_SHOTS);
}

function recordHit(attacker, victim, damage, hpAfter, killed, at) {
  if (!attacker || !victim || attacker.id == null || victim.id == null) return;
  const now = Number(at) || Date.now();
  hits.push({
    t: now,
    attackerId: String(attacker.id),
    victimId: String(victim.id),
    damage: Math.max(0, Math.round(Number(damage) || 0)),
    hp: Math.max(0, Math.round(Number(hpAfter) || 0)),
    killed: !!killed
  });
  trimEvents(hits, now, MAX_HITS);
}

function trackFor(player, from, now) {
  if (!player) return [];
  const list = histories.get(String(player.id)) || [];
  return list
    .filter((sample) => sample.t >= from && sample.t <= now + 20)
    .map((sample) => [
      Math.round(sample.t - now),
      sample.x,
      sample.y,
      sample.z,
      sample.yaw,
      sample.pitch
    ]);
}

function ensureTrack(track, player, from, now) {
  const output = track.slice();
  if (!output.length) {
    const x = round(player.pos.x);
    const y = round(player.pos.y);
    const z = round(player.pos.z);
    const yaw = round(player.yaw);
    const pitch = round(player.pitch);
    output.push([Math.round(from - now), x, y, z, yaw, pitch]);
    output.push([0, x, y, z, yaw, pitch]);
  } else if (output.length === 1) {
    output.unshift([Math.round(from - now)].concat(output[0].slice(1)));
  }
  const last = output[output.length - 1];
  if (last[0] < 0) {
    output.push([
      0,
      round(player.pos.x),
      round(player.pos.y),
      round(player.pos.z),
      round(player.yaw),
      round(player.pitch)
    ]);
  }
  return output;
}

function bearingTo(from, to) {
  return (Math.atan2(to.x - from.x, -(to.z - from.z)) * 180 / Math.PI + 360) % 360;
}

function build(victim, killer, at) {
  if (!victim || killer == null) return null;
  const now = Number(at) || Date.now();
  const from = now - WINDOW_MS;

  pushSample(victim, now, true);
  pushSample(killer, now, true);

  const victimTrack = ensureTrack(trackFor(victim, from, now), victim, from, now);
  const killerTrack = ensureTrack(trackFor(killer, from, now), killer, from, now);
  const victimLast = victimTrack[victimTrack.length - 1];
  const killerLast = killerTrack[killerTrack.length - 1];
  const distance = Math.round(Math.hypot(
    killerLast[1] - victimLast[1],
    killerLast[2] - victimLast[2],
    killerLast[3] - victimLast[3]
  ) * 10) / 10;
  const bearing = Math.round(bearingTo(
    { x: victimLast[1], z: victimLast[3] },
    { x: killerLast[1], z: killerLast[3] }
  ));
  const killerId = String(killer.id);
  const victimId = String(victim.id);
  const replayShots = shots
    .filter((shot) => shot.shooterId === killerId && shot.t >= from && shot.t <= now)
    .map((shot) => [
      Math.round(shot.t - now),
      shot.ox,
      shot.oy,
      shot.oz,
      shot.dx,
      shot.dy,
      shot.dz
    ]);
  const replayHits = hits
    .filter((hit) => hit.victimId === victimId && hit.t >= from && hit.t <= now)
    .map((hit) => [
      Math.round(hit.t - now),
      hit.damage,
      hit.hp,
      hit.killed ? 1 : 0,
      hit.attackerId
    ]);

  sequence += 1;
  return {
    version: VERSION,
    source: 'server',
    id: 'rp_' + now.toString(36) + '_' + sequence.toString(36),
    killAt: now,
    windowMs: WINDOW_MS,
    victim: fighter(victim),
    killer: fighter(killer),
    distance,
    bearing,
    victimTrack,
    killerTrack,
    shots: replayShots,
    hits: replayHits
  };
}

function prune(at) {
  const now = Number(at) || Date.now();
  for (const [id, list] of histories) {
    while (list.length && now - list[list.length - 1].t > RETENTION_MS) list.pop();
    if (!list.length) histories.delete(id);
  }
  while (shots.length && now - shots[0].t > RETENTION_MS) shots.shift();
  while (hits.length && now - hits[0].t > RETENTION_MS) hits.shift();
}

function reset() {
  histories.clear();
  shots.length = 0;
  hits.length = 0;
  sequence = 0;
}

module.exports = {
  WINDOW_MS,
  recordPlayer,
  recordPlayers,
  recordShot,
  recordHit,
  build,
  prune,
  reset
};
