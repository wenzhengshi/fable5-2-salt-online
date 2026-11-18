(function (root) {
  'use strict';

  const HEIGHT = 20;
  const TEAM_SIZE = 3;
  const TEAM_WINDOW_MS = 12000;
  const GROWTH_MS = 30000;
  const MAX_STAGE = 4;
  const SPLIT_TIMES = [60000, 120000];
  const SMALL_HEIGHT = { cat: .48, hound: .95 };
  const STOMP_RADIUS = { cat: 3.2, hound: 3.6 };
  const shapes = {
    cat: [[0, .43, -.15, .21, .26, .46], [0, .72, .37, .24, .28, .22],
      [-.11, .22, .28, .075, .23, .13], [.11, .22, .28, .075, .23, .13],
      [-.13, .21, -.43, .095, .22, .13], [.13, .21, -.43, .095, .22, .13]],
    hound: [[0, .58, -.08, .43, .32, .64], [0, .76, .48, .29, .25, .28],
      [-.3, .25, .41, .16, .27, .22], [.3, .25, .41, .16, .27, .22],
      [-.3, .25, -.5, .16, .27, .22], [.3, .25, -.5, .16, .27, .22]]
  };

  function rayDistance(boss, origin, dir, range) {
    const height = boss.height || (boss.phase === 'active' ? HEIGHT : SMALL_HEIGHT[boss.kind]);
    const x = origin.x - boss.x;
    const z = origin.z - boss.z;
    const sin = Math.sin(boss.yaw), cos = Math.cos(boss.yaw);
    const localOrigin = [(x * cos - z * sin) / height, (origin.y - boss.y) / height, (x * sin + z * cos) / height];
    const patrolPadding = boss.phase === 'idle' ? .08 / height : 0;
    const localDir = [(dir.x * cos - dir.z * sin) / height, dir.y / height, (dir.x * sin + dir.z * cos) / height];
    let nearest = range;
    for (const shape of shapes[boss.kind]) {
      let a = 0, b = 0, c = -1;
      for (let i = 0; i < 3; i++) {
        const radius = shape[i + 3] + (i === 1 ? 0 : patrolPadding);
        const o = (localOrigin[i] - shape[i]) / radius;
        const d = localDir[i] / radius;
        a += d * d;
        b += o * d;
        c += o * o;
      }
      const discriminant = b * b - a * c;
      if (discriminant < 0) continue;
      const distance = c <= 0 ? 0 : (-b - Math.sqrt(discriminant)) / a;
      if (distance >= 0 && distance < nearest) nearest = distance;
    }
    return nearest < range ? nearest : null;
  }

  const SPLIT_ANIMATION_MS = 1650;
  const PORT_DRONE_CEILING = 43;

  function weakPoint(boss) {
    if (boss.kind !== 'hound' || boss.parentId || boss.phase !== 'active') return null;
    const height = boss.height || HEIGHT;
    return { x: boss.x + Math.sin(boss.yaw) * height * .48, y: boss.y + height * 1.025,
      z: boss.z + Math.cos(boss.yaw) * height * .48, radius: .55 };
  }

  function seesWeakPoint(point, position) {
    return !!point && position.y - point.y >= .65 && position.y - point.y <= 14 &&
      Math.hypot(position.x - point.x, position.z - point.z) <= 4;
  }

  function weakPointDistance(boss, playerPos, origin, dir, range) {
    const point = weakPoint(boss);
    if (!seesWeakPoint(point, playerPos) || dir.y >= -.45 || origin.y <= point.y + .5) return null;
    const dx = point.x - origin.x, dy = point.y - origin.y, dz = point.z - origin.z;
    const along = dx * dir.x + dy * dir.y + dz * dir.z;
    const inside = point.radius ** 2 - (dx ** 2 + dy ** 2 + dz ** 2 - along ** 2);
    if (inside < 0) return null;
    const entry = along - Math.sqrt(inside);
    return entry > 0 && entry < range ? entry : null;
  }

  function splitProgress(birth, now) {
    const t = Math.max(0, Math.min(1, (now - birth.at) / SPLIT_ANIMATION_MS));
    return t * t * (3 - 2 * t);
  }

  function splitPosition(boss, now) {
    const { birth } = boss;
    if (!birth) return boss;
    const progress = splitProgress(birth, now);
    return {
      x: birth.x + (boss.x - birth.x) * progress,
      y: birth.y + (boss.y - birth.y) * progress,
      z: birth.z + (boss.z - birth.z) * progress
    };
  }

  const rules = { HEIGHT, TEAM_SIZE, TEAM_WINDOW_MS, GROWTH_MS, MAX_STAGE, SPLIT_TIMES, SMALL_HEIGHT, STOMP_RADIUS, rayDistance, SPLIT_ANIMATION_MS, PORT_DRONE_CEILING,
    weakPoint, seesWeakPoint, weakPointDistance, splitProgress, splitPosition };
  if (typeof module === 'object' && module.exports) module.exports = rules;
  else root.SaltPortalBossRules = rules;
})(globalThis);
