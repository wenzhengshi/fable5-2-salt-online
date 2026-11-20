let runtimePromise;

function loadRuntime(version) {
  return runtimePromise ||= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/js/game.bundle.js?v=' + encodeURIComponent(version);
    script.dataset.playerRuntime = '';
    script.onload = () => resolve(window.SaltPlayerRuntime);
    script.onerror = () => reject(new Error('Battlefield weapon runtime unavailable'));
    document.head.append(script);
  });
}

export async function install(game, {
  version, running, inventory, onShot, onAudio, isMachine, getMuted
}) {
  const runtime = await loadRuntime(version);
  const { THREE, scene, renderer, camera, physics } = game;
  game.params = {};
  game.quality = { tex: 256 };
  game.events = runtime.events();
  game.hud = { root: document.getElementById('race-player-ui') };
  const view = new THREE.PerspectiveCamera(runtime.viewFov, camera.aspect, .01, 10);
  view.layers.set(runtime.weaponLayer);
  game.viewCamera = view;
  scene.add(camera);
  scene.traverse(node => {
    if (node.isLight) node.layers.enable(runtime.weaponLayer);
  });

  const rules = window.SaltFrontierRules;
  game.frontier = {
    canEquipWeapon: id => rules.canEquip(inventory(), id, 'race')
  };
  const isReady = () => running() && !!game.weapon;
  const wheel = window.SaltPlayerCombat.weaponWheel({
    activeWeapon: () => game.weapon.arsenalId,
    availableWeapons: () => rules.availableWeapons(inventory(), 'race'),
    wheelBlocked: () => !isReady() || isMachine() || document.querySelector('dialog[open]') ||
      (game.input.ads && game.weapon.arsenalId !== 'knife'),
    nextWeapon: (active, direction) => rules.cycleWeapon(inventory(), 'race', active, direction),
    equipWeapon: kind => window.SaltArsenal.equip(rules.weaponKinds[kind])
  });

  game.combat = {
    playerShot(origin, direction, { range, weapon }) {
      onShot(weapon);
      return physics.raycast(origin, direction, Math.min(range, window.SaltArsenalRules[weapon].range));
    }
  };
  game.events.on('weapon:fire', ({ muzzle, dir }) => game.fx?.muzzleFlash(muzzle, dir));
  const [mats, sound] = await Promise.all([runtime.materials(game), runtime.audio(game, game.audio?.ctx)]);
  game.mats = mats;
  game.audio = sound;
  onAudio(sound);
  sound.setVolume(getMuted() ? 0 : .8);
  // Keep the base builder methods available until the scene is ready to draw the rifle.
  game.weapon = await runtime.weapon(game);
  runtime.effects(game).then(fx => { game.fx = fx; })
    .catch(error => console.warn('[race] battlefield effects unavailable', error));
  await import('/js/arsenal.js?v=' + encodeURIComponent(version));
  renderer.domElement.addEventListener('wheel', wheel.onWheel, { passive: false });

  const origin = new THREE.Vector3(), direction = new THREE.Vector3(), end = new THREE.Vector3();
  function remoteShot(position, yaw, pitch, unit, weapon) {
    const range = window.SaltArsenalRules[weapon || 'pac9']?.range || 90;
    if (!game.fx || range < 3) return;
    const spread = Math.cos(pitch);
    direction.set(-Math.sin(yaw) * spread, Math.sin(pitch), -Math.cos(yaw) * spread);
    origin.copy(position).addScaledVector(direction, .85);
    origin.y += unit === 'hound' ? .62 : unit === 'drone' ? .86 : 1.37;
    const impact = physics.raycast(origin, direction, range);
    game.fx.muzzleFlash(origin, direction);
    game.fx.tracer(origin, impact?.point || end.copy(origin).addScaledVector(direction, range));
    sound.play('rifle_shot', { pos: origin, gain: .7 });
  }

  function drawWeapon() {
    if (isMachine()) return;
    view.position.copy(camera.position);
    view.quaternion.copy(camera.quaternion);
    if (view.aspect !== camera.aspect) {
      view.aspect = camera.aspect;
      view.updateProjectionMatrix();
    }
    const autoClear = renderer.autoClear;
    const background = scene.background;
    renderer.autoClear = false;
    scene.background = null;
    try {
      renderer.clearDepth();
      renderer.render(scene, view);
    } finally {
      renderer.autoClear = autoClear;
      scene.background = background;
    }
  }

  return { drawWeapon, remoteShot, switchWeapon: wheel.cycleWeapon };
}
