(function (root, factory) {
  const node = typeof module === 'object' && module.exports;
  const rules = factory(node ? require('./arsenal-rules') : root.SaltArsenalRules,
    node ? require('./expedition-zones') : root.SaltExpeditionZones);
  if (typeof module === 'object' && module.exports) module.exports = rules;
  else root.SaltFrontierRules = rules;
})(globalThis, function (arsenal, zones) {
  'use strict';
  const map = 'dustfall';
  const offset = -16000;
  const bounds = zones.maps[map];
  const insertion = Object.freeze({
    routeStart: bounds.minX + 24,
    routeEnd: bounds.maxX - 24,
    planeSpeed: 32,
    flightHeight: 270,
    canopyHeight: 155,
    glideSpeed: 20,
    glideSink: 10.5,
    fallSpeed: 22,
    fallSink: 48,
    radius: 360
  });
  const weaponKinds = Object.freeze(Object.fromEntries(Object.keys(arsenal).map(id => [id === 'pac9' ? 'rifle' : id, id])));
  const limits = Object.freeze({ ...Object.fromEntries(Object.keys(weaponKinds).map(kind => [kind, 1])), helmet: 75, vest: 100, grenade: 4, drink: 4, medkit: 3, quiet: 3 });
  const consumables = ['grenade', 'drink', 'medkit', 'quiet'];
  const capacity = 8;
  function canEquip(inventory, id, mapId) {
    return id === 'pac9' ? mapId !== map || !!inventory.rifle :
      Object.hasOwn(weaponKinds, id) && id !== 'rifle' && !!inventory[id];
  }
  const usedSlots = inventory => consumables.reduce((total, kind) => total + inventory[kind], 0);
  function pickupIssue(inventory, kind, used = usedSlots(inventory)) {
    if (!Object.hasOwn(limits, kind) || inventory[kind] >= limits[kind]) return 'itemLimit';
    return consumables.includes(kind) && used >= capacity ? 'bagFull' : null;
  }
  const loot = new Map();
  const layout = [
    [-15, -4, 'rifle'], [15, 4, 'rifle'], [-28, 4, 'vest'], [27, -4, 'helmet'],
    [-35, -4, 'grenade'], [34, 4, 'quiet'], [-45, 4, 'medkit'], [44, -4, 'drink'],
    [-52, -4, 'helmet'], [51, 4, 'vest'], [-60, 4, 'quiet'], [58, -4, 'grenade'],
    [-68, -4, 'rifle'], [65, 4, 'rifle'], [-76, 4, 'drink'], [73, -4, 'medkit'],
    [-83, -4, 'grenade'], [81, 4, 'quiet'], [-92, 4, 'medkit'], [91, -4, 'drink'],
    [-18, -1.6, 'mp5'], [18, 1.6, 'mp7'], [-38, 1.6, 'm4a1'], [38, -1.6, 'm110'],
    [-62, -1.6, 'm249'], [62, 1.6, 'm1014'], [-87, 1.6, 'm9a1'], [87, -1.6, 'knife'],
    [21, -1.6, 'mp5'], [-21, 1.6, 'mp7'], [41, 1.6, 'm4a1'], [-41, -1.6, 'm110'],
    [64, -1.6, 'm249'], [-64, 1.6, 'm1014'], [89, 1.6, 'm9a1'], [-89, -1.6, 'knife']
  ];
  layout.forEach(([x, z, kind], i) => loot.set(i + 1, Object.freeze({ id: i + 1, x, y: 16, z: z + offset, kind })));
  const normalize = value => Object.fromEntries(Object.entries(limits).map(([kind, max]) => {
    return [kind, Math.max(0, Math.min(max, Math.floor(Number(value?.[kind])) || 0))];
  }));
  function collect(inventory, kind) {
    if (pickupIssue(inventory, kind)) return false;
    inventory[kind] = consumables.includes(kind) ? inventory[kind] + 1 : limits[kind];
    return true;
  }
  function absorb(inventory, damage, kind) {
    if (!['helmet', 'vest'].includes(kind) || !inventory[kind] || damage <= 1) return damage;
    const absorbed = Math.min(inventory[kind], Math.floor(damage * (kind === 'helmet' ? .5 : .4)));
    inventory[kind] -= absorbed;
    return damage - absorbed;
  }
  function equipmentFlags(inventory) {
    return (inventory.helmet > 0 ? 1 : 0) | (inventory.vest > 0 ? 2 : 0);
  }
  // The ridges at the map edges rise above the old town landing ceiling.
  function validLanding(anchor, point) {
    return point && [point.x, point.y, point.z].every(Number.isFinite) &&
      point.x >= bounds.minX && point.x <= bounds.maxX && point.z >= bounds.minZ && point.z <= bounds.maxZ &&
      Math.abs(point.z - anchor.z) <= insertion.radius + 1 && point.y >= -5 && point.y <= 210;
  }
  return Object.freeze({ map, offset, bounds, insertion, limits, loot, capacity, weaponKinds, canEquip, usedSlots, pickupIssue, normalize, collect, absorb, equipmentFlags, validLanding, consumables,
    throwWindup: 350, quietRadius: 32, quietSeconds: 20, replenishMs: 45000, dropMinMs: 4500, dropMaxMs: 90000 });
});
