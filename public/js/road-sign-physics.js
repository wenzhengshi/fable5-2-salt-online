(function (root) {
  'use strict';
  // Shared by the renderer and collision solver.
  const model = {
    post: { topRadius: .047, bottomRadius: .06, height: 1.54 },
    collar: { topRadius: .085, bottomRadius: .067, low: 1.49, high: 1.61 },
    board: { width: 2.22, height: .74, depth: .055, center: 1.98, faceOffset: .03 }
  };
  const { post, collar, board } = model;
  const parts = [
    { x: post.bottomRadius, z: post.bottomRadius, low: 0, high: post.height },
    { x: collar.topRadius, z: collar.topRadius, low: collar.low, high: collar.high },
    { x: board.width / 2, z: board.faceOffset + .002,
      low: board.center - board.height / 2, high: board.center + board.height / 2 }
  ];
  const axes = ['x', 'y', 'z'];

  function sweep(from, delta, sign, radius, height, limit = 1) {
    const offsetX = from.x - sign.pos.x, offsetZ = from.z - sign.pos.z;
    const reach = 1.13 + radius;
    if (Math.min(offsetX, offsetX + delta.x) > reach || Math.max(offsetX, offsetX + delta.x) < -reach ||
        Math.min(offsetZ, offsetZ + delta.z) > reach || Math.max(offsetZ, offsetZ + delta.z) < -reach) return null;
    const cos = Math.cos(sign.yaw), sin = Math.sin(sign.yaw);
    const p = { x: cos * offsetX - sin * offsetZ, y: from.y - sign.pos.y, z: sin * offsetX + cos * offsetZ };
    const d = { x: cos * delta.x - sin * delta.z, y: delta.y, z: sin * delta.x + cos * delta.z };
    let hit = null;
    for (const part of parts) {
      const min = { x: -part.x - radius, y: part.low - height, z: -part.z - radius };
      const max = { x: part.x + radius, y: part.high, z: part.z + radius };
      let enter = -Infinity, leave = limit, edge;
      for (const axis of axes) {
        if (Math.abs(d[axis]) < 1e-9) {
          if (p[axis] <= min[axis] || p[axis] >= max[axis]) { leave = -Infinity; break; }
          continue;
        }
        const first = (min[axis] - p[axis]) / d[axis];
        const second = (max[axis] - p[axis]) / d[axis];
        const start = Math.min(first, second);
        if (start > enter) { enter = start; edge = axis; }
        leave = Math.min(leave, Math.max(first, second));
      }
      // An obstacle can arrive over an existing player via multiplayer. Allow escape.
      if (!edge || enter < 0 || enter > leave || enter >= limit) continue;
      const side = -Math.sign(d[edge]);
      const normal = edge === 'y' ? { x: 0, y: side, z: 0 } :
        edge === 'x' ? { x: cos * side, y: 0, z: -sin * side } : { x: sin * side, y: 0, z: cos * side };
      hit = { at: enter, normal };
      limit = enter;
    }
    return hit;
  }

  if (typeof module === 'object' && module.exports) module.exports = { model, sweep };
  else root.SaltRoadSignPhysics = { model, sweep };
})(globalThis);
