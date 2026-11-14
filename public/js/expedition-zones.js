(function (root) {
  'use strict';
  const definitions = [
    ['bayhaven', '湾城', -8000, [-3200, 3200, -3520, 1279], [-24, 40.5], [17, 25], 0xff78a4],
    ['dustfall', '西部荒原', -16000, [-695, 695, -695, 695], [0, 0], [24, 25], 0xffae52],
    ['mothlight', '霓虹雨城', -20000, [-340, 340, -340, 340], [0, 38], [7, 25], 0x56e5ff]
  ];
  const maps = Object.fromEntries(definitions.map(([id, title, offset, edges, start, port, color]) => {
    const [minX, maxX, minZ, maxZ] = edges;
    return [id, {
      id, title, offset, color, minX, maxX, minZ: minZ + offset, maxZ: maxZ + offset,
      gate: { x: port[0], z: port[1], y: 0, sideways: true },
      landing: { x: start[0], z: start[1] + offset, y: id === 'dustfall' ? 16 : 0 },
      exit: { x: start[0], z: start[1] + offset + 4 },
      port: { x: port[0] + (id === 'dustfall' ? 2.2 : 3), z: port[1], y: 0 }
    }];
  }));
  function near(position, gate, margin = 0) {
    return Math.abs(position.x - gate.x) <= (gate.sideways ? .85 : 1.35) + margin &&
      Math.abs(position.z - gate.z) <= (gate.sideways ? 1.35 : .85) + margin &&
      (gate.y === undefined || Math.abs(position.y - gate.y) <= 2.5 + margin);
  }
  const api = { maps, near };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SaltExpeditionZones = api;
})(globalThis);
