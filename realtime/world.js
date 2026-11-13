'use strict';

/**
 * 服务端静态世界几何。
 *
 * `world.json` 是从本地关卡导出的一次性静态数据（轴对齐碰撞盒），
 * 服务端用同一份几何做移动碰撞、地面高度、子弹遮挡和视线判定，
 * 因此移动/命中判定不依赖客户端上传的任何位置数据。
 */

const RAW = require('./world.json');

const STEP_HEIGHT = 0.62;
const PLAYER_RADIUS = 0.42;
const DRONE_RADIUS = 0.55;
const CELL_SIZE = 8;
const EPS = 1e-4;

const bounds = {
  minX: Number(RAW.bounds && RAW.bounds.min && RAW.bounds.min[0]) || -40,
  minY: Number(RAW.bounds && RAW.bounds.min && RAW.bounds.min[1]) || -6,
  minZ: Number(RAW.bounds && RAW.bounds.min && RAW.bounds.min[2]) || -34,
  maxX: Number(RAW.bounds && RAW.bounds.max && RAW.bounds.max[0]) || 50,
  maxY: Number(RAW.bounds && RAW.bounds.max && RAW.bounds.max[1]) || 26,
  maxZ: Number(RAW.bounds && RAW.bounds.max && RAW.bounds.max[2]) || 31
};

const boxes = [];
for (const row of RAW.boxes || []) {
  if (!Array.isArray(row) || row.length < 6) continue;
  const [minX, minY, minZ, maxX, maxY, maxZ, flagBits] = row;
  if (![minX, minY, minZ, maxX, maxY, maxZ].every(Number.isFinite)) continue;
  if (maxX - minX <= EPS || maxY - minY <= EPS || maxZ - minZ <= EPS) continue;
  const flags = Number(flagBits) || 0;
  boxes.push({
    minX, minY, minZ, maxX, maxY, maxZ,
    noNav: !!(flags & 1),
    bulletOnly: !!(flags & 2),
    playerOnly: !!(flags & 4),
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    cz: (minZ + maxZ) / 2,
    r: Math.hypot(maxX - minX, maxY - minY, maxZ - minZ) / 2
  });
}

const solid = boxes.filter((box) => !box.bulletOnly && (box.maxY - box.minY) > 0.2);
const bulletBoxes = boxes.filter((box) => !box.playerOnly);

/* ------------------------------------------------------------------- index */

const grid = new Map();
function cellKey(cx, cz) {
  return cx + ',' + cz;
}

for (let i = 0; i < solid.length; i += 1) {
  const box = solid[i];
  const x0 = Math.floor(box.minX / CELL_SIZE);
  const x1 = Math.floor(box.maxX / CELL_SIZE);
  const z0 = Math.floor(box.minZ / CELL_SIZE);
  const z1 = Math.floor(box.maxZ / CELL_SIZE);
  for (let cx = x0; cx <= x1; cx += 1) {
    for (let cz = z0; cz <= z1; cz += 1) {
      const key = cellKey(cx, cz);
      let bucket = grid.get(key);
      if (!bucket) {
        bucket = [];
        grid.set(key, bucket);
      }
      bucket.push(box);
    }
  }
}

let queryStamp = 0;

function querySolid(x, z, radius, out) {
  queryStamp += 1;
  const stamp = queryStamp;
  const x0 = Math.floor((x - radius) / CELL_SIZE);
  const x1 = Math.floor((x + radius) / CELL_SIZE);
  const z0 = Math.floor((z - radius) / CELL_SIZE);
  const z1 = Math.floor((z + radius) / CELL_SIZE);
  for (let cx = x0; cx <= x1; cx += 1) {
    for (let cz = z0; cz <= z1; cz += 1) {
      const bucket = grid.get(cellKey(cx, cz));
      if (!bucket) continue;
      for (const box of bucket) {
        if (box.__stamp === stamp) continue;
        box.__stamp = stamp;
        out.push(box);
      }
    }
  }
  return out;
}

function clampToBounds(value, min, max) {
  return value < min ? min : (value > max ? max : value);
}

function inBounds(x, z) {
  return x > bounds.minX - 2 && x < bounds.maxX + 2 && z > bounds.minZ - 2 && z < bounds.maxZ + 2;
}

/* --------------------------------------------------------------- collision */

const scratch = [];

/**
 * 水平方向是否被实体阻挡。低于 STEP_HEIGHT 的台阶可以被踩上去，不算阻挡。
 */
function blocked(x, z, radius, feetY, headY) {
  scratch.length = 0;
  querySolid(x, z, radius, scratch);
  for (const box of scratch) {
    if (box.maxY <= feetY + STEP_HEIGHT) continue;
    if (box.minY >= headY - EPS) continue;
    if (x + radius <= box.minX + EPS || x - radius >= box.maxX - EPS) continue;
    if (z + radius <= box.minZ + EPS || z - radius >= box.maxZ - EPS) continue;
    return true;
  }
  return false;
}

/**
 * 地面/可站立高度：只考虑脚底往上 STEP_HEIGHT 以内的平台顶面。
 */
function groundHeight(x, z, fromY) {
  let best = 0;
  scratch.length = 0;
  querySolid(x, z, 0.05, scratch);
  for (const box of scratch) {
    if (box.maxY > fromY + STEP_HEIGHT + EPS) continue;
    if (box.maxY <= best) continue;
    if (x < box.minX - 0.05 || x > box.maxX + 0.05) continue;
    if (z < box.minZ - 0.05 || z > box.maxZ + 0.05) continue;
    best = box.maxY;
  }
  return best;
}

function isWalkable(x, z) {
  return !blocked(x, z, PLAYER_RADIUS, groundHeight(x, z, 6), groundHeight(x, z, 6) + 1.8);
}

/**
 * 逐轴滑动碰撞：先尝试 X，再尝试 Z，被挡住的分量丢弃。
 * 返回是否发生了碰撞（用于取消速度、避免穿墙）。
 */
function moveHorizontal(pos, dx, dz, radius, feetY, headY) {
  let hit = false;
  const nextX = clampToBounds(pos.x + dx, bounds.minX + radius, bounds.maxX - radius);
  if (Math.abs(nextX - pos.x) > EPS) {
    if (!blocked(nextX, pos.z, radius, feetY, headY)) {
      pos.x = nextX;
    } else {
      hit = true;
    }
  }
  const nextZ = clampToBounds(pos.z + dz, bounds.minZ + radius, bounds.maxZ - radius);
  if (Math.abs(nextZ - pos.z) > EPS) {
    if (!blocked(pos.x, nextZ, radius, feetY, headY)) {
      pos.z = nextZ;
    } else {
      hit = true;
    }
  }
  return hit;
}

/* ------------------------------------------------------------------- rays */

function rayBox(origin, dir, box) {
  let tmin = -Infinity;
  let tmax = Infinity;
  const o = [origin.x, origin.y, origin.z];
  const d = [dir.x, dir.y, dir.z];
  const min = [box.minX, box.minY, box.minZ];
  const max = [box.maxX, box.maxY, box.maxZ];
  for (let i = 0; i < 3; i += 1) {
    if (Math.abs(d[i]) < 1e-8) {
      if (o[i] < min[i] || o[i] > max[i]) return null;
    } else {
      let t1 = (min[i] - o[i]) / d[i];
      let t2 = (max[i] - o[i]) / d[i];
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
      }
      if (t1 > tmin) tmin = t1;
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return null;
    }
  }
  if (tmax < 0) return null;
  return tmin > 0 ? tmin : 0;
}

/**
 * 子弹射线与静态几何求交，返回最近命中距离（Infinity 表示未命中）。
 */
function raycast(origin, dir, maxDist) {
  let best = Infinity;
  const limit = Number.isFinite(maxDist) ? Math.max(0, maxDist) : 500;
  for (const box of bulletBoxes) {
    // 粗略剔除：射线到包围球的距离
    const vx = box.cx - origin.x;
    const vy = box.cy - origin.y;
    const vz = box.cz - origin.z;
    const project = vx * dir.x + vy * dir.y + vz * dir.z;
    if (project < -box.r || project > limit + box.r) continue;
    const px = vx - dir.x * project;
    const py = vy - dir.y * project;
    const pz = vz - dir.z * project;
    if (px * px + py * py + pz * pz > box.r * box.r) continue;
    const t = rayBox(origin, dir, box);
    if (t != null && t <= limit && t < best) best = t;
  }
  return best;
}

function lineOfSight(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const dist = Math.hypot(dx, dy, dz);
  if (dist < 0.001) return true;
  const dir = { x: dx / dist, y: dy / dist, z: dz / dist };
  return raycast(from, dir, dist - 0.35) >= dist - 0.35;
}

function stats() {
  return {
    file: 'realtime/world.json',
    boxes: boxes.length,
    solid: solid.length,
    bulletBlocking: bulletBoxes.length,
    cellSize: CELL_SIZE,
    stepHeight: STEP_HEIGHT,
    bounds
  };
}

module.exports = {
  bounds,
  boxes,
  solid,
  STEP_HEIGHT,
  PLAYER_RADIUS,
  DRONE_RADIUS,
  blocked,
  groundHeight,
  inBounds,
  isWalkable,
  lineOfSight,
  moveHorizontal,
  raycast,
  rayBox,
  stats
};
