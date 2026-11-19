import { GLTFLoader } from '/vendor/GLTFLoader.js';
import { MeshoptDecoder } from '/vendor/meshopt_decoder.module.js';

const rules = window.SaltArsenalRules;
const game = window.__G;
const THREE = game.THREE;
const asset = '/models/arsenal.glb?v=1';
let loading;
let selection = 0;
const templates = new Map();
let groundRifle;

function addM249Sight(fitted) {
  const sight = new THREE.Group();
  const frame = new THREE.MeshStandardMaterial({ color: 0x262b2b, roughness: .75, metalness: .36 });
  function bar(width, height, x, y) {
    const part = new THREE.Mesh(new THREE.BoxGeometry(width, height, .032), frame);
    part.position.set(x, y, 0);
    sight.add(part);
  }
  bar(.062, .012, 0, -.026);
  bar(.062, .007, 0, .022);
  bar(.007, .05, -.028, 0);
  bar(.007, .05, .028, 0);
  const dot = new THREE.Mesh(new THREE.CircleGeometry(.0018, 16),
    new THREE.MeshBasicMaterial({ color: 0xff4638, toneMapped: false }));
  sight.add(dot);
  sight.position.set(0, .098, -.196);
  fitted.add(sight);
  fitted.userData.sight = [sight.position.x, sight.position.y];
}

function load() {
  if (!loading) {
    loading = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(asset).then(({ scene }) => {
      for (const profile of Object.values(rules)) {
        if (!profile.model) continue;
        const source = scene.getObjectByName(profile.model);
        if (!source) throw Error('Missing arsenal model: ' + profile.model);
        const shape = new THREE.Group();
        const model = source.clone(true);
        model.rotation.y = -Math.PI / 2;
        shape.add(model);
        const bounds = new THREE.Box3().setFromObject(shape);
        const size = bounds.getSize(new THREE.Vector3());
        const center = bounds.getCenter(new THREE.Vector3());
        const scale = profile.length / Math.max(.001, size.z);
        shape.scale.setScalar(scale);
        shape.position.set(-center.x * scale, -bounds.max.y * scale + .07,
          -bounds.max.z * scale + (profile.length < .4 ? .11 : .23));
        const fitted = new THREE.Group();
        fitted.add(shape);
        fitted.userData.muzzle = [0, .035, shape.position.z + bounds.min.z * scale];
        if (profile.id === 'knife') {
          fitted.userData.grip = [0, center.y * scale + shape.position.y, .055];
        }
        if (profile.id === 'm249') addM249Sight(fitted);
        templates.set(profile.id, fitted);
      }
    }).catch(error => {
      templates.clear();
      loading = null;
      throw error;
    });
  }
  return loading;
}

function clone(id) {
  return templates.get(id)?.clone(true);
}

async function groundModel(id) {
  let gun;
  if (id === 'pac9') {
    groundRifle ||= window.HunterAvatar.groundRifle();
    gun = (await groundRifle)?.clone(true);
  } else {
    await load();
    gun = clone(id);
  }
  if (!gun) throw Error('Missing ground model: ' + id);
  gun.rotation.z = Math.PI / 2;
  const bounds = new THREE.Box3().setFromObject(gun);
  const center = bounds.getCenter(new THREE.Vector3());
  gun.position.set(-center.x, -bounds.min.y, -center.z);
  const holder = new THREE.Group();
  holder.name = 'ground-weapon-' + id;
  holder.add(gun);
  return holder;
}

async function equip(id) {
  const profile = Object.hasOwn(rules, id) && rules[id];
  if (!profile || !game.weapon?.equipArsenal ||
      !game.frontier?.canEquipWeapon(id)) return false;
  const request = ++selection;
  try {
    if (profile.model) await load();
    if (request !== selection || !game.frontier.canEquipWeapon(id)) return false;
    game.weapon.equipArsenal(profile, clone(id));
    game.hud.root?.classList.toggle('arsenal-melee', id === 'knife');
    return true;
  } catch (error) {
    console.warn('[arsenal]', error);
    return false;
  }
}

window.SaltArsenal = { equip, clone, load, groundModel };
