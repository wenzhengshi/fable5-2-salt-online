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
    const side = Math.sign(seats[index]?.x) || 1;
    const other = -side;
    // The first four spots match the original door positions. The rest are
    // shoulder/fore-aft fallbacks so a car parked beside a rock or slope still
    // has a reachable exit without asking the player to reverse again.
    return [
      [side * 1.95, .35], [side * 1.95, -.88],
      [other * 1.95, .35], [other * 1.95, -.88],
      [side * 2.35, 1.45], [side * 2.35, -1.75],
      [other * 2.35, 1.45], [other * 2.35, -1.75],
      [0, -3.35], [0, 3.35],
      [side * 2.05, 2.2], [other * 2.05, 2.2]
    ];
  };
  const maxSpeed = 22;
  const maxReverse = 9;
  const boardSpeed = 2;
  const exitSpeed = 1.8;
  const parkSpeed = .32;
  const wheelBase = 2.7;
  const steerMax = .56;
  const steerHigh = .27;
  const halfWidth = .99;
  const halfLength = 2.45;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const angle = value => Math.atan2(Math.sin(value), Math.cos(value));
  const bounds = map => map === 'qingyun' ? zone.bounds : maps[map] || portBounds;

  // Shared by the browser and the self-tests. A released throttle is an
  // intentional parking brake: the car sheds speed quickly instead of rolling
  // on for several seconds while the exit prompt says "stop first".
  function stepSpeed(speed, throttle, brake, dt, parking = false) {
    const input = clamp(Number(throttle) || 0, -1, 1);
    const target = brake || parking ? 0 : input > 0 ? input * maxSpeed : input < 0 ? input * maxReverse : 0;
    const braking = brake || parking;
    const opposing = (speed > .05 && input < -.05) || (speed < -.05 && input > .05);
    let rate;
    if (braking) rate = 34;
    else if (opposing && Math.abs(input) > .05) rate = 30;
    else if (Math.abs(input) <= .05) rate = 9.5;
    else if (Math.abs(target) > Math.abs(speed) && Math.sign(target) === Math.sign(speed)) {
      rate = target > 0 ? 12 : 9.5;
    } else rate = 15;
    let next = speed + clamp(target - speed, -rate * dt, rate * dt);
    if (!braking && Math.abs(input) <= .05 && Math.abs(next) < .12) next = 0;
    return clamp(next, -maxReverse, maxSpeed);
  }

  function steerLimit(speed) {
    const ratio = Math.min(1, Math.abs(speed) / maxSpeed);
    return steerMax - (steerMax - steerHigh) * Math.sqrt(ratio);
  }

  function turnRate(steering, speed) {
    const assist = 1 + Math.max(0, 1 - Math.abs(speed) / 4) * .2;
    return Math.tan(steering) / wheelBase * speed * assist;
  }

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
  function raceGate(map) {
    const exit = maps[map]?.exit;
    if (exit) return { x: exit.x + 3.5, z: exit.z, y: maps[map].landing.y };
    if (map === 'qingyun') return { x: -7.4, z: zone.offsetZ - 5.5, y: 1.5 };
    return { ...zone.gate, x: zone.gate.x + 3.5 };
  }
  function atRaceGate(car) {
    const gate = raceGate(car.map);
    const nose = point(car, 0, 0, car.speed < -.3 ? -halfLength : halfLength);
    return Math.abs(gate.y - car.y) < 4 &&
      Math.min(Math.hypot(car.x - gate.x, car.z - gate.z), Math.hypot(nose.x - gate.x, nose.z - gate.z)) < 1.85;
  }
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
  // The driving HUD belongs on the ground only. Portal drops, high falls,
  // airborne transport and the car's own arrival animation hide the whole
  // brake / leave panel instead of leaving inert buttons on screen.
  function hudVisible({ present = false, alive = true, airborne = false, portalFall = false, carFall = false } = {}) {
    return !!present && !!alive && !airborne && !portalFall && !carFall;
  }
  function create() {
    return { ...start, speed: 0, seats: seats.map(() => null), revision: 0 };
  }
  const api = {
    start, seats, maxSpeed, maxReverse, boardSpeed, exitSpeed, parkSpeed,
    wheelBase, steerMax, steerHigh, halfWidth, halfLength,
    angle, clamp, point, seat, exits, inside, near, hudVisible, portal, raceGate, atRaceGate, create,
    stepSpeed, steerLimit, turnRate
  };
  if (node) module.exports = api;
  else root.SaltSedanRules = api;
})(globalThis);
