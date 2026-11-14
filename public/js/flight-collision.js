(function initFlightCollision(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SaltFlightCollision = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createFlightCollision() {
  'use strict';

  const EPSILON = 0.001;
  const MAX_CONTACTS = 12;

  function finite(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function validVector(vector) {
    return vector && Number.isFinite(Number(vector.x)) &&
      Number.isFinite(Number(vector.y)) && Number.isFinite(Number(vector.z));
  }

  function validBox(box) {
    if (!box || box.bulletOnly || !validVector(box.min) || !validVector(box.max)) return false;
    return box.min.x < box.max.x && box.min.y < box.max.y && box.min.z < box.max.z;
  }

  function crossingPriority(previous, current, min, max, axis, direction) {
    if (!previous) return 1;
    const previousValue = Number(previous[axis]);
    if (!Number.isFinite(previousValue)) return 1;
    if (direction < 0 && previousValue <= min && current >= min) return 0;
    if (direction > 0 && previousValue >= max && current <= max) return 0;
    return 1;
  }

  function chooseContact(contact, previous, current) {
    const { minX, maxX, minY, maxY, minZ, maxZ } = contact.bounds;
    const candidates = [
      {
        axis: 'x',
        delta: minX - EPSILON - current.x,
        priority: crossingPriority(previous, current.x, minX, maxX, 'x', -1)
      },
      {
        axis: 'x',
        delta: maxX + EPSILON - current.x,
        priority: crossingPriority(previous, current.x, minX, maxX, 'x', 1)
      },
      {
        axis: 'z',
        delta: minZ - EPSILON - current.z,
        priority: crossingPriority(previous, current.z, minZ, maxZ, 'z', -1)
      },
      {
        axis: 'z',
        delta: maxZ + EPSILON - current.z,
        priority: crossingPriority(previous, current.z, minZ, maxZ, 'z', 1)
      },
      {
        axis: 'y',
        delta: minY - EPSILON - current.y,
        priority: crossingPriority(previous, current.y, minY, maxY, 'y', -1)
      },
      {
        axis: 'y',
        delta: maxY + EPSILON - current.y,
        priority: crossingPriority(previous, current.y, minY, maxY, 'y', 1)
      }
    ];
    candidates.sort((left, right) => (
      left.priority - right.priority || Math.abs(left.delta) - Math.abs(right.delta)
    ));
    return candidates[0];
  }

  function resolve(position, boxes, options) {
    const source = validVector(position) ? position : { x: 0, y: 0, z: 0 };
    const settings = options || {};
    const radius = Math.max(0.05, finite(settings.radius, 0.72));
    const bottom = finite(settings.bottom, 0.12);
    const top = Math.max(bottom + 0.1, finite(settings.top, 1.2));
    const maxIterations = Math.max(1, Math.min(8, Math.round(finite(settings.maxIterations, 5))));
    const previous = validVector(settings.previous) ? settings.previous : null;
    const current = { x: Number(source.x), y: Number(source.y), z: Number(source.z) };
    const hitBoxes = [];
    let hitWall = false;
    let blockedUp = false;
    let blockedDown = false;

    for (let iteration = 0; iteration < maxIterations; iteration += 1) {
      let selected = null;
      for (const box of Array.isArray(boxes) ? boxes : []) {
        if (!validBox(box)) continue;
        const bounds = {
          minX: Number(box.min.x) - radius,
          maxX: Number(box.max.x) + radius,
          minY: Number(box.min.y) - top,
          maxY: Number(box.max.y) - bottom,
          minZ: Number(box.min.z) - radius,
          maxZ: Number(box.max.z) + radius
        };
        if (current.x <= bounds.minX || current.x >= bounds.maxX ||
            current.y <= bounds.minY || current.y >= bounds.maxY ||
            current.z <= bounds.minZ || current.z >= bounds.maxZ) {
          continue;
        }
        const contact = chooseContact({ bounds }, previous, current);
        if (!selected || contact.priority < selected.contact.priority ||
            (contact.priority === selected.contact.priority &&
             Math.abs(contact.delta) < Math.abs(selected.contact.delta))) {
          selected = { box, contact };
        }
      }

      if (!selected) break;
      const { box, contact } = selected;
      current[contact.axis] += contact.delta;
      if (contact.axis === 'y') {
        if (contact.delta < 0) blockedUp = true;
        if (contact.delta > 0) blockedDown = true;
      } else {
        hitWall = true;
      }
      if (hitBoxes.length < MAX_CONTACTS &&
          (box.tag || box.id || box.surface) &&
          !hitBoxes.includes(box.tag || box.id || box.surface)) {
        hitBoxes.push(box.tag || box.id || box.surface);
      }
    }

    return {
      x: current.x,
      y: current.y,
      z: current.z,
      hit: hitWall || blockedUp || blockedDown,
      hitWall,
      blockedUp,
      blockedDown,
      hitBoxes
    };
  }

  function clampToBounds(position, bounds, margin) {
    const source = validVector(position) ? position : { x: 0, y: 0, z: 0 };
    const pad = Math.max(0, finite(margin, 0));
    const minX = finite(bounds && bounds.minX, Number.NEGATIVE_INFINITY) + pad;
    const maxX = finite(bounds && bounds.maxX, Number.POSITIVE_INFINITY) - pad;
    const minZ = finite(bounds && bounds.minZ, Number.NEGATIVE_INFINITY) + pad;
    const maxZ = finite(bounds && bounds.maxZ, Number.POSITIVE_INFINITY) - pad;
    const x = Math.max(minX, Math.min(maxX, Number(source.x)));
    const z = Math.max(minZ, Math.min(maxZ, Number(source.z)));
    return {
      x,
      y: Number(source.y),
      z,
      clampedX: x !== Number(source.x),
      clampedZ: z !== Number(source.z)
    };
  }

  return Object.freeze({ resolve, clampToBounds });
});
