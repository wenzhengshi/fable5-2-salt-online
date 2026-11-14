(function (root) {
  'use strict';
  const qingyun = typeof module === 'object' && module.exports ? require('./qingyun-zone') : root.SaltQingyunZone;
  const definitions = [
    ['bayhaven', '湾城', -8000, [-3200, 3200, -3520, 1279], [-24, 40.5], [3.6, -31.5], 0xff78a4],
    ['dustfall', '西部荒原', -16000, [-695, 695, -695, 695], [0, 0], [0, -31.5], 0xffae52],
    ['mothlight', '霓虹雨城', -20000, [-340, 340, -340, 340], [0, 38], [-3.6, -31.5], 0x56e5ff]
  ];
  const maps = Object.fromEntries(definitions.map(([id, title, offset, edges, start, entrance, color]) => {
    const [minX, maxX, minZ, maxZ] = edges;
    return [id, {
      id, title, offset, color, minX, maxX, minZ: minZ + offset, maxZ: maxZ + offset,
      gate: { x: entrance[0], z: qingyun.offsetZ + entrance[1], y: 6.3 },
      landing: { x: start[0], z: start[1] + offset, y: id === 'dustfall' ? 16 : 0 },
      exit: { x: start[0], z: start[1] + offset + 4 },
      hub: { ...qingyun.landing }
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
