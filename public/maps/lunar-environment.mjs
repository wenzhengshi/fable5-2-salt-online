const base = '/maps/lunar-assets/';
async function load(name, format) {
  const response = await fetch(base + name);
  if (!response.ok) throw new Error('Lunar Outpost: ' + response.status);
  return response[format]();
}

export async function createEnvironment() {
  const { THREE } = window.__G;
  const [data, binary] = await Promise.all([
    load('south-pole.json', 'json'),
    load('south-pole.bin', 'arrayBuffer')
  ]);
  const floats = ([offset, count]) => new Float32Array(binary, offset, count);
  const heights = floats(data.height);
  const { n, cell } = data;
  const half = (n - 1) * cell / 2;
  function heightAt(x, z) {
    const gx = THREE.MathUtils.clamp((x + half) / cell, 0, n - 1.0001);
    const gz = THREE.MathUtils.clamp((z + half) / cell, 0, n - 1.0001);
    const i = Math.floor(gx), j = Math.floor(gz);
    const u = gx - i, v = gz - j;
    const index = j * n + i;
    return u + v <= 1
      ? heights[index] + u * (heights[index + 1] - heights[index]) + v * (heights[index + n] - heights[index])
      : heights[index + n + 1] + (1 - u) * (heights[index + n] - heights[index + n + 1]) +
        (1 - v) * (heights[index + 1] - heights[index + n + 1]);
  }

  const scene = new THREE.Scene();
  const terrain = new THREE.PlaneGeometry(2 * half, 2 * half, n - 1, n - 1);
  terrain.rotateX(-Math.PI / 2);
  const position = terrain.attributes.position;
  const colors = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i++) {
    position.setY(i, heights[i]);
    const tone = .34 + .075 * Math.sin(position.getX(i) * .27 + position.getZ(i) * .13) +
      .045 * Math.sin(i * 127.1);
    colors.set([tone * 1.06, tone * 1.03, tone], i * 3);
  }
  terrain.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  terrain.computeVertexNormals();
  scene.add(new THREE.Mesh(terrain, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })));

  scene.add(new THREE.HemisphereLight(0xe1e9fd, 0x534c47, .78));
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.8);
  sun.position.set(-93, 12.2, 37);
  scene.add(sun);

  const stars = new Float32Array(1800 * 3);
  for (let i = 0; i < 1800; i++) {
    const angle = i * 2.399963229728653;
    const y = (i + .5) / 1800;
    const radius = 820 * Math.sqrt(1 - y * y);
    stars.set([radius * Math.cos(angle), 820 * y, radius * Math.sin(angle)], i * 3);
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(stars, 3));
  scene.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({
    color: 0xa4afc6, size: 1.05, sizeAttenuation: true, toneMapped: false
  })));

  const colliders = [];
  const models = new Map();
  const materialProps = {
    dark: [.2, .6], white: [0, .55], orange: [0, .5], glass: [.9, .08],
    steel: [1, .48], alu: [1, .36], rubber: [.5, .7], foil: [1, .3],
    panel: [.55, .22], mirror: [1, .04], dish: [0, .5], tank: [.1, .35]
  };
  const materials = new Map();
  function materialFor(mesh) {
    const key = mesh.material || 'default';
    if (!materials.has(key)) {
      const [metalness, roughness] = materialProps[key] || [0, .82];
      const settings = { color: mesh.color, metalness, roughness };
      if (key.startsWith('lamp')) Object.assign(settings, { emissive: mesh.color, emissiveIntensity: 1.1 });
      if (key === 'dome') Object.assign(settings, { transparent: true, opacity: .3, depthWrite: false });
      materials.set(key, new THREE.MeshStandardMaterial(settings));
    }
    return materials.get(key);
  }
  for (const [kind, meshes] of Object.entries(data.models)) {
    const group = new THREE.Group();
    for (const mesh of meshes) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(floats(mesh.position), 3));
      geometry.setAttribute('normal', new THREE.BufferAttribute(floats(mesh.normal), 3));
      group.add(new THREE.Mesh(geometry, materialFor(mesh)));
    }
    models.set(kind, group);
  }
  for (const prop of data.props) {
    const object = models.get(prop.kind).clone(true);
    const y = heightAt(prop.x, prop.z) - .03;
    object.name = 'lunar-' + prop.kind;
    object.position.set(prop.x, y, prop.z);
    object.rotation.y = prop.yaw;
    scene.add(object);
    const { hx, hy, hz } = prop.collider;
    const sin = Math.abs(Math.sin(prop.yaw)), cos = Math.abs(Math.cos(prop.yaw));
    const dx = cos * hx + sin * hz, dz = sin * hx + cos * hz;
    colliders.push([prop.x - dx, y, prop.z - dz, prop.x + dx, y + 2 * hy, prop.z + dz]);
  }

  const rockMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0),
    new THREE.MeshStandardMaterial({ color: 0x938e86, roughness: 1 }), data.rocks.length);
  const transform = new THREE.Object3D();
  for (const [i, rock] of data.rocks.entries()) {
    const y = heightAt(rock.x, rock.z);
    transform.position.set(rock.x, y - rock.s * rock.sink, rock.z);
    transform.rotation.set(rock.tilt, rock.yaw, -rock.tilt);
    transform.scale.set(rock.s, rock.s * .67, rock.s * .88);
    transform.updateMatrix();
    rockMesh.setMatrixAt(i, transform.matrix);
    if (rock.s > .52) {
      const r = rock.s * .68;
      colliders.push([rock.x - r, y - .1, rock.z - r, rock.x + r, y + rock.s * .37, rock.z + r]);
    }
  }
  scene.add(rockMesh);

  return {
    scene, color: 0x050609, heightAt, terrain,
    boxes(x1, z1, x2, z2) {
      const left = Math.min(x1, x2), right = Math.max(x1, x2);
      const near = Math.min(z1, z2), far = Math.max(z1, z2);
      return colliders.filter(box => box[0] <= right && box[3] >= left && box[2] <= far && box[5] >= near);
    },
    update() {}
  };
}
