(function (root, factory) {
  const airspace = factory();
  if (typeof module === 'object' && module.exports) module.exports = airspace;
  else root.SaltRaceAirspace = airspace;
})(globalThis, function () {
  'use strict';
  const maxSpeed = 600 / 3.6;
  const maxAltitude = 120;
  const minAltitude = .18;
  const halfWidth = 10.7;

  function fly(position, velocity, move, yaw, dt, { ascend, descend, length, boxes, collision }) {
    const previous = { x: position.x, y: position.y, z: position.z };
    const vertical = (Number(ascend) - Number(descend)) * 12;
    const speed = Math.sqrt(maxSpeed ** 2 - vertical ** 2);
    const scale = speed / Math.max(1, Math.hypot(move.x, move.y));
    const sin = Math.sin(yaw), cos = Math.cos(yaw);
    const targetX = (move.x * cos - move.y * sin) * scale;
    const targetZ = -(move.x * sin + move.y * cos) * scale;
    const changeX = targetX - velocity.x;
    const changeZ = targetZ - velocity.z;
    const acceleration = move.x || move.y ? 44 : 100;
    const step = Math.min(1, acceleration * dt / (Math.hypot(changeX, changeZ) || 1));
    const dx = (velocity.x + changeX * step) * dt;
    const dz = (velocity.z + changeZ * step) * dt;
    const cap = Math.min(1, speed * dt / (Math.hypot(dx, dz) || 1));
    const candidate = {
      x: Math.max(-halfWidth, Math.min(halfWidth, previous.x + dx * cap)),
      y: Math.max(minAltitude, Math.min(maxAltitude, previous.y + vertical * dt)),
      z: Math.max(0, Math.min(length + 19.1, previous.z + dz * cap))
    };
    const resolved = collision.sweep(candidate, boxes, {
      previous, radius: .65, bottom: .15, top: 1, minY: minAltitude, maxY: maxAltitude
    });
    position.set(
      Math.max(-halfWidth, Math.min(halfWidth, resolved.x)),
      Math.max(minAltitude, Math.min(maxAltitude, resolved.y)),
      Math.max(0, Math.min(length + 19.1, resolved.z))
    );
    velocity.set((position.x - previous.x) / dt, (position.y - previous.y) / dt, (position.z - previous.z) / dt);
    // A collision correction is not retained as thrust.
    if (Math.abs(resolved.x - candidate.x) > .001) velocity.x = 0;
    if (Math.abs(resolved.z - candidate.z) > .001) velocity.z = 0;
    return Math.min(600, Math.hypot(position.x - previous.x, position.y - previous.y, position.z - previous.z) / dt * 3.6);
  }

  return Object.freeze({ fly, maxSpeed, maxAltitude, minAltitude, halfWidth });
});
