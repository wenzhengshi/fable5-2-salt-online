(function (root) {
  'use strict';

  // PlaneGeometry rotated flat, with only vertex heights changed. Walk the
  // horizontal cells crossed by the ray and test the original indexed faces.
  function createTerrainRay(THREE, geometry) {
    const { widthSegments: columns, heightSegments: rows } = geometry.parameters;
    const positions = geometry.attributes.position;
    const indices = geometry.index;
    const xMin = positions.getX(0);
    const zMin = positions.getZ(0);
    const cellX = (positions.getX(columns) - xMin) / columns;
    const cellZ = (positions.getZ(rows * (columns + 1)) - zMin) / rows;
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    const hit = new THREE.Vector3(), normal = new THREE.Vector3();

    return function intersect(ray, limit) {
      const { origin, direction } = ray;
      let start = 0, end = limit;
      for (const axis of ['x', 'z']) {
        const min = axis === 'x' ? xMin : zMin;
        const max = min + (axis === 'x' ? columns * cellX : rows * cellZ);
        const velocity = direction[axis];
        if (velocity === 0) {
          if (origin[axis] < min || origin[axis] > max) return null;
          continue;
        }
        const near = (min - origin[axis]) / velocity;
        const far = (max - origin[axis]) / velocity;
        start = Math.max(start, Math.min(near, far));
        end = Math.min(end, Math.max(near, far));
      }
      if (end < start) return null;
      const col = (origin.x + direction.x * start - xMin) / cellX;
      const row = (origin.z + direction.z * start - zMin) / cellZ;
      let x = Math.min(columns - 1, Math.max(0, Math.floor(col)));
      let z = Math.min(rows - 1, Math.max(0, Math.floor(row)));
      const sx = Math.sign(direction.x), sz = Math.sign(direction.z);
      const stepX = sx ? cellX / Math.abs(direction.x) : Infinity;
      const stepZ = sz ? cellZ / Math.abs(direction.z) : Infinity;
      let nextX = sx ? (xMin + (x + (sx > 0 ? 1 : 0)) * cellX - origin.x) / direction.x : Infinity;
      let nextZ = sz ? (zMin + (z + (sz > 0 ? 1 : 0)) * cellZ - origin.z) / direction.z : Infinity;
      while (x >= 0 && x < columns && z >= 0 && z < rows) {
        const first = (z * columns + x) * 6;
        const cellEnd = Math.min(end, nextX, nextZ);
        let result = null;
        let best = limit;
        for (let index = first; index < first + 6; index += 3) {
          a.fromBufferAttribute(positions, indices.getX(index));
          b.fromBufferAttribute(positions, indices.getX(index + 1));
          c.fromBufferAttribute(positions, indices.getX(index + 2));
          if (!ray.intersectTriangle(a, b, c, true, hit)) continue;
          const dist = origin.distanceTo(hit);
          if (dist >= best || dist > cellEnd + 1e-6) continue;
          best = dist;
          THREE.Triangle.getNormal(a, b, c, normal);
          result = { dist, point: hit.clone(), normal: normal.clone(), surface: 'dirt', box: null };
        }
        if (result || cellEnd >= end) return result;
        if (nextX <= nextZ) { x += sx; nextX += stepX; }
        else { z += sz; nextZ += stepZ; }
      }
      return null;
    };
  }

  if (typeof module === 'object' && module.exports) module.exports = createTerrainRay;
  else root.SaltTerrainRay = createTerrainRay;
})(globalThis);
