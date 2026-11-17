(() => {
  'use strict';
  const templates = new WeakMap();

  function wearable(THREE, slot, machine) {
    if (!templates.has(THREE)) templates.set(THREE, { models: window.createFrontierModels(THREE), parts: {} });
    const cache = templates.get(THREE);
    const key = (machine ? 'machine-' : 'human-') + slot;
    cache.parts[key] ||= cache.models.wearable(slot, machine);
    return cache.parts[key].clone(true);
  }

  function mount(THREE, reference, kind, anchors, visualScale = 1) {
    const machine = kind === 'hound' || kind === 'drone';
    const head = new THREE.Group();
    const chest = new THREE.Group();
    reference.updateWorldMatrix(true, true);

    function socket(group, parent, position, scale) {
      group.position.copy(position);
      group.scale.fromArray(scale).multiplyScalar(visualScale);
      reference.add(group);
      if (parent) parent.attach(group);
    }
    const offset = (parent, xyz) => {
      const point = new THREE.Vector3();
      if (parent) reference.worldToLocal(parent.getWorldPosition(point));
      return point.addScaledVector(new THREE.Vector3(...xyz), visualScale);
    };

    if (machine) {
      const drone = kind === 'drone';
      const headOffset = anchors.machineFallback ? [0, .035, 0] :
        drone ? [0, .11, .13] : [0, .11, .06];
      const torsoOffset = anchors.machineFallback ? [0, .10, 0] :
        drone ? [0, .084, 0] : [0, .12, 0];
      socket(head, anchors.head, offset(anchors.head, headOffset), drone ? [.66, .7, .64] : [1, .78, .93]);
      socket(chest, anchors.chest, offset(anchors.chest, torsoOffset), drone ? [.91, .78, .81] : [1.11, .91, 1.13]);
    } else if (anchors.headBounds) {
      const { center, size, base } = anchors.headBounds;
      const cap = new THREE.Vector3(center[0], base + size[1] * .50, center[2]);
      const female = kind === 'female';
      socket(head, anchors.head, cap, [
        Math.max(.64, (size[0] + .026) / .354),
        Math.max(.66, (size[1] * .50 + .026) / .19),
        Math.max(.71, (size[2] + .028) / .354)
      ]);
      socket(chest, anchors.chest, offset(anchors.chest, [0, -.235, female ? -.005 : 0]),
        female ? [.77, .95, 1.06] : [.83, .97, 1.22]);
    } else {
      socket(head, anchors.head, offset(anchors.head, [0, .025, 0]), [1.42, 1.23, 1.42]);
      socket(chest, anchors.chest, offset(anchors.chest, [0, -.205, 0]), [1.08, 1.13, 1.66]);
    }

    const slots = [[head, 'helmet', 1, anchors.baseHelmet], [chest, 'vest', 2, anchors.baseVest]];
    let current = -1;
    return {
      update(flags) {
        const mask = (Number(flags) || 0) & 3;
        if (mask === current) return;
        current = mask;
        for (const [socket, slot, bit, base] of slots) {
          const equipped = (mask & bit) !== 0;
          if (equipped && !socket.children.length) socket.add(wearable(THREE, slot, machine));
          socket.visible = equipped;
          if (base) base.visible = !equipped;
        }
      },
      dispose() {
        for (const [socket, , , base] of slots) {
          socket.removeFromParent();
          if (base) base.visible = true;
        }
      }
    };
  }

  window.SaltFrontierArmor = { mount };
})();
