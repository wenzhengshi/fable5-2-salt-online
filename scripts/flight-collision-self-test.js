'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { resolve, sweep, clampToBounds } = require('../public/js/flight-collision');
const { flightBoxes } = require('../public/js/portal-boss-rules');

const gameSource = fs.readFileSync(path.resolve(__dirname, '../public/js/game.bundle.js'), 'utf8');
assert.match(
  gameSource,
  /colliders:re,tris:t\.tris,name:"KITTIWAKE"/,
  '大型货船必须继续向物理系统暴露船体碰撞盒'
);

const settings = {
  radius: 0.72,
  bottom: 0.12,
  top: 1.2,
  maxIterations: 6
};

const thinWall = { min: { x: 0, y: 0, z: -5 }, max: { x: .05, y: 10, z: 5 } };
const wallSlide = sweep({ x: 6, y: 3, z: 3 }, [thinWall], {
  ...settings, previous: { x: -6, y: 3, z: 0 }
});
assert.ok(wallSlide.hitWall && wallSlide.x < -.72 && wallSlide.z > 2.99);
for (const kind of ['cat', 'hound']) {
  const bodies = flightBoxes(kind, { x: 0, y: 0, z: 0 }, .84, { x: 20, y: 20, z: 20 });
  const side = sweep({ x: 35, y: 10, z: 0 }, bodies, { ...settings, previous: { x: -35, y: 10, z: 0 } });
  assert.ok(side.hitWall && side.x < 0, kind);
  const top = sweep({ x: 0, y: 14, z: 0 }, bodies, { ...settings, previous: { x: 0, y: 26, z: 0 } });
  assert.ok(top.blockedDown && top.y > 20, kind);
  const grewAroundPlayer = sweep({ x: 0, y: 1.1, z: 0 }, bodies, {
    ...settings, minY: 1.05, previous: { x: 0, y: 1.1, z: 0 }
  });
  assert.ok(grewAroundPlayer.hitWall && grewAroundPlayer.y >= 1.05, kind);
}

const hull = {
  min: { x: 33, y: -5, z: -90 },
  max: { x: 49, y: 15, z: -17.5 },
  surface: 'metal',
  tag: 'backdrop'
};
const superstructure = {
  min: { x: 37.7, y: 13, z: -13 },
  max: { x: 44.3, y: 24.4, z: -9.3 },
  surface: 'metal',
  tag: 'backdrop'
};
const visualEnvelope = {
  min: { x: 28.88, y: -0.01, z: -82.34 },
  max: { x: 49.15, y: 35.26, z: -8.94 },
  surface: 'metal',
  tag: 'large-ship-flight-guard'
};

const landing = resolve(
  { x: 41, y: 14, z: -20 },
  [hull],
  { ...settings, previous: { x: 41, y: 18, z: -20 } }
);
assert.equal(landing.blockedDown, true, '从上方下降时必须落在船体表面');
assert.ok(landing.y >= 14.879, '无人机底部必须位于船体顶面之上');

const ceiling = resolve(
  { x: 41, y: 13.2, z: -11 },
  [superstructure],
  { ...settings, previous: { x: 41, y: 11, z: -11 } }
);
assert.equal(ceiling.blockedUp, true, '从下方上升时必须被船楼底面挡住');
assert.ok(ceiling.y <= 11.801, '无人机顶部不得进入船楼内部');

const wall = resolve(
  { x: 32.8, y: 8, z: -20 },
  [hull],
  { ...settings, previous: { x: 31.2, y: 8, z: -20 } }
);
assert.equal(wall.hitWall, true, '横向飞行必须被船壳挡住');
assert.ok(wall.x <= 32.281, '无人机碰撞半径不得进入船壳');

const bow = resolve(
  { x: 34, y: 10, z: -77 },
  [visualEnvelope],
  { ...settings, previous: { x: 28, y: 10, z: -77 } }
);
assert.equal(bow.hit, true, '船首超出旧碰撞盒的区域也必须被整船包络挡住');

const mast = resolve(
  { x: 40.5, y: 25, z: -57 },
  [visualEnvelope],
  { ...settings, previous: { x: 40.5, y: 36, z: -57 } }
);
assert.equal(mast.blockedDown, true, '高处桅杆区域必须有飞行碰撞');

const clear = resolve(
  { x: 41, y: 27, z: -20 },
  [hull, superstructure],
  { ...settings, previous: { x: 41, y: 27, z: -20 } }
);
assert.equal(clear.hit, false, '船体上方的净空区域必须可以飞行');

const bulletOnly = resolve(
  { x: 41, y: 8, z: -20 },
  [{ ...hull, bulletOnly: true }],
  settings
);
assert.equal(bulletOnly.hit, false, '仅子弹碰撞盒不得阻挡飞行单位');

const airWall = clampToBounds(
  { x: 73, y: 12, z: -48 },
  { minX: -40, maxX: 40, minZ: -30, maxZ: 30 },
  0.4
);
assert.equal(airWall.x, 39.6, '无人机向东不得越过旧空气墙');
assert.equal(airWall.z, -29.6, '无人机向南不得越过旧空气墙');
assert.equal(airWall.clampedX, true);
assert.equal(airWall.clampedZ, true);

console.log(JSON.stringify({
  ok: true,
  landingY: Number(landing.y.toFixed(3)),
  ceilingY: Number(ceiling.y.toFixed(3)),
  wallX: Number(wall.x.toFixed(3)),
  cases: [
    'hull-top',
    'superstructure-underside',
    'hull-side',
    'visual-bow',
    'high-mast',
    'legacy-air-wall',
    'clearance',
    'bullet-only'
  ]
}, null, 2));
