(function (root) {
  'use strict';
  const commonJS = typeof module === 'object' && module.exports;
  const qingyun = commonJS ? require('./qingyun-zone') : root.SaltQingyunZone;
  const { maps } = commonJS ? require('./expedition-zones') : root.SaltExpeditionZones;
  const zones = { ...maps, qingyun: { id: 'qingyun', ...qingyun.bounds } };
  const entrances = Object.fromEntries(Object.values(maps).map(map => [map.id, [map.exit, map.landing]]));
  entrances.qingyun = [qingyun.landing, qingyun.returnGate, qingyun.mainReturnGate, qingyun.hubReturnGate,
    ...Object.values(maps).flatMap(map => [map.gate, map.hub])];

  function protectedSpot(map, pos) {
    return entrances[map]?.some(point => Math.hypot(point.x - pos.x, point.z - pos.z) <= 10) ?? false;
  }

  const rules = { zones, protectedSpot };
  if (commonJS) module.exports = rules;
  else root.SaltRoadSignRules = rules;
})(globalThis);
