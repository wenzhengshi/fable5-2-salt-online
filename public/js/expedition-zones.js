(function (root) {
  'use strict';
  const qingyun = typeof module === 'object' && module.exports ? require('./qingyun-zone') : root.SaltQingyunZone;
  // Three doorways across the flat stone forecourt, clear of the port return rift.
  const definitions = [
    ['bayhaven', 'expedition.maps.bayhaven', -8000, [-3200, 3200, -3520, 1279], [-24, 40.5], [-3.7, -5.5, 1.5], 0xff78a4, [-3.7, -8, 1.5]],
    ['dustfall', 'expedition.maps.dustfall', -16000, [-695, 695, -695, 695], [0, 0], [0, -5.5, 1.5], 0xffae52, [0, -8, 1.5]],
    ['mothlight', 'expedition.maps.mothlight', -20000, [-340, 340, -340, 340], [0, 38], [3.7, -5.5, 1.5], 0x56e5ff, [3.7, -8, 1.5]]
  ];
  // Offsets from each arrival point. Keep the central path and return rift clear.
  const respawnOffsets = [[-8, 0], [8, 0], [-8, 4], [8, 4], [-8, 8], [8, 8], [0, -6], [0, 10]];
  const maps = Object.fromEntries(definitions.map(([id, titleKey, offset, edges, start, entrance, color, hub]) => {
    const [minX, maxX, minZ, maxZ] = edges;
    const landing = { x: start[0], z: start[1] + offset, y: id === 'dustfall' ? 16 : 0 };
    const respawns = respawnOffsets.map(([x, z]) => ({
      x: landing.x + x,
      z: landing.z + z,
      y: id === 'bayhaven' ? (z === 4 || z === 8 ? .14 : z === 10 ? .02 : 0) : landing.y
    }));
    return [id, {
      id, titleKey, offset, color, minX, maxX, minZ: minZ + offset, maxZ: maxZ + offset,
      gate: { x: entrance[0], z: qingyun.offsetZ + entrance[1], y: entrance[2] },
      landing, respawns,
      exit: { x: start[0], z: start[1] + offset + 4 },
      hub: { x: hub[0], z: qingyun.offsetZ + hub[1], y: hub[2] }
    }];
  }));
  function near(position, gate, margin = 0) {
    return Math.abs(position.x - gate.x) <= 1.35 + margin &&
      Math.abs(position.z - gate.z) <= .85 + margin &&
      (gate.y === undefined || Math.abs(position.y - gate.y) <= 2.5 + margin);
  }
  function pickRespawn(map, previous, nearbyPlayers = []) {
    let bestClearance = -1;
    let options = [];
    for (const point of map.respawns) {
      if (point === previous) continue;
      // Treat all spots with at least eight metres of clearance as equally suitable.
      let clearance = 64;
      for (const player of nearbyPlayers) {
        const dx = point.x - player.x;
        const dz = point.z - player.z;
        clearance = Math.min(clearance, dx * dx + dz * dz);
      }
      if (clearance > bestClearance) {
        options = [point];
        bestClearance = clearance;
      } else if (clearance === bestClearance) options.push(point);
    }
    return options[Math.floor(Math.random() * options.length)] || map.landing;
  }

  const api = { maps, near, pickRespawn };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SaltExpeditionZones = api;
})(globalThis);
