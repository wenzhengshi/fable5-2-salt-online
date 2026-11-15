(() => {
  'use strict';

  window.createQingyunCollision = async function (THREE, geometry, offsetZ, terrainHeight) {
    const cellSize = 4;
    const columns = new Map();
    const cell = value => Math.floor(value / cellSize);
    const key = (x, z) => x * 1024 + z;
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    const ray = new THREE.Ray();
    const point = new THREE.Vector3();
    const normal = new THREE.Vector3();
    const end = new THREE.Vector3();
    const down = new THREE.Vector3(0, -1, 0);
    let stamp = 0;

    let sliceStarted = performance.now();
    for (const mesh of geometry) {
      const positions = mesh.getAttribute('position');
      const indices = mesh.getIndex();
      const count = indices ? indices.count : positions.count;
      for (let i = 0; i < count; i += 3) {
        if (i % 768 === 0 && performance.now() - sliceStarted > 4) {
          await new Promise(resolve => setTimeout(resolve, 0));
          sliceStarted = performance.now();
        }
        a.fromBufferAttribute(positions, indices ? indices.getX(i) : i);
        b.fromBufferAttribute(positions, indices ? indices.getX(i + 1) : i + 1);
        c.fromBufferAttribute(positions, indices ? indices.getX(i + 2) : i + 2);
        const triangle = { positions, indices, i, stamp: 0 };
        const minX = cell(Math.min(a.x, b.x, c.x));
        const maxX = cell(Math.max(a.x, b.x, c.x));
        const minZ = cell(Math.min(a.z, b.z, c.z));
        const maxZ = cell(Math.max(a.z, b.z, c.z));
        for (let x = minX; x <= maxX; x++) {
          for (let z = minZ; z <= maxZ; z++) {
            const id = key(x, z);
            if (!columns.has(id)) columns.set(id, []);
            columns.get(id).push(triangle);
          }
        }
      }
    }

    function raycast(origin, direction, range, floorOnly = false) {
      ray.origin.set(origin.x, origin.y, origin.z - offsetZ);
      ray.direction.copy(direction);
      end.copy(ray.origin).addScaledVector(direction, range);
      let nearest = range;
      let result = null;
      stamp++;
      // Visit the projected segment in cell-sized steps. At each crossing include
      // adjacent cells through the segment's bounding rectangle.
      let previousX = ray.origin.x;
      let previousZ = ray.origin.z;
      const steps = Math.max(1, Math.ceil(Math.hypot(end.x - previousX, end.z - previousZ) / cellSize));
      for (let step = 1; step <= steps; step++) {
        const x = ray.origin.x + (end.x - ray.origin.x) * (step / steps);
        const z = ray.origin.z + (end.z - ray.origin.z) * (step / steps);
        for (let ix = cell(Math.min(previousX, x)); ix <= cell(Math.max(previousX, x)); ix++) {
          for (let iz = cell(Math.min(previousZ, z)); iz <= cell(Math.max(previousZ, z)); iz++) {
            const triangles = columns.get(key(ix, iz));
            if (!triangles) continue;
            for (const triangle of triangles) {
              if (triangle.stamp === stamp) continue;
              triangle.stamp = stamp;
              const { positions, indices, i } = triangle;
              a.fromBufferAttribute(positions, indices ? indices.getX(i) : i);
              b.fromBufferAttribute(positions, indices ? indices.getX(i + 1) : i + 1);
              c.fromBufferAttribute(positions, indices ? indices.getX(i + 2) : i + 2);
              if (!ray.intersectTriangle(a, b, c, false, point)) continue;
              const distance = point.distanceTo(ray.origin);
              if (distance < .0001 || distance >= nearest) continue;
              THREE.Triangle.getNormal(a, b, c, normal);
              if (floorOnly && normal.y < .66) continue;
              if (normal.dot(direction) > 0) normal.negate();
              nearest = distance;
              result = {
                dist: distance,
                point: new THREE.Vector3(point.x, point.y, point.z + offsetZ),
                normal: normal.clone(),
                surface: 'concrete',
                box: null
              };
            }
          }
        }
        previousX = x;
        previousZ = z;
      }
      return result;
    }

    const probe = new THREE.Vector3();
    const up = down.clone().negate();
    const direction = new THREE.Vector3();
    const lateral = new THREE.Vector3();

    function groundHeight(x, z, probeY = 100) {
      probe.set(x, probeY + .002, z);
      const hit = raycast(probe, down, Math.max(1, probeY + 100), true);
      return hit ? hit.point.y : -75;
    }

    function sweep(origin, target, radius, heights) {
      direction.subVectors(target, origin);
      const distance = direction.length();
      if (distance < .0001) return 0;
      direction.multiplyScalar(1 / distance);
      lateral.set(-direction.z, 0, direction.x).normalize().multiplyScalar(radius * .72);
      let travel = distance;
      for (const height of heights) {
        for (const side of [-1, 0, 1]) {
          probe.copy(origin).addScaledVector(lateral, side);
          probe.y += height;
          const hit = raycast(probe, direction, distance + radius);
          if (hit) travel = Math.min(travel, Math.max(0, hit.dist - radius * .72));
        }
      }
      return travel;
    }

    const target = new THREE.Vector3();
    const flightTarget = new THREE.Vector3();

    function inLake(x, z) {
      const localZ = z - offsetZ;
      return Math.hypot(x, localZ - 56) < 70 && terrainHeight(x, localZ) < .12;
    }

    function moveCapsule(pos, vel, dt, radius = .32, height = 1.8, grounded = true) {
      const step = grounded && vel.y <= 0 ? .42 : .08;
      const status = { onGround: false, hitWall: false, hitCeil: false, surface: 'concrete' };
      for (const axis of ['x', 'z']) {
        target.copy(pos);
        target[axis] += vel[axis] * dt;
        const enteringLake = inLake(target.x, target.z) && !inLake(pos.x, pos.z);
        const travel = enteringLake ? 0 : sweep(pos, target, radius, [step + .015, height * .65, height - .04]);
        if (travel < Math.abs(vel[axis] * dt) - .0001) {
          pos[axis] += Math.sign(vel[axis]) * travel;
          vel[axis] = 0;
          status.hitWall = true;
        } else {
          pos[axis] = target[axis];
        }
      }

      let nextY = pos.y + vel.y * dt;
      if (vel.y > 0) {
        probe.copy(pos);
        probe.y += height - .025;
        const ceiling = raycast(probe, up, vel.y * dt + .03);
        if (ceiling) {
          nextY = pos.y + Math.max(0, ceiling.dist - .03);
          vel.y = 0;
          status.hitCeil = true;
        }
      } else {
        const floor = groundHeight(pos.x, pos.z, pos.y + step);
        if (nextY <= floor + .002 || (grounded && nextY - floor <= step)) {
          nextY = floor;
          vel.y = 0;
          status.onGround = true;
        }
      }
      pos.y = nextY;
      return status;
    }

    return {
      groundHeight, raycast, moveCapsule, inLake,
      moveDrone(previous, candidate, radius) {
        flightTarget.set(candidate.x, candidate.y, candidate.z);
        const travel = sweep(previous, flightTarget, radius, [.15, .45, .7]);
        flightTarget.copy(previous).addScaledVector(direction, travel);
        if (inLake(flightTarget.x, flightTarget.z)) flightTarget.y = Math.max(.55, flightTarget.y);
        return flightTarget;
      }
    };
  };
})();
