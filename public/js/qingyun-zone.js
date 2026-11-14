/* Shared by the browser and the multiplayer server. Coordinates are translated along Z
 * to keep the two worlds apart without changing Qingyun's scale or local geometry. */
(function (root) {
  'use strict';
  const offsetZ = -600;
  const zone = {
    offsetZ,
    bounds: { minX: -175, maxX: 175, minZ: offsetZ - 120, maxZ: offsetZ + 228 },
    gate: { x: 28.1, y: 1.45, z: 24.7 },
    landing: { x: 0, y: 7.1, z: offsetZ - 35.05 },
    hubReturnGate: { x: 0, y: 7.1, z: offsetZ - 36.3 },
    returnGate: { x: -12, y: 3.37, z: offsetZ - 14 },
    mainReturnGate: { x: 0, y: 1.5, z: offsetZ - 1.8 },
    returnLanding: { x: 28.1, y: 0, z: 27.1 },
    spawns: [
      { x: -6.8, y: 7.1, z: offsetZ - 36.8 },
      { x: 6.8, y: 7.1, z: offsetZ - 36.8 },
      { x: 0, y: 1.5, z: offsetZ + 3.8 },
      { x: 0, y: 1.5, z: offsetZ - 4.2 }
    ],
    contains(pos) {
      return !!pos && pos.z < -300;
    },
    atReturnGate(pos, margin = 0) {
      return [zone.returnGate, zone.mainReturnGate, zone.hubReturnGate].some(gate =>
        Math.abs(pos.x - gate.x) < 1.16 + margin &&
        Math.abs(pos.z - gate.z) < .6 + margin &&
        pos.y >= gate.y - .6 - margin && pos.y < gate.y + 2.8 + margin);
    },
    atGate(pos, margin = 0) {
      return Math.abs(pos.x - zone.gate.x) < 1.25 + margin &&
        Math.abs(pos.z - zone.gate.z) < .55 + margin &&
        pos.y >= -.35 - margin && pos.y < 2.8 + margin;
    }
  };
  if (typeof module === 'object' && module.exports) module.exports = zone;
  else root.SaltQingyunZone = zone;
})(globalThis);
