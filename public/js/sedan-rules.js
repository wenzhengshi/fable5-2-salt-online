(function (root) {
  'use strict';
  const node = typeof module === 'object' && module.exports;
  const zone = node ? require('./qingyun-zone') : root.SaltQingyunZone;
  const maps = (node ? require('./expedition-zones') : root.SaltExpeditionZones).maps;
  const start = { map: 'dustfall', x: 11, y: 16, z: maps.dustfall.landing.z + 7.8, heading: Math.PI / 2 };
  const seats = [
    { x: -.37, y: -.46, z: .15 },
    { x: .76, y: -.35, z: .34 },
    { x: -.76, y: -.35, z: -.77 },
    { x: .76, y: -.35, z: -.77 }
  ];
  const portBounds = { minX: -900, maxX: 900, minZ: -299, maxZ: 900 };
  const exits = index => {
    const side = Math.sign(seats[index].x);
    return [[side * 1.85, .25], [side * 1.85, -.88], [-side * 1.85, .25], [0, -3.15], [0, 3.15]];
  };
  const maxSpeed = 15;
  const halfWidth = .99;
  const halfLength = 2.45;
  const angle = value => Math.atan2(Math.sin(value), Math.cos(value));
  const bounds = map => map === 'qingyun' ? zone.bounds : maps[map] || portBounds;
  function point(car, x, y, z) {
    const c = Math.cos(car.heading), s = Math.sin(car.heading);
    return { x: car.x + c * x + s * z, y: car.y + y, z: car.z - s * x + c * z };
  }
  function seat(car, index) {
    const offset = seats[index];
    return point(car, offset.x, offset.y, offset.z);
  }
  function inside(car, margin = 0) {
    const b = bounds(car.map);
    const c = Math.abs(Math.cos(car.heading)), s = Math.abs(Math.sin(car.heading));
    const x = c * halfWidth + s * halfLength + margin;
    const z = s * halfWidth + c * halfLength + margin;
    return car.x >= b.minX + x && car.x <= b.maxX - x && car.z >= b.minZ + z && car.z <= b.maxZ - z;
  }
  // The lower forecourt has clearance for the entire car and sits near the map gates.
  const hubArrival = { x: 0, y: 2.4, z: zone.offsetZ - 12, heading: Math.PI / 2 };
  const portArrival = { x: 27.5, y: 0, z: 29.5, heading: Math.PI / 2 };
  const routes = [
    { from: 'port', to: 'qingyun', gate: zone.gate, arrival: hubArrival },
    ...[zone.returnGate, zone.mainReturnGate, zone.hubReturnGate].map(gate => ({
      from: 'qingyun', to: 'port', gate, arrival: portArrival
    })),
    ...Object.values(maps).flatMap(map => [
      { from: 'qingyun', to: map.id, gate: map.gate, arrival: {
        ...map.landing, x: map.landing.x + 6, z: map.landing.z + 7.8, heading: Math.PI / 2
      } },
      { from: map.id, to: 'qingyun', gate: { ...map.exit, y: map.landing.y }, arrival: hubArrival }
    ])
  ];
  function portal(car) {
    // Check the bumper as well as the centre, so the driver can pull up to the gate.
    const nose = point(car, 0, 0, car.speed < -.3 ? -halfLength : halfLength);
    return routes.filter(route => route.from === car.map && Math.abs(route.gate.y - car.y) < 4)
      .map(route => [route, Math.min(Math.hypot(route.gate.x - car.x, route.gate.z - car.z),
        Math.hypot(route.gate.x - nose.x, route.gate.z - nose.z))])
      .filter(([, distance]) => distance < 2)
      .sort((a, b) => a[1] - b[1])[0]?.[0];
  }
  function near(car, pos) {
    const dx = pos.x - car.x, dz = pos.z - car.z;
    const c = Math.cos(car.heading), s = Math.sin(car.heading);
    return Math.abs(dx * c - dz * s) <= 2.6 && Math.abs(dx * s + dz * c) <= 3.7 &&
      Math.abs(pos.y - car.y) < 1.8;
  }
  function create() {
    return { ...start, speed: 0, seats: seats.map(() => null), revision: 0 };
  }
  const api = { start, seats, maxSpeed, halfWidth, halfLength, angle, point, seat, exits, inside, near, portal, create };
  if (node) module.exports = api;
  else root.SaltSedanRules = api;
})(globalThis);
