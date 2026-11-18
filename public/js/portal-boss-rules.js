(function (root) {
  'use strict';

  const HEIGHT = 20;
  const TEAM_SIZE = 3;
  const TEAM_WINDOW_MS = 12000;
  const GROWTH_MS = 30000;
  const MAX_STAGE = 4;
  const SPLIT_TIMES = [60000, 120000];
  const SMALL_HEIGHT = { cat: .48, watercolor: .48, hound: .95 };
  const STOMP_RADIUS = { cat: 3.2, watercolor: 3.2, hound: 3.6 };
  const BOSS_NAMES = {
    cat: { zh: '奶油虎斑巨猫', en: 'Giant tabby' },
    watercolor: { zh: '水彩巨猫', en: 'Giant watercolor cat' },
    hound: { zh: '巨型机器狗', en: 'Giant hound' }
  };
  // Normalized envelopes of the animated models; the cat's tail is narrower than its body.
  const bodyBounds = {
    hound: [[-.25, 0, -.42, .25, 1.08, .53]],
    cat: [[-.32, 0, -.69, .33, 1.04, .60], [-.20, .14, -1.08, .20, .87, -.65]],
    watercolor: [[-.18, 0, -.43, .21, 1.03, .57], [-.19, .40, -.63, .19, 1.02, -.40]]
  };
  const HOUND_CLEARANCE = .64;

  function flightBoxes(kind, position, yaw, scale) {
    const sin = Math.sin(yaw), cos = Math.cos(yaw);
    return bodyBounds[kind].map(([x0, y0, z0, x1, y1, z1]) => {
      const xs = [], zs = [];
      for (const x of [x0 * scale.x, x1 * scale.x]) for (const z of [z0 * scale.z, z1 * scale.z]) {
        xs.push(x * cos + z * sin);
        zs.push(z * cos - x * sin);
      }
      return {
        min: { x: position.x + Math.min(...xs), y: position.y + y0 * scale.y, z: position.z + Math.min(...zs) },
        max: { x: position.x + Math.max(...xs), y: position.y + y1 * scale.y, z: position.z + Math.max(...zs) }
      };
    });
  }
  const shapes = {
    cat: [[0, .43, -.15, .21, .26, .46], [0, .72, .37, .24, .28, .22],
      [-.11, .22, .28, .075, .23, .13], [.11, .22, .28, .075, .23, .13],
      [-.13, .21, -.43, .095, .22, .13], [.13, .21, -.43, .095, .22, .13]],
    watercolor: [[0, .50, -.02, .18, .30, .39], [.025, .77, .37, .18, .25, .20],
      [-.075, .23, .29, .075, .24, .14], [.09, .23, .29, .075, .24, .14],
      [-.09, .22, -.28, .08, .23, .16], [.11, .22, -.23, .08, .23, .16],
      [-.04, .76, -.49, .12, .25, .13]],
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

  // Center of the orange strip on the hound head, local to its rig bone.
  const HOUND_HEAD_MARK = { x: 0, y: .0645, z: .045 };
  const HOUND_HEAD_REST_Y = .91;
  const HOUND_HEAD_REST_Z = .61;
  const HOUND_RIG_MIN_Y = -.11172;
  const HOUND_RIG_HEIGHT = 1.66072;
  const HOUND_MARK_Y = (HOUND_HEAD_REST_Y + HOUND_HEAD_MARK.y - HOUND_RIG_MIN_Y) / HOUND_RIG_HEIGHT;
  const HOUND_MARK_Z = (HOUND_HEAD_REST_Z + HOUND_HEAD_MARK.z) / HOUND_RIG_HEIGHT;

  function weakPointRadius(height) {
    return Math.max(.85, height * .054);
  }

  function weakPoint(boss) {
    if (boss.kind !== 'hound' || boss.parentId || boss.phase !== 'active') return null;
    const height = boss.height || HEIGHT;
    const stretch = boss.weakStretch || 0;
    const forward = height * HOUND_MARK_Z * (1 + stretch);
    return { x: boss.x + Math.sin(boss.yaw) * forward, y: boss.y + height * HOUND_MARK_Y * (1 - stretch),
      z: boss.z + Math.cos(boss.yaw) * forward, radius: weakPointRadius(height) };
  }

  function seesWeakPoint(point, eye, poseMargin = 0) {
    return !!point && eye.y - point.y >= .08 - poseMargin && eye.y - point.y <= 18 + poseMargin &&
      Math.hypot(eye.x - point.x, eye.z - point.z) <= 6 + poseMargin;
  }

  function weakRayDistance(point, origin, dir, range, radius = point?.radius, poseMargin = 0) {
    if (!seesWeakPoint(point, origin, poseMargin) || dir.y >= 0) return null;
    const x = point.x - origin.x, y = point.y - origin.y, z = point.z - origin.z;
    const hit = x * dir.x + y * dir.y + z * dir.z;
    if (hit <= 0 || hit >= range) return null;
    return Math.hypot(x - dir.x * hit, y - dir.y * hit, z - dir.z * hit) <= radius ? hit : null;
  }

  function splitProgress(birth, now) {
    const t = Math.max(0, Math.min(1, (now - birth.at) / SPLIT_ANIMATION_MS));
    return t * t * (3 - 2 * t);
  }

  function splitStretch(birth, now) {
    return birth ? .085 * Math.sin(Math.PI * splitProgress(birth, now)) : 0;
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

  const rules = { HEIGHT, TEAM_SIZE, TEAM_WINDOW_MS, GROWTH_MS, MAX_STAGE, SPLIT_TIMES, SMALL_HEIGHT, STOMP_RADIUS, BOSS_NAMES, rayDistance, SPLIT_ANIMATION_MS, PORT_DRONE_CEILING,
    HOUND_CLEARANCE, flightBoxes, HOUND_HEAD_MARK, weakPoint, seesWeakPoint, weakPointRadius, weakRayDistance,
    splitProgress, splitStretch, splitPosition };
  if (typeof module === 'object' && module.exports) module.exports = rules;
  else root.SaltPortalBossRules = rules;
})(globalThis);
