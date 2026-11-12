import { GLTFLoader } from '/vendor/GLTFLoader.js';
import { MeshoptDecoder } from '/vendor/meshopt_decoder.module.js';
import { clone as cloneSkinned } from '/vendor/SkeletonUtils.js';

(() => {
  'use strict';

  const THREE = window.__G && window.__G.THREE;
  if (!THREE) {
    console.error('[hunter] Saltline THREE runtime is not ready');
    return;
  }

  const SOLDIERS = {
    male: {
      id: 'male',
      url: '/models/hunter.glb',
      height: 1.88,
      yaw: Math.PI,
      tint: { hue: 0.34, sat: 1.05, light: 0.86, grey: 0.7, skin: '#c08a63', hair: '#2c2216' }
    },
    female: {
      id: 'female',
      url: '/models/female-soldier.glb',
      height: 1.84,
      // The female template faces the opposite local axis to the male model.
      // Keep both characters pointing along the player's forward (-Z) axis.
      yaw: 0,
      tint: { hue: 0.58, sat: 0.92, light: 0.92, grey: 0.7, skin: '#d8a78f', hair: '#d8b56d' }
    }
  };
  const BONE_NAMES = [
    'Hips', 'Abdomen', 'Torso', 'Chest', 'Neck', 'Head',
    'UpperArm.L', 'UpperArm.R', 'LowerArm.L', 'LowerArm.R', 'Hand.L', 'Hand.R',
    'UpperLeg.L', 'UpperLeg.R', 'LowerLeg.L', 'LowerLeg.R', 'Foot.L', 'Foot.R'
  ];

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function weaponMaterial(color, roughness, metalness) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness
    });
  }

  function weaponBox(group, material, size, position, rotation) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
    mesh.position.set(position[0], position[1], position[2]);
    if (rotation) mesh.rotation.set(rotation[0] || 0, rotation[1] || 0, rotation[2] || 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }

  // Compact procedural rifle. The muzzle faces the same way as the soldier;
  // the group is turned around because the model template itself faces -Z.
  function createRifle(kind) {
    const rifle = new THREE.Group();
    rifle.name = 'soldier-rifle';
    rifle.userData.soldierWeapon = true;

    const receiverMat = weaponMaterial(0x14181c, 0.48, 0.62);
    const railMat = weaponMaterial(0x1f2123, 0.42, 0.7);
    const gripMat = weaponMaterial(0x12161a, 0.74, 0.18);
    const accentMat = weaponMaterial(0x6a5646, 0.62, 0.26);
    const lensMat = new THREE.MeshStandardMaterial({
      color: 0x7ef0e2,
      emissive: 0x1d8179,
      emissiveIntensity: 0.9,
      roughness: 0.14,
      metalness: 0.72
    });

    weaponBox(rifle, receiverMat, [0.12, 0.15, 0.43], [0, 0, 0]);
    weaponBox(rifle, railMat, [0.075, 0.035, 0.5], [0, 0.093, 0.01]);
    weaponBox(rifle, railMat, [0.1, 0.1, 0.42], [0, 0.005, 0.4]);
    weaponBox(rifle, railMat, [0.11, 0.035, 0.3], [0, 0.075, 0.4]);
    weaponBox(rifle, gripMat, [0.075, 0.23, 0.09], [0, -0.145, -0.08], [-0.28, 0, 0]);
    weaponBox(rifle, gripMat, [0.085, 0.2, 0.14], [0, -0.13, 0.12], [0.2, 0, 0]);
    weaponBox(rifle, receiverMat, [0.085, 0.11, 0.32], [0, -0.01, -0.33], [0.04, 0, 0]);
    weaponBox(rifle, accentMat, [0.1, 0.045, 0.18], [0, -0.098, -0.31]);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.34, 10), railMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.012, 0.76);
    barrel.castShadow = true;
    rifle.add(barrel);

    const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.024, 0.1, 10), gripMat);
    muzzle.rotation.x = Math.PI / 2;
    muzzle.position.set(0, 0.012, 0.96);
    muzzle.castShadow = true;
    rifle.add(muzzle);

    weaponBox(rifle, railMat, [0.085, 0.035, 0.17], [0, 0.142, 0.02]);
    weaponBox(rifle, receiverMat, [0.1, 0.09, 0.15], [0, 0.205, 0.02]);
    const optic = new THREE.Mesh(new THREE.CylinderGeometry(0.039, 0.039, 0.016, 14), lensMat);
    optic.rotation.x = Math.PI / 2;
    optic.position.set(0, 0.205, 0.1);
    rifle.add(optic);

    const rightGrip = new THREE.Object3D();
    rightGrip.name = 'rifle-right-grip';
    rightGrip.position.set(0.06, -0.13, -0.06);
    rifle.add(rightGrip);

    const leftGrip = new THREE.Object3D();
    leftGrip.name = 'rifle-left-grip';
    leftGrip.position.set(0.06, -0.095, 0.2);
    rifle.add(leftGrip);

    const compact = kind === 'male';
    rifle.position.set(compact ? -0.02 : -0.025, compact ? 1.355 : 1.375, compact ? -0.252 : -0.34);
    rifle.rotation.set(0.035, Math.PI - 1.3, 0);
    rifle.scale.setScalar(compact ? 0.69 : 0.72);
    rifle.userData.anchors = { right: rightGrip, left: leftGrip };
    return rifle;
  }

  function createAvatarWeapon(kind, template) {
    if (!template) return createRifle(kind);
    const rifle = template.clone(true);
    rifle.name = 'soldier-rifle';
    rifle.userData.soldierWeapon = true;
    rifle.position.set(-0.06, 1.44, 0.22);
    rifle.rotation.order = 'YXZ';
    rifle.rotation.set(-0.03, Math.PI + 0.2, 0);
    rifle.scale.setScalar(1);
    rifle.traverse((node) => {
      if (!node.isMesh) return;
      node.castShadow = true;
      node.receiveShadow = true;
      node.frustumCulled = false;
    });

    const rightGrip = new THREE.Object3D();
    rightGrip.name = 'rifle-right-grip';
    rifle.add(rightGrip);
    const leftGrip = new THREE.Object3D();
    leftGrip.name = 'rifle-left-grip';
    leftGrip.position.set(0, 0.08, -0.22);
    rifle.add(leftGrip);
    rifle.userData.anchors = { right: rightGrip, left: leftGrip };
    return rifle;
  }

  function normalizeSoldier(value) {
    return value === 'female' ? 'female' : 'male';
  }

  function tintMaterial(material, tint) {
    if (!material || !material.color) return material;
    const next = material.clone();
    const name = String(next.name || material.name || '').toLowerCase();
    if (/skin/.test(name)) {
      next.color.set(tint.skin);
      next.roughness = 0.82;
      next.metalness = 0.02;
      return next;
    }
    if (/(hair|brow|beard)/.test(name)) {
      next.color.set(tint.hair || '#2c2216');
      return next;
    }
    if (/eye/.test(name)) return next;

    const hsl = {};
    next.color.getHSL(hsl);
    const grey = hsl.s < 0.12;
    const hue = (tint.hue + hsl.h * 0.15 + 1) % 1;
    const sat = clamp(hsl.s * tint.sat + (grey ? 0.05 : 0.22), 0.03, 0.92);
    const light = clamp(hsl.l * tint.light, 0.04, 0.96);
    const target = new THREE.Color().setHSL(hue, sat, light);
    next.color.lerp(target, grey ? tint.grey : 1);
    if (/visor/.test(name)) {
      next.metalness = Math.max(0.65, next.metalness || 0);
      next.roughness = Math.min(0.24, next.roughness || 0.24);
    }
    return next;
  }

  function prepareModel(scene, config) {
    const materialCache = new Map();
    scene.traverse((node) => {
      if (!node.isMesh && !node.isSkinnedMesh) return;
      node.castShadow = true;
      node.receiveShadow = true;
      node.frustumCulled = false;
      const apply = (material) => {
        if (!material) return material;
        if (!materialCache.has(material.uuid)) materialCache.set(material.uuid, tintMaterial(material, config.tint));
        return materialCache.get(material.uuid);
      };
      node.material = Array.isArray(node.material) ? node.material.map(apply) : apply(node.material);
    });

    scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(scene, true);
    const size = box.getSize(new THREE.Vector3());
    const scale = config.height / Math.max(size.y, 0.001);
    scene.scale.multiplyScalar(scale);
    scene.updateMatrixWorld(true);

    const fitted = new THREE.Box3().setFromObject(scene, true);
    const center = fitted.getCenter(new THREE.Vector3());
    scene.position.x -= center.x;
    scene.position.z -= center.z;
    scene.position.y -= fitted.min.y;
    scene.rotation.y = config.yaw;
    scene.updateMatrixWorld(true);
    scene.userData.hunterAvatar = true;
    scene.userData.soldierKind = config.id;
    return scene;
  }

  class HunterRig {
    constructor(model, weaponTemplate) {
      this.model = model;
      this.baseY = model.position.y;
      this.walkPhase = Math.random() * Math.PI * 2;
      this.idlePhase = Math.random() * Math.PI * 2;
      this.bones = new Map();
      this.axes = new Map();
      this.rest = new Map();
      this.armCalibration = {};
      this.armLengths = {};
      this.fingers = { L: [], R: [] };
      this.weapon = createAvatarWeapon(model.userData.soldierKind, weaponTemplate);
      this.weaponBaseY = this.weapon.position.y;
      model.add(this.weapon);

      const lookup = new Map();
      model.traverse((node) => {
        if (node.isBone) lookup.set(this.normalize(node.name), node);
      });
      for (const name of BONE_NAMES) {
        const bone = lookup.get(this.normalize(name));
        if (bone) this.bones.set(name, bone);
      }
      model.traverse((node) => {
        if (!node.isBone) return;
        const norm = this.normalize(node.name);
        const match = /^(index|middle|ring|pinky|thumb)(\d+)?(l|r)$/.exec(norm);
        if (!match) return;
        this.fingers[match[3] === 'l' ? 'L' : 'R'].push({
          bone: node,
          name: norm,
          digit: match[1],
          segment: Number(match[2] || 1)
        });
      });

      model.updateMatrixWorld(true);
      const inverseModel = model.getWorldQuaternion(new THREE.Quaternion()).invert();
      for (const [name, bone] of this.bones) {
        const local = inverseModel.clone().multiply(bone.getWorldQuaternion(new THREE.Quaternion())).invert();
        this.axes.set(name, {
          x: new THREE.Vector3(1, 0, 0).applyQuaternion(local),
          y: new THREE.Vector3(0, 1, 0).applyQuaternion(local),
          z: new THREE.Vector3(0, 0, 1).applyQuaternion(local)
        });
        this.rest.set(name, bone.quaternion.clone());
      }
      for (const list of Object.values(this.fingers)) {
        for (const finger of list) this.rest.set(finger.name, finger.bone.quaternion.clone());
      }
      for (const side of ['L', 'R']) {
        const hand = this.bones.get(`Hand.${side}`);
        if (hand) hand.scale.setScalar(0.001);
      }

      this.armCalibration.L = this.calibrateArm('L');
      this.armCalibration.R = this.calibrateArm('R');
      for (const side of ['L', 'R']) {
        const upper = this.bones.get(`UpperArm.${side}`);
        const lower = this.bones.get(`LowerArm.${side}`);
        const hand = this.bones.get(`Hand.${side}`);
        if (!upper || !lower || !hand) continue;
        this.model.updateMatrixWorld(true);
        const upperPos = upper.getWorldPosition(new THREE.Vector3());
        const lowerPos = lower.getWorldPosition(new THREE.Vector3());
        const handPos = hand.getWorldPosition(new THREE.Vector3());
        this.armLengths[side] = {
          upper: upperPos.distanceTo(lowerPos),
          lower: lowerPos.distanceTo(handPos)
        };
      }
      this.idlePose = {
        'UpperLeg.L': [['z', -0.03]],
        'UpperLeg.R': [['z', 0.03]],
        Chest: [['y', 0.1]],
        Neck: [['y', 0.05]],
        Head: [['y', 0.16]]
      };
      this.apply(this.idlePose);
      this.poseWeapon();
    }

    normalize(value) {
      return String(value || '').toLowerCase().replace(/mixamorig/g, '').replace(/[^a-z0-9]/g, '');
    }

    armAngle(side) {
      const upper = this.bones.get(`UpperArm.${side}`);
      const hand = this.bones.get(`Hand.${side}`);
      if (!upper || !hand) return 0;
      this.model.updateMatrixWorld(true);
      const upperPos = upper.getWorldPosition(new THREE.Vector3());
      const handPos = hand.getWorldPosition(new THREE.Vector3());
      this.model.worldToLocal(upperPos);
      this.model.worldToLocal(handPos);
      const outward = (handPos.x - upperPos.x) * (side === 'L' ? 1 : -1);
      return Math.atan2(handPos.y - upperPos.y, outward);
    }

    calibrateArm(side) {
      const upper = this.bones.get(`UpperArm.${side}`);
      if (!upper) return { a0: 0, k: 1 };
      const rest = upper.quaternion.clone();
      const a0 = this.armAngle(side);
      const axis = this.axes.get(`UpperArm.${side}`) && this.axes.get(`UpperArm.${side}`).z;
      if (!axis) return { a0, k: 1 };
      const probe = side === 'L' ? -0.5 : 0.5;
      upper.quaternion.copy(rest).multiply(new THREE.Quaternion().setFromAxisAngle(axis, probe));
      this.model.updateMatrixWorld(true);
      const a1 = this.armAngle(side);
      upper.quaternion.copy(rest);
      this.model.updateMatrixWorld(true);
      let k = (a1 - a0) / probe;
      if (!Number.isFinite(k) || Math.abs(k) < 0.25) k = k < 0 ? -1 : 1;
      return { a0, k };
    }

    poseTargetAngle(side, target) {
      const calibration = this.armCalibration[side] || { a0: 0, k: 1 };
      return (-target - calibration.a0) / calibration.k;
    }

    apply(pose) {
      for (const [name, steps] of Object.entries(pose)) {
        const bone = this.bones.get(name);
        const axes = this.axes.get(name);
        const rest = this.rest.get(name);
        if (!bone || !axes || !rest) continue;
        const offset = new THREE.Quaternion();
        for (const step of steps) {
          const amount = Number(step[1]) || 0;
          if (amount) offset.multiply(new THREE.Quaternion().setFromAxisAngle(axes[step[0]], amount));
        }
        bone.quaternion.copy(rest).multiply(offset);
      }
      this.model.updateMatrixWorld(true);
    }

    aimBone(bone, child, target) {
      if (!bone || !child) return;
      const bonePos = bone.getWorldPosition(new THREE.Vector3());
      const childPos = child.getWorldPosition(new THREE.Vector3());
      const current = childPos.sub(bonePos);
      const desired = target.clone().sub(bonePos);
      if (current.lengthSq() < 1e-8 || desired.lengthSq() < 1e-8) return;
      current.normalize();
      desired.normalize();
      const delta = new THREE.Quaternion().setFromUnitVectors(current, desired);
      const world = bone.getWorldQuaternion(new THREE.Quaternion());
      const parent = bone.parent;
      const parentWorld = parent ? parent.getWorldQuaternion(new THREE.Quaternion()) : new THREE.Quaternion();
      bone.quaternion.copy(parentWorld.invert().multiply(delta).multiply(world));
      bone.updateMatrixWorld(true);
    }

    solveArm(side, target, pole) {
      const upper = this.bones.get(`UpperArm.${side}`);
      const lower = this.bones.get(`LowerArm.${side}`);
      const hand = this.bones.get(`Hand.${side}`);
      const lengths = this.armLengths[side];
      if (!upper || !lower || !hand || !lengths) return;

      this.model.updateMatrixWorld(true);
      const shoulder = upper.getWorldPosition(new THREE.Vector3());
      const toward = target.clone().sub(shoulder);
      const maxReach = Math.max(0.05, lengths.upper + lengths.lower - 0.008);
      const distance = clamp(toward.length(), 0.05, maxReach);
      const aim = toward.normalize();
      const reachable = shoulder.clone().addScaledVector(aim, distance);
      const along = (lengths.upper * lengths.upper - lengths.lower * lengths.lower + distance * distance) / (2 * distance);
      const bend = Math.sqrt(Math.max(0, lengths.upper * lengths.upper - along * along));
      const poleDir = pole.clone().sub(shoulder);
      poleDir.addScaledVector(aim, -poleDir.dot(aim));
      if (poleDir.lengthSq() < 1e-6) poleDir.set(0, -1, 0);
      poleDir.normalize();
      const elbow = shoulder.clone().addScaledVector(aim, along).addScaledVector(poleDir, bend);

      this.aimBone(upper, lower, elbow);
      this.aimBone(lower, hand, reachable);
    }

    rotateBoneWorld(bone, axis, angle) {
      if (!bone || !axis || !Number.isFinite(angle) || Math.abs(angle) < 1e-5) return;
      const world = bone.getWorldQuaternion(new THREE.Quaternion());
      const parentWorld = bone.parent ? bone.parent.getWorldQuaternion(new THREE.Quaternion()) : new THREE.Quaternion();
      const spin = new THREE.Quaternion().setFromAxisAngle(axis.clone().normalize(), angle);
      bone.quaternion.copy(parentWorld.invert().multiply(spin).multiply(world));
      bone.updateMatrixWorld(true);
    }

    aimHand(side, direction, roll) {
      const hand = this.bones.get(`Hand.${side}`);
      if (!hand || !direction || direction.lengthSq() < 1e-8) return;
      const middle = hand.children.find((child) => child.isBone && /^middle/i.test(this.normalize(child.name))) ||
        hand.children.find((child) => child.isBone);
      if (!middle) return;
      const handPos = hand.getWorldPosition(new THREE.Vector3());
      const fingerPos = middle.getWorldPosition(new THREE.Vector3());
      const current = fingerPos.sub(handPos);
      if (current.lengthSq() < 1e-8) return;
      const delta = new THREE.Quaternion().setFromUnitVectors(current.normalize(), direction.clone().normalize());
      const world = hand.getWorldQuaternion(new THREE.Quaternion());
      const parentWorld = hand.parent ? hand.parent.getWorldQuaternion(new THREE.Quaternion()) : new THREE.Quaternion();
      hand.quaternion.copy(parentWorld.invert().multiply(delta).multiply(world));
      hand.updateMatrixWorld(true);
      if (roll) {
        this.model.updateMatrixWorld(true);
        this.rotateBoneWorld(hand, direction, roll);
      }
    }

    curlFingers(side, amount) {
      const hand = this.bones.get(`Hand.${side}`);
      const list = this.fingers[side] || [];
      if (!hand || !list.length) return;
      const index = list.find((f) => f.digit === 'index' && f.segment === 1) || list.find((f) => f.digit === 'index');
      const pinky = list.find((f) => f.digit === 'pinky' && f.segment === 1) || list.find((f) => f.digit === 'pinky');
      if (!index || !pinky) return;
      const axis = index.bone.getWorldPosition(new THREE.Vector3())
        .sub(pinky.bone.getWorldPosition(new THREE.Vector3()));
      if (axis.lengthSq() < 1e-8) return;
      for (const finger of list) {
        const rest = this.rest.get(finger.name);
        if (rest) finger.bone.quaternion.copy(rest);
      }
      this.model.updateMatrixWorld(true);
      for (const finger of list) {
        if (finger.digit === 'thumb') {
          this.rotateBoneWorld(finger.bone, axis, -amount * 0.35);
          continue;
        }
        const scale = finger.segment <= 1 ? 0.72 : finger.segment === 2 ? 0.92 : 1.02;
        this.rotateBoneWorld(finger.bone, axis, amount * scale);
      }
    }

    poseWeapon() {
      const anchors = this.weapon && this.weapon.userData && this.weapon.userData.anchors;
      if (!anchors) return;
      this.model.updateMatrixWorld(true);
      const right = anchors.right.getWorldPosition(new THREE.Vector3());
      const left = anchors.left.getWorldPosition(new THREE.Vector3());
      const rightShoulder = this.bones.get('UpperArm.R');
      const leftShoulder = this.bones.get('UpperArm.L');
      const rightPos = rightShoulder ? rightShoulder.getWorldPosition(new THREE.Vector3()) : right.clone();
      const leftPos = leftShoulder ? leftShoulder.getWorldPosition(new THREE.Vector3()) : left.clone();
      const outward = rightPos.clone().sub(leftPos);
      if (outward.lengthSq() < 1e-6) outward.set(1, 0, 0);
      outward.normalize();
      const forward = new THREE.Vector3(0, 0, 1)
        .applyQuaternion(this.weapon.getWorldQuaternion(new THREE.Quaternion()));
      const down = new THREE.Vector3(0, -1, 0);
      const rightPole = rightPos.clone().addScaledVector(outward, 0.62).addScaledVector(down, 0.52).addScaledVector(forward, 0.1);
      const leftPole = leftPos.clone().addScaledVector(outward, -0.62).addScaledVector(down, 0.52).addScaledVector(forward, 0.1);
      this.solveArm('R', right, rightPole);
      this.solveArm('L', left, leftPole);
      const muzzle = forward.lengthSq() > 1e-6 ? forward.normalize() : new THREE.Vector3(1, 0, 0);
      const up = down.clone().negate();
      this.aimHand('R', muzzle.clone().multiplyScalar(0.62).addScaledVector(up, 0.38));
      this.aimHand('L', muzzle.clone().multiplyScalar(0.72).addScaledVector(up, 0.28));
      this.curlFingers('R', -1.10);
      this.curlFingers('L', -1.15);
    }

    update(dt, data) {
      const moving = !!(data && data.moving);
      const sprint = !!(data && data.sprint);
      const speed = moving ? (sprint ? 14 : 9) : 0;
      this.walkPhase += dt * speed;
      this.idlePhase += dt * 1.4;
      const swing = moving ? Math.sin(this.walkPhase) * (sprint ? 0.72 : 0.52) : 0;
      const breathe = Math.sin(this.idlePhase) * 0.018;
      const bob = moving ? Math.abs(Math.sin(this.walkPhase)) * (sprint ? 0.045 : 0.028) : breathe * 0.3;
      const pose = {};

      for (const [name, steps] of Object.entries(this.idlePose)) pose[name] = steps.slice();
      if (moving) {
        pose['UpperLeg.L'] = [['z', -0.03], ['x', swing]];
        pose['UpperLeg.R'] = [['z', 0.03], ['x', -swing]];
        pose['LowerLeg.L'] = [['x', Math.max(0, -swing) * 0.65]];
        pose['LowerLeg.R'] = [['x', Math.max(0, swing) * 0.65]];
        pose.Chest = [['y', 0.1 + breathe], ['x', 0.045]];
        pose.Head = [['y', 0.16 - breathe * 0.5]];
      }
      this.apply(pose);
      this.model.position.y = this.baseY + bob;
      if (this.weapon) this.weapon.position.y = this.weaponBaseY;
      this.poseWeapon();
    }
  }

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);

  const templates = new Map();
  const failures = new Map();
  const loads = {};
  let pac9Template = null;
  const weaponLoad = loader.loadAsync('/models/pac9-rifle.glb').then((gltf) => {
    pac9Template = gltf.scene;
    pac9Template.updateMatrixWorld(true);
    return pac9Template;
  }).catch((err) => {
    console.warn('[soldier] PAC9 weapon load failed, using procedural fallback', err);
    return null;
  });

  Object.values(SOLDIERS).forEach((config) => {
    loads[config.id] = Promise.all([loader.loadAsync(config.url), weaponLoad]).then(([gltf]) => {
      const template = prepareModel(gltf.scene, config);
      templates.set(config.id, template);
      if (config.id === 'male') {
        window.__hunterCharacterReady = true;
        document.documentElement.classList.add('hunter-avatar-ready');
      } else {
        window.__femaleCharacterReady = true;
        document.documentElement.classList.add('female-soldier-ready');
      }
      return template;
    }).catch((err) => {
      failures.set(config.id, err);
      if (config.id === 'male') {
        window.__hunterCharacterError = String((err && err.message) || err);
        document.documentElement.classList.add('hunter-avatar-error');
      } else {
        window.__femaleCharacterError = String((err && err.message) || err);
        document.documentElement.classList.add('female-soldier-error');
      }
      console.error('[soldier] model load failed: ' + config.id, err);
      throw err;
    });
  });

  function create(kind) {
    const id = normalizeSoldier(kind);
    const template = templates.get(id) || templates.get('male');
    if (!template) return null;
    const model = cloneSkinned(template);
    model.userData.hunterAvatar = true;
    model.userData.soldierKind = templates.has(id) ? id : 'male';
    const rig = new HunterRig(model, pac9Template);
    return { model, rig, weapon: rig.weapon, kind: model.userData.soldierKind };
  }

  function whenReady(kind) {
    if (kind === undefined || kind === null || kind === '') {
      return Promise.allSettled(Object.values(loads))
        .then(() => templates.size > 0);
    }
    return loads[normalizeSoldier(kind)].then(() => true).catch(() => false);
  }

  const api = {
    get ready() { return templates.size > 0; },
    get error() { return failures.size ? String((failures.values().next().value && failures.values().next().value.message) || 'load failed') : null; },
    soldiers: Object.keys(SOLDIERS),
    normalize: normalizeSoldier,
    whenReady,
    create,
    isReady(kind) { return templates.has(normalizeSoldier(kind)); }
  };

  window.HunterAvatar = api;
  window.SoldierModels = api;
})();
