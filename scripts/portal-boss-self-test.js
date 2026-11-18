'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'salt-portal-bosses-'));
process.env.DATA_DIR = dataDir;
const storage = require('../config/storage');
const { createPortalBosses, houndPathClear } = require('../services/portalBosses');
const { maps } = require('../public/js/expedition-zones');
const { rayDistance, weakPoint, seesWeakPoint, weakRayDistance, splitStretch, splitPosition, SPLIT_ANIMATION_MS } = require('../public/js/portal-boss-rules');
const { pac9 } = require('../public/js/arsenal-rules');

const player = id => ({ id, map: 'dustfall', active: true, alive: true, joined: true, ws: { readyState: 1 } });
const shooter = player('shooter');
const bystander = player('bystander');
const teammate = player('teammate');
const outsider = { ...player('outsider'), map: 'port' };
const hits = [];
const stomped = [];
const bullets = [];
const volleys = [];
const bursts = [];
const make = () => createPortalBosses({
  mapKey: person => person.map,
  players: () => [shooter, bystander, outsider, teammate],
  send: (_, msg) => hits.push(msg),
  explode: (map, positions) => bursts.push({ map, positions }),
  fire: (boss, shot) => volleys.push({ id: boss.id, map: boss.map, ...shot }),
  damage: (target, boss, amount, now, origin) => (origin ? bullets : stomped).push({ id: target.id, boss: boss.id, amount })
});
const catOf = boss => boss.snapshot('dustfall').find(item => item.kind === 'cat');
const at = (boss, x, z, y = 0) => ({ x: boss.x + x, y: boss.y + y, z: boss.z + z });
function shoot(boss, target, y, now, person = shooter, x = 0, weapon = pac9) {
  const origin = at(target, x, -9, 1.4);
  person.pos = { ...origin, y: origin.y - 1.4 };
  const length = Math.hypot(x, 9, y - 1.4);
  const dir = { x: -x / length, y: (y - 1.4) / length, z: 9 / length };
  assert.ok(rayDistance(target, origin, dir, pac9.range) !== null);
  return boss.shot(person, origin, dir, weapon, now);
}

try {
  let world = make();
  for (const map of ['port', 'qingyun', ...Object.keys(maps)]) {
    const resident = world.snapshot(map);
    assert.equal(resident.filter(boss => boss.kind === 'hound').length, 1);
    assert.ok(resident.every(boss => boss.phase === 'idle'));
  }
  const home = catOf(world);
  teammate.pos = at(home, 35, 10);
  assert.equal(home.phase, 'idle');
  assert.equal(world.snapshot('dustfall').length, 3);
  shooter.pos = at(home, 0, -9);
  bystander.pos = at(home, 0, -11);
  outsider.pos = at(home, 0, 1);
  world.tick(1000);
  assert.equal(catOf(world).phase, 'idle');
  assert.notEqual(catOf(world).x, home.x);
  assert.equal(world.shot(shooter, shooter.pos, { x: 0, y: .5, z: .866 }, pac9, 1000), false);
  assert.equal(shoot(world, catOf(world), .24, 1100), true);
  const awakened = catOf(world);
  assert.equal(awakened.phase, 'active');
  assert.equal(awakened.hp, home.maxHp - pac9.damage);
  assert.equal(hits.at(-1).hp, awakened.hp);
  assert.equal(make().snapshot('dustfall')[0].hp, awakened.hp);
  assert.equal(world.snapshot('port')[0].phase, 'idle');

  const firstMove = catOf(world);
  for (let now = 1200; now < 4100; now += 100) {
    const cat = catOf(world);
    if (cat.attack) {
      shooter.pos = at(cat.attack, 12, 0);
      bystander.pos = { x: cat.attack.x, z: cat.attack.z, y: cat.attack.y };
      outsider.pos = { ...bystander.pos };
    }
    world.tick(now);
  }
  assert.ok(Math.hypot(catOf(world).x - firstMove.x, catOf(world).z - firstMove.z) > .1);
  assert.ok(stomped.some(hit => hit.id === bystander.id && hit.amount === 38));
  assert.ok(!stomped.some(hit => hit.id === outsider.id));
  assert.ok(!stomped.some(hit => hit.id === shooter.id));

  const hound = world.snapshot('dustfall').find(item => item.kind === 'hound');
  bystander.pos = at(hound, 25, 10);
  assert.equal(shoot(world, hound, .54, 4200), true);
  assert.equal(world.snapshot('dustfall').find(item => item.kind === 'hound').hp, 3000 - pac9.damage);

  function seed(hp, elapsed = 0) {
    storage.updateJson('portal-bosses.json', saved => ({ ...saved, [hound.id]: null,
      [home.id]: { phase: 'active', x: home.x, y: home.y, z: home.z, yaw: home.yaw, hp, elapsed }
    }));
    return make();
  }

  world = seed(500);
  assert.equal(shoot(world, catOf(world), 8.5, 4300), true);
  assert.equal(hits.at(-1).damage, 20);
  assert.equal(catOf(world).hp, 480);
  assert.equal(shoot(world, catOf(world), 8.5, 4400), true);
  assert.ok(hits.at(-1).teamBlocked);
  bystander.pos = at(home, 4, -9);
  assert.equal(shoot(world, catOf(world), 8.5, 4500, bystander, 4), true);
  assert.ok(hits.at(-1).teamBlocked);
  assert.equal(shoot(world, catOf(world), 8.5, 4600, teammate, -4), true);
  assert.equal(hits.at(-1).damage, 68);
  assert.equal(catOf(world).hp, 412);

  // Contribution from an expired hit or another map never breaks the shield.
  world = seed(480);
  assert.equal(shoot(world, catOf(world), 8.5, 5000), true);
  assert.equal(shoot(world, catOf(world), 8.5, 5100, bystander, 4), true);
  assert.equal(shoot(world, catOf(world), 8.5, 17300, teammate, -4), true);
  assert.ok(hits.at(-1).teamBlocked);
  assert.equal(shoot(world, catOf(world), 8.5, 17400), true);
  assert.ok(hits.at(-1).teamBlocked);
  assert.equal(shoot(world, catOf(world), 8.5, 17500, bystander, 4), true);
  for (let now = 17600; catOf(world).phase === 'active' && now < 18500; now += 100) {
    assert.equal(shoot(world, catOf(world), 8.5, now), true);
  }
  assert.deepEqual(catOf(world), home);
  assert.equal(hits.at(-1).killed, true);
  assert.equal(catOf(make()).phase, 'idle');
  world = seed(2400);
  assert.equal(shoot(world, catOf(world), 8.5, 20000), true);
  assert.equal(shoot(world, catOf(world), 8.5, 20100, bystander, 4), true);
  assert.equal(hits.at(-1).damage, 46);

  world = seed(2000, 59950);
  shooter.pos = at(home, 0, -6);
  bystander.pos = at(home, 30, -8);
  teammate.pos = at(home, 32, -8);
  world.tick(30000);
  const big = catOf(world);
  assert.equal(big.height, 26);
  assert.equal(big.attack.damage, 53);
  assert.ok(big.attack.radius > 3.2);
  const restored = make();
  assert.equal(catOf(restored).height, 26);
  const split = restored.snapshot('dustfall').find(item => item.parentId === home.id);
  assert.equal(split.height, 10);
  assert.equal(split.hp, 600);
  assert.equal(world.snapshot('port').length, 1);
  const beforePause = big.elapsed;
  for (const person of [shooter, bystander, teammate]) person.active = false;
  world.tick(30100);
  assert.equal(catOf(world).elapsed, beforePause);
  for (const person of [shooter, bystander, teammate]) person.active = true;
  shooter.pos = at(home, 0, -6);
  storage.updateJson('portal-bosses.json', saved => ({ ...saved, [home.id]: { ...saved[home.id], elapsed: 119950 } }));
  world = make();
  world.tick(40000);
  assert.equal(catOf(world).height, 32);
  assert.equal(world.snapshot('dustfall').filter(item => item.parentId === home.id).length, 2);
  const siblings = world.snapshot('dustfall').filter(item => item.parentId === home.id);
  storage.updateJson('portal-bosses.json', saved => {
    const root = saved[home.id];
    const child = root.children[1];
    return { ...saved, [home.id]: { ...root, hp: 68, children: {
      ...root.children, 1: { ...child, x: home.x - 27, z: home.z, hp: 15 }
    } } };
  });
  world = make();
  const weakChild = world.snapshot('dustfall').find(item => item.id === siblings[0].id);
  assert.equal(shoot(world, weakChild, 4.5, 40100), true);
  assert.equal(hits.at(-1).targetId, weakChild.id);
  assert.equal(hits.at(-1).killed, true);
  assert.ok(!make().snapshot('dustfall').some(item => item.id === weakChild.id));
  shooter.signOwner = teammate.signOwner = 'same-browser';
  assert.equal(shoot(world, catOf(world), 14, 41000), true);
  assert.equal(shoot(world, catOf(world), 14, 41100, bystander, 7), true);
  assert.equal(shoot(world, catOf(world), 14, 41200, teammate, -7), true);
  assert.ok(hits.at(-1).teamBlocked);
  teammate.signOwner = 'third-browser';
  assert.equal(shoot(world, catOf(world), 14, 41300, teammate, -7), true);
  assert.equal(hits.at(-1).killed, true);
  assert.equal(catOf(world).phase, 'idle');
  assert.equal(world.snapshot('dustfall').filter(item => item.parentId).length, 0);
  assert.equal(catOf(make()).phase, 'idle');
  world = seed(2400);
  shooter.pos = at(home, 0, -30);
  bystander.active = teammate.active = false;
  outsider.pos = { ...shooter.pos };
  world.tick(50000);
  assert.equal(catOf(world).aim.windupMs, 700);
  world.tick(50699);
  assert.equal(volleys.length, 0);
  world.tick(50700);
  assert.deepEqual(bullets, [{ id: shooter.id, boss: home.id, amount: 7 }]);
  shooter.pos = at(home, 4, -30);
  world.tick(50900);
  assert.equal(volleys.length, 2);
  assert.equal(bullets.length, 1, 'A sidestep dodges the locked aim line');
  bystander.active = true;
  bystander.pos = at(home, 0, -30);
  bystander.protectedUntil = 52000;
  world.tick(51100);
  assert.equal(volleys.length, 3);
  assert.equal(bullets.length, 1, 'Spawn protection blocks Boss bullets');

  bystander.active = false;
  shooter.pos = at(home, 0, 30);
  world = seed(2400);
  world.tick(60000);
  assert.equal(catOf(world).aim, null, 'Solid cover prevents the ranged attack');
  world.tick(60800);
  assert.equal(volleys.length, 3);

  const houndArena = { x: 0, y: home.y, z: home.z - 47, yaw: 0 };
  assert.equal(houndPathClear('dustfall', home, home, 26), false, 'A grown hound cannot overlap the buildings by the gate');
  assert.equal(houndPathClear('dustfall', houndArena, houndArena, 26), true);
  assert.equal(houndPathClear('dustfall', houndArena, { ...houndArena, z: home.z }, 26), false);
  storage.updateJson('portal-bosses.json', saved => ({
    ...saved, [home.id]: null,
    [hound.id]: { phase: 'active', hp: 3000, ...houndArena }
  }));
  shooter.pos = at(houndArena, 0, -19);
  world = make();
  world.tick(70000);
  world.tick(70700);
  assert.equal(volleys.at(-1).id, hound.id);
  assert.deepEqual(bullets.at(-1), { id: shooter.id, boss: hound.id, amount: 9 });

  storage.updateJson('portal-bosses.json', saved => ({ ...saved, [home.id]: null,
    [hound.id]: { phase: 'active', hp: 600, ...houndArena, elapsed: 59950 }
  }));
  shooter.pos = at(houndArena, 0, -19);
  world = make();
  world.tick(80000);
  const formed = world.snapshot('dustfall').find(boss => boss.parentId === hound.id);
  assert.ok(formed?.birth);
  assert.equal(formed.birth.at, 80000);
  const start = splitPosition(formed, 80000);
  const end = splitPosition(formed, 80000 + SPLIT_ANIMATION_MS);
  assert.ok(Math.hypot(start.x - end.x, start.z - end.z) > 9);
  assert.equal(end.x, formed.x);
  assert.equal(end.z, formed.z);
  assert.equal(make().snapshot('dustfall').find(boss => boss.id === formed.id).birth.at, 80000);
  const bigDog = world.snapshot('dustfall').find(boss => boss.id === hound.id);
  const point = weakPoint({ ...bigDog, weakStretch: splitStretch(formed.birth, 80200) });
  assert.ok(!weakPoint(formed));
  shooter.pos = { x: point.x, y: point.y + 4, z: point.z };
  const from = { ...shooter.pos, y: shooter.pos.y + .9 };
  const down = { x: 0, y: -1, z: 0 };
  assert.ok(seesWeakPoint(point, shooter.pos));
  assert.ok(!seesWeakPoint(point, { ...shooter.pos, x: point.x + 7 }));
  assert.equal(weakRayDistance(point, from, { x: 1, y: 0, z: 0 }, 100), null);
  assert.equal(world.shot(shooter, from, down, pac9, 80100), true);
  assert.equal(hits.at(-1).teamBlocked, true, 'Infantry cannot bypass the shield from above');
  shooter.soldier = 'drone';
  assert.equal(world.shot(shooter, from, down, pac9, 80200), true);
  assert.equal(hits.at(-1).killed, true);
  assert.deepEqual(bursts[0].positions.map(pos => pos.id), [hound.id, formed.id]);
  assert.equal(bursts[0].map, 'dustfall');
  assert.ok(!world.snapshot('dustfall').some(boss => boss.parentId));
  assert.equal(make().snapshot('dustfall').find(boss => boss.id === hound.id).phase, 'idle');

  storage.writeJson('portal-bosses.json', {
    [hound.id]: { phase: 'active', hp: 600, ...houndArena, elapsed: 0 }
  });
  const runner = { ...player('runner'), pos: at(houndArena, 0, -45) };
  const movingWorld = createPortalBosses({
    mapKey: person => person.map,
    players: () => [runner, shooter],
    damage() {},
    send: (_, message) => hits.push(message)
  });
  shooter.active = false;
  movingWorld.tick(85000);
  const shownHead = weakPoint(movingWorld.snapshot('dustfall').find(boss => boss.id === hound.id));
  for (let time = 85100; time <= 85300; time += 100) movingWorld.tick(time);
  const actualDog = movingWorld.snapshot('dustfall').find(boss => boss.id === hound.id);
  shooter.active = true;
  // The client is still showing an earlier pose, with the head raised by the gait.
  shooter.pos = { x: shownHead.x + 4, y: shownHead.y + .15, z: shownHead.z };
  const shownOrigin = { ...shooter.pos, y: shooter.pos.y + 1.15 };
  const raisedHead = .45;
  const length = Math.hypot(4, 1.3 - raisedHead);
  const atDecal = { x: -4 / length, y: (raisedHead - 1.3) / length, z: 0 };
  assert.equal(weakRayDistance(weakPoint(actualDog), shownOrigin, atDecal, pac9.range), null);
  assert.equal(movingWorld.shot(shooter, shownOrigin, atDecal, pac9, 85310), true);
  assert.equal(hits.at(-1).killed, true, 'A drone can hit the head in a recent server pose');

  const portHound = world.snapshot('port').find(boss => boss.kind === 'hound');
  storage.writeJson('portal-bosses.json', {
    [portHound.id]: { phase: 'active', hp: 600, x: 23, y: 0, z: 19, yaw: Math.PI }
  });
  const portWorld = make();
  const dockDog = portWorld.snapshot('port')[0];
  const decal = weakPoint(dockDog);
  const dockEye = { x: decal.x + 5.5, y: decal.y + .42, z: decal.z };
  outsider.soldier = 'drone';
  outsider.pos = { ...dockEye, y: dockEye.y - .9 };
  const dockShot = { x: -5.5 / Math.hypot(5.5, .42), y: -.42 / Math.hypot(5.5, .42), z: 0 };
  assert.equal(portWorld.shot(outsider, dockEye, { x: -1, y: 0, z: 0 }, pac9, 85400), true);
  assert.equal(hits.at(-1).teamBlocked, true, 'A horizontal body shot still respects the shield');
  assert.equal(portWorld.shot(outsider, dockEye, dockShot, pac9, 85500), true);
  assert.equal(hits.at(-1).killed, true, 'A shallow downward shot at the yellow plate works in port');

  storage.writeJson('portal-bosses.json', {});
  world = make();
  const watercolor = service => service.snapshot('dustfall').find(boss => boss.kind === 'watercolor' && !boss.parentId);
  const smallCat = watercolor(world);
  assert.ok(smallCat);
  assert.ok(!world.snapshot('port').some(boss => boss.kind === 'watercolor'));
  assert.equal(shoot(world, smallCat, .26, 86000), true);
  const giantCat = watercolor(world);
  assert.equal(giantCat.height, 20);
  assert.equal(giantCat.hp, giantCat.maxHp - pac9.damage);
  assert.equal(catOf(world).phase, 'idle');
  assert.equal(watercolor(make()).hp, giantCat.hp);
  storage.updateJson('portal-bosses.json', state => ({
    ...state, [giantCat.id]: { ...state[giantCat.id], elapsed: 59950 }
  }));
  world = make();
  world.tick(86100);
  assert.equal(watercolor(world).height, 26);
  assert.ok(make().snapshot('dustfall').some(boss => boss.parentId === giantCat.id && boss.kind === 'watercolor'));

  for (const [map, dx, dz] of [['port', 0, -25], ['bayhaven', 0, 25], ['bayhaven', -25, 0]]) {
    storage.writeJson('portal-bosses.json', {});
    const local = make().snapshot(map).find(boss => boss.kind === 'hound');
    storage.writeJson('portal-bosses.json', {
      [local.id]: { ...local, phase: 'active', hp: local.maxHp, elapsed: 0 }
    });
    const witness = { ...player('detour'), map, pos: at(local, dx, dz) };
    const routeWorld = createPortalBosses({ mapKey: p => p.map, players: () => [witness], send() {}, damage() {} });
    let previous = routeWorld.snapshot(map)[0];
    let travelled = 0;
    for (let i = 0; i < 120; i++) {
      routeWorld.tick(90000 + 100 * i);
      const current = routeWorld.snapshot(map)[0];
      assert.ok(houndPathClear(map, previous, current, current.height), map + ': detours must avoid buildings');
      travelled += Math.hypot(current.x - previous.x, current.z - previous.z);
      previous = current;
    }
    assert.ok(travelled > 4, map + ': boss should leave a blocked line of pursuit');
  }

  console.log('Portal bosses passed: patrol, obstacle detours, shared HP, attack, damage multipliers, three-player shield, growth, splits, persistence and ranged attacks');
} finally {
  fs.rmSync(dataDir, { recursive: true, force: true });
}
