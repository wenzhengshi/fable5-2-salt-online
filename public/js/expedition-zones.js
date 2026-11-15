(function (root) {
  'use strict';
  const qingyun = typeof module === 'object' && module.exports ? require('./qingyun-zone') : root.SaltQingyunZone;
  // Three doorways across the flat stone forecourt, clear of the port return rift.
  const definitions = [
    ['bayhaven', 'expedition.maps.bayhaven', -8000, [-3200, 3200, -3520, 1279], [-24, 40.5], [-3.7, -5.5, 1.5], 0xff78a4, [-3.7, -8, 1.5]],
    ['dustfall', 'expedition.maps.dustfall', -16000, [-695, 695, -695, 695], [0, 0], [0, -5.5, 1.5], 0xffae52, [0, -8, 1.5]],
    ['mothlight', 'expedition.maps.mothlight', -20000, [-340, 340, -340, 340], [0, 38], [3.7, -5.5, 1.5], 0x56e5ff, [3.7, -8, 1.5]]
  ];
  const maps = Object.fromEntries(definitions.map(([id, titleKey, offset, edges, start, entrance, color, hub]) => {
    const [minX, maxX, minZ, maxZ] = edges;
    return [id, {
      id, titleKey, offset, color, minX, maxX, minZ: minZ + offset, maxZ: maxZ + offset,
      gate: { x: entrance[0], z: qingyun.offsetZ + entrance[1], y: entrance[2] },
      landing: { x: start[0], z: start[1] + offset, y: id === 'dustfall' ? 16 : 0 },
      exit: { x: start[0], z: start[1] + offset + 4 },
      hub: { x: hub[0], z: qingyun.offsetZ + hub[1], y: hub[2] }
    }];
  }));
  function near(position, gate, margin = 0) {
    return Math.abs(position.x - gate.x) <= 1.35 + margin &&
      Math.abs(position.z - gate.z) <= .85 + margin &&
      (gate.y === undefined || Math.abs(position.y - gate.y) <= 2.5 + margin);
  }
  const api = { maps, near };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SaltExpeditionZones = api;
})(globalThis);
