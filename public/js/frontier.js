(() => {
  'use strict';
  const rules = window.SaltFrontierRules;
  const flight = rules.insertion;
  const strings = window.__SALT_I18N__.messages.frontier;
  const localKey = 'saltline.frontier.offline.v1';
  const names = { ...strings.items };
  const weapons = Object.entries(rules.weaponKinds);
  for (const [kind, id] of weapons) {
    names[kind] = id === 'knife' ? window.__SALT_I18N__.messages.arsenal.knife : window.SaltArsenalRules[id].name;
  }
  const keys = { grenade: 'G', drink: '4', medkit: '5', quiet: '6' };
  const backpackKeys = new Set(['Digit0', 'Numpad0', 'KeyO']);
  const itemKeys = { KeyG: 'grenade', Digit4: 'drink', Digit5: 'medkit', Digit6: 'quiet' };

  window.installFrontier = function (game) {
    const { player, THREE, physics, scene, camera, input } = game;
    const coarsePointer = window.matchMedia('(pointer: coarse)');
    const ui = document.createElement('aside');
    ui.className = 'frontier';
    ui.hidden = true;
    const state = document.createElement('div');
    state.className = 'frontier-state';
    state.setAttribute('role', 'status');
    const equipment = document.createElement('div');
    equipment.className = 'frontier-equipment';
    const dock = document.createElement('div');
    dock.className = 'mobile-field-dock';
    dock.setAttribute('role', 'group');
    dock.setAttribute('aria-label', document.documentElement.lang.startsWith('zh') ? '战场工具' : 'Field tools');
    dock.hidden = true;
    document.body.append(dock);
    const dockTools = [];
    function syncDock(touch, playing) {
      const buttonHost = touch ? dock : actions;
      for (const name of ['view', 'backpack']) {
        if (buttons[name].parentNode !== buttonHost) buttonHost.append(buttons[name]);
      }
      for (const tool of dockTools) {
        const host = touch ? dock : document.body;
        if (tool.parentNode !== host) host.append(tool);
      }
      dock.hidden = !touch || !playing;
    }
    const actions = document.createElement('div');
    actions.className = 'frontier-actions';
    const useBar = document.createElement('div');
    useBar.className = 'frontier-usebar';
    useBar.setAttribute('role', 'group');
    useBar.setAttribute('aria-label', strings.useItems);
    const buttons = {};
    function button(id, act, parent = actions) {
      const node = document.createElement('button');
      node.type = 'button';
      node.hidden = true;
      node.addEventListener('pointerdown', event => event.stopPropagation());
      node.addEventListener('click', event => { event.stopPropagation(); act(); });
      parent.append(node);
      buttons[id] = node;
    }
    button('jump', jump);
    button('pick', pick);
    button('view', toggleView);
    button('backpack', openBackpack);
    buttons.backpack.setAttribute('aria-keyshortcuts', '0 O');
    buttons.backpack.setAttribute('aria-haspopup', 'dialog');
    const backpack = document.createElement('dialog');
    backpack.className = 'frontier-backpack';
    backpack.setAttribute('aria-labelledby', 'frontier-backpack-title');
    const heading = document.createElement('header');
    const title = document.createElement('h2');
    title.id = 'frontier-backpack-title';
    title.textContent = strings.backpack;
    const capacity = document.createElement('p');
    const bagStatus = document.createElement('p');
    bagStatus.className = 'frontier-bag-status';
    bagStatus.setAttribute('role', 'status');
    button('close', () => closeBackpack(true), heading);
    buttons.close.hidden = false;
    buttons.close.textContent = strings.closeBackpack;
    heading.prepend(title);
    const contents = document.createElement('ul');
    const rows = {};
    for (const kind of Object.keys(rules.limits)) {
      const row = document.createElement('li');
      const label = document.createElement('span');
      row.append(label);
      if (rules.consumables.includes(kind)) {
        button('use-' + kind, () => use(kind), row);
        button('discard-' + kind, () => discard(kind), row);
      } else if (Object.hasOwn(rules.weaponKinds, kind)) {
        button('equip-' + kind, () => equipWeapon(kind), row);
      }
      rows[kind] = { row, label };
      contents.append(row);
    }
    const clothing = document.createElement('div');
    clothing.className = 'frontier-bag-outfits';
    clothing.hidden = true;
    const clothingTitle = document.createElement('h3');
    clothingTitle.textContent = strings.bagOutfits;
    const clothingRows = document.createElement('ul');
    clothing.append(clothingTitle, clothingRows);
    const empty = document.createElement('p');
    empty.textContent = strings.backpackEmpty;
    backpack.append(heading, capacity, contents, clothing, empty, bagStatus);
    backpack.addEventListener('cancel', event => {
      event.preventDefault();
      closeBackpack(true);
    });
    for (const kind of rules.consumables) {
      button(kind, () => use(kind), useBar);
      buttons[kind].setAttribute('aria-keyshortcuts', keys[kind]);
    }
    buttons.view.setAttribute('aria-keyshortcuts', 'V');
    ui.append(state, equipment, actions, useBar, backpack);
    document.getElementById('ui').append(ui);

    const drops = [];
    const unavailable = new Set();
    const replenish = new Map();
    const throwables = [];
    const blasts = [];
    const rig = new THREE.Group();
    const effectRoot = new THREE.Group();
    scene.add(effectRoot);
    let models, plane, chute, world, insertion, nearest, quiet, note = '', noteUntil = 0;
    let authoritative = false;
    let backpackRelock = false;
    let confirmingDiscard = null;
    let thirdPerson = false;
    let viewChosen = false;
    let action = null;
    let reloadAction = null;
    const heldPosition = new THREE.Vector3();
    const actionProps = new Map();
    let selfView = null;
    const firstPosition = new THREE.Vector3(), firstRotation = new THREE.Quaternion();
    let cameraChanged = false;
    let latestActions = '';
    let carriedOutfits = [];
    let renderedOutfits = '';
    let wasUnarmed = false;
    let inventory = rules.normalize();
    try { inventory = rules.normalize(JSON.parse(localStorage.getItem(localKey))); } catch { /* optional storage */ }
    const rawDamage = player.damage.bind(player);
    const rawSpawn = game.enemies.spawn.bind(game.enemies);
    const clock = () => performance.now();
    const currentMap = () => game.expedition?.active?.id || (game.qingyun?.active ? 'qingyun' : 'port');
    const mp = () => window.__mp;
    const canWearOutfit = session => !!session?.connected && !['hound', 'drone'].includes(session.soldier);
    const getModels = () => models ||= window.createFrontierModels(THREE);
    const availableWeapons = () => rules.availableWeapons(inventory, currentMap());
    function wheelBlocked() {
      const unit = window.__mp?.soldier;
      return game.game.state !== 'playing' || !player.alive || !player.enabled || !!insertion ||
        backpack.open || game.sedan?.riding || window.__saltBoat?.riding || game.weapon?.stub ||
        window.__SALT_FOCUS__?.active || game.roadSigns?.editing || !!document.querySelector('dialog[open]') ||
        ['drone', 'hound'].includes(unit) ||
        (input.ads && (game.weapon?.arsenalId || 'pac9') !== 'knife');
    }

    const weaponWheel = window.SaltPlayerCombat.weaponWheel({
      availableWeapons, wheelBlocked, equipWeapon,
      activeWeapon: () => game.weapon?.arsenalId || 'pac9',
      nextWeapon: (active, direction) => rules.cycleWeapon(inventory, currentMap(), active, direction),
      onError(error) {
        console.warn('[frontier] weapon wheel switch failed', error);
        show(window.__SALT_I18N__.messages.arsenal.failed);
      }
    });

    function show(text) {
      note = text;
      noteUntil = clock() + 2300;
      latestActions = '';
    }
    function saveOffline() {
      try { localStorage.setItem(localKey, JSON.stringify(inventory)); } catch { /* optional storage */ }
    }
    function sameArea(point) {
      const zone = game.expedition?.active;
      if (zone) return point.z >= zone.minZ && point.z <= zone.maxZ;
      if (game.qingyun?.active) {
        const { minZ, maxZ } = window.SaltQingyunZone.bounds;
        return point.z >= minZ && point.z <= maxZ;
      }
      return point.z >= -300;
    }
    function inSilence(point) {
      return quiet && quiet.map === currentMap() && clock() < quiet.until &&
        sameArea(point) && quiet.position.distanceToSquared(point) <= rules.quietRadius ** 2;
    }
    game.enemies.spawn = (kind, point, options) =>
      ['gull', 'hound'].includes(kind) && inSilence(point) ? null : rawSpawn(kind, point, options);

    player.damage = function (amount, origin) {
      if (!player.alive || player.invulnerable || amount > 100 || !inventory.vest) return rawDamage(amount, origin);
      const previous = inventory.vest;
      const actual = rules.absorb(inventory, amount, 'vest');
      if (inventory.vest < previous) {
        if (authoritative && mp()?.connected) mp().send({ type: 'frontierWear', amount: previous - inventory.vest });
        else if (!authoritative) saveOffline();
      }
      return rawDamage(actual, origin);
    };

    function silence() {
      quiet = { position: player.pos.clone(), map: currentMap(), until: clock() + rules.quietSeconds * 1000 };
      let count = 0;
      for (const unit of game.enemies.list.slice()) {
        if (unit.alive && ['hound', 'gull'].includes(unit.type) && inSilence(unit.pos)) {
          game.enemies.despawn(unit);
          count++;
        }
      }
      show(strings.suppressed.replace('{count}', count));
    }

    function setupDrops(environment) {
      if (world === environment) return;
      world = environment;
      groundLoading = false;
      drops.length = 0;
      rig.clear();
      rig.name = 'dustfall-supplies';
      world.scene.add(rig);
      for (const entry of rules.loot.values()) {
        const weapon = rules.weaponKinds[entry.kind];
        const model = weapon ? new THREE.Group() : getModels().item(entry.kind);
        const z = entry.z - rules.offset;
        const y = world.heightAt(entry.x, z);
        model.position.set(entry.x, y + .10, z);
        model.rotation.y = entry.id * 1.83;
        rig.add(model);
        drops.push({ entry, model, y, weapon, ready: !weapon });
      }
      plane = getModels().airplane();
      chute = getModels().parachute();
      plane.visible = chute.visible = false;
      world.scene.add(plane, chute);
    }

    let groundLoading = false;
    function prepareGroundWeapons() {
      const arsenal = window.SaltArsenal;
      if (groundLoading || !arsenal || !window.HunterAvatar) return;
      groundLoading = true;
      const byWeapon = new Map();
      for (const drop of drops) {
        if (!drop.weapon) continue;
        if (!byWeapon.has(drop.weapon)) byWeapon.set(drop.weapon, arsenal.groundModel(drop.weapon));
        byWeapon.get(drop.weapon).then(template => {
          drop.model.add(template.clone(true));
          drop.ready = true;
        }).catch(error => console.warn('[frontier] ground weapon:', error.message));
      }
    }

    async function equipWeapon(kind) {
      const id = rules.weaponKinds[kind];
      if (!id || insertion || !player.alive || game.game.state !== 'playing' ||
          !rules.canEquip(inventory, id, currentMap())) return false;
      const arsenal = window.SaltArsenal;
      if (!arsenal) return false;
      show(window.__SALT_I18N__.messages.arsenal.loading);
      if (await arsenal.equip(id)) {
        show(names[kind] + ' · ' + strings.equipped);
        mp()?.syncState();
        return true;
      }
      show(window.__SALT_I18N__.messages.arsenal.failed);
      return false;
    }

    function picked(kind) {
      show(strings.picked.replace('{item}', names[kind]));
      if (rules.weaponKinds[kind] && !rules.canEquip(inventory, game.weapon.arsenalId || 'pac9', currentMap())) {
        void equipWeapon(kind);
      }
    }

    function begin(environment, point, insert) {
      closeBackpack(false);
      selfView ||= mp()?.createSelfView?.();
      setupDrops(environment);
      prepareGroundWeapons();
      if (!viewChosen) {
        thirdPerson = true;
        viewChosen = true;
      }
      if (!insert) return;
      insertion = { anchor: new THREE.Vector3(point.x, point.y, point.z), phase: 'plane', elapsed: 0,
        yaw: -Math.PI / 2, pitch: -.32, protected: player.invulnerable };
      player.invulnerable = true;
      player.vel.set(0, 0, 0);
      player.pos.set(flight.routeStart, point.y + flight.flightHeight, point.z);
      game.weapon.setVisible(false);
      plane.visible = true;
      nearest = null;
      stepInsertion(0);
    }
    function leave() {
      resetViewTrace();
      hasPresentedView = false;
      latestActions = '';
      action = reloadAction = null;
      closeBackpack(false);
      selfView?.dispose();
      selfView = null;
      if (insertion) player.invulnerable = insertion.protected;
      insertion = null;
      nearest = null;
      if (plane) plane.visible = chute.visible = false;
      for (const trail of throwables.splice(0)) effectRoot.remove(trail.mesh);
      for (const blast of blasts.splice(0)) { effectRoot.remove(blast.mesh); blast.mesh.material.dispose(); }
      ui.hidden = true;
      dock.hidden = true;
    }
    function jump() {
      if (insertion?.phase !== 'plane') return;
      insertion.phase = 'fall';
      insertion.jumpPoint = player.pos.clone();
      player.yaw = insertion.yaw;
      player.pitch = insertion.pitch;
    }
    function stepInsertion(dt) {
      const drop = insertion;
      drop.elapsed += dt;
      const anchor = drop.anchor;
      if (drop.phase === 'plane') {
        const x = Math.min(flight.routeEnd, flight.routeStart + drop.elapsed * flight.planeSpeed);
        drop.yaw -= input.look?.dx || 0;
        drop.pitch = THREE.MathUtils.clamp(drop.pitch - (input.look?.dy || 0), -1.38, .5);
        plane.position.set(x, anchor.y + flight.flightHeight + 1, anchor.z - rules.offset);
        plane.rotation.y = Math.PI / 2;
        for (const prop of plane.userData.props) prop.rotation.z += dt * 36;
        player.pos.set(x, anchor.y + flight.flightHeight, anchor.z);
        player.yaw = drop.yaw;
        player.pitch = drop.pitch;
        const frameWidth = Math.tan(camera.fov * Math.PI / 360) * camera.aspect;
        const distance = Math.max(25, 14 / Math.max(.15, frameWidth));
        camera.position.copy(player.pos);
        camera.position.x -= distance;
        camera.position.y += distance * .32;
        camera.rotation.set(drop.pitch, drop.yaw, 0, 'YXZ');
        if (x >= flight.routeEnd || input.pressed?.('jump')) jump();
        return;
      }
      if (plane.visible) {
        plane.position.x += flight.planeSpeed * dt;
        if (plane.position.x > flight.routeEnd + 65) plane.visible = false;
        for (const prop of plane.userData.props) prop.rotation.z += dt * 36;
      }
      const groundBelow = physics.groundHeight(player.pos.x, player.pos.z, player.pos.y);
      if (player.pos.y - groundBelow <= flight.canopyHeight) drop.phase = 'canopy';
      const gliding = drop.phase === 'canopy';
      const speed = gliding ? flight.glideSpeed : flight.fallSpeed;
      player.yaw -= input.look?.dx || 0;
      player.pitch = THREE.MathUtils.clamp(player.pitch - (input.look?.dy || 0), -1.35, .8);
      const side = Number(input.move?.x) || 0;
      const ahead = Number(input.move?.y) || (Math.abs(side) < .01 ? 1 : 0);
      const stride = speed * dt / Math.max(1, Math.hypot(side, ahead));
      const dx = (side * Math.cos(player.yaw) - ahead * Math.sin(player.yaw)) * stride;
      const dz = (-side * Math.sin(player.yaw) - ahead * Math.cos(player.yaw)) * stride;
      const fromJumpX = player.pos.x + dx - drop.jumpPoint.x;
      const fromJumpZ = player.pos.z + dz - drop.jumpPoint.z;
      const scale = Math.min(1, flight.radius / Math.max(1, Math.hypot(fromJumpX, fromJumpZ)));
      player.pos.x = THREE.MathUtils.clamp(drop.jumpPoint.x + fromJumpX * scale, rules.bounds.minX + 1, rules.bounds.maxX - 1);
      player.pos.z = THREE.MathUtils.clamp(drop.jumpPoint.z + fromJumpZ * scale, rules.bounds.minZ + 1, rules.bounds.maxZ - 1);
      const terrain = world.heightAt(player.pos.x, player.pos.z - rules.offset);
      const ground = Math.max(terrain, physics.groundHeight(player.pos.x, player.pos.z, player.pos.y + .75));
      player.pos.y = Math.max(ground, player.pos.y - (gliding ? flight.glideSink : flight.fallSink) * dt);
      player.syncView();
      chute.visible = drop.phase === 'canopy';
      chute.position.set(player.pos.x, player.pos.y + 1, player.pos.z - rules.offset);
      chute.rotation.set(.15 * ahead, player.yaw, -.17 * side);
      const view = ensureSelfView();
      if (view) {
        view.update(dt, rules.equipmentFlags(inventory), false);
        view.model.visible = true;
      }
      const yaw = player.yaw;
      const elevation = THREE.MathUtils.clamp(.31 - player.pitch * .37, .08, .81);
      const frameWidth = Math.tan(camera.fov * Math.PI / 360) * camera.aspect;
      const distance = gliding ? Math.max(16, 5.3 / Math.max(.15, frameWidth)) : 9;
      const horizontal = distance * Math.cos(elevation);
      const targetY = player.pos.y + (gliding ? 3.1 : .9);
      camera.position.set(player.pos.x + Math.sin(yaw) * horizontal,
        targetY + distance * Math.sin(elevation), player.pos.z + Math.cos(yaw) * horizontal);
      camera.lookAt(player.pos.x, targetY, player.pos.z);
      if (player.pos.y <= ground + .02) {
        player.lastSafe.copy(player.pos);
        player.vel.set(0,0,0);
        player.onGround = true;
        if (authoritative && mp()?.connected) mp().send({ type: 'frontierLand', point: {
          x: player.pos.x, y: player.pos.y, z: player.pos.z } });
        player.invulnerable = drop.protected;
        insertion = null;
        player.syncView();
        plane.visible = chute.visible = false;
        if (selfView) selfView.model.visible = false;
        mp()?.resetFlight();
        mp()?.syncState();
        show(strings.landed);
      }
    }

    function pick() {
      if (!nearest || insertion || game.game.state !== 'playing' || !player.alive) return;
      const { entry, issue } = nearest;
      if (issue) {
        show(strings[issue]);
        return;
      }
      if (authoritative && mp()?.connected) {
        mp().syncState();
        mp().send({ type: 'frontierPick', id: entry.id });
      } else if (!authoritative && rules.collect(inventory, entry.kind)) {
        unavailable.add(entry.id);
        replenish.set(entry.id, clock() + rules.replenishMs);
        saveOffline();
        picked(entry.kind);
      }
    }
    function openBackpack() {
      if (backpack.open || insertion || !player.alive || game.game.state !== 'playing' ||
          game.roadSigns?.editing || window.SaltModal?.isOpen || document.querySelector('dialog[open]') ||
          window.__SALT_FOCUS__?.active) return;
      window.__mp?.closeRoster?.();
      backpackRelock = input.locked;
      ui.hidden = false;
      backpack.showModal();
      input.setGameplay(false);
      input.exitLock();
      updateHud(currentMap() === rules.map);
      buttons.close.focus();
    }

    function closeBackpack(relock) {
      if (!backpack.open) return;
      backpack.close();
      confirmingDiscard = null;
      latestActions = '';
      if (game.game.state === 'playing' && player.alive && !window.__SALT_FOCUS__?.active) {
        input.setGameplay(true);
        if (relock && backpackRelock) input.requestLock();
      }
      backpackRelock = false;
    }

    function discard(kind) {
      if (!backpack.open || !player.alive || game.game.state !== 'playing' || !inventory[kind]) return;
      if (confirmingDiscard !== kind) {
        confirmingDiscard = kind;
        updateHud(currentMap() === rules.map);
        return;
      }
      confirmingDiscard = null;
      latestActions = '';
      if (authoritative) {
        if (mp()?.connected) mp().send({ type: 'frontierDiscard', item: kind });
      } else {
        inventory[kind]--;
        saveOffline();
        show(strings.discarded.replace('{item}', names[kind]));
      }
    }

    function landingPoint() {
      const start = player.eye.clone();
      const direction = player.forward.clone();
      const wall = physics.raycast(start, direction, 10);
      const result = start.addScaledVector(direction, wall ? Math.max(.65, wall.dist - .6) : 9);
      result.y = Math.max(player.pos.y - 5, physics.groundHeight(result.x, result.z, result.y + .5)) + .22;
      return { x: result.x, y: result.y, z: result.z };
    }
    function use(kind) {
      if (!inventory[kind] || insertion || game.game.state !== 'playing' || !player.alive ||
          window.__SALT_FOCUS__?.active) return;
      if ((kind === 'drink' || kind === 'medkit') && player.health >= player.maxHealth) {
        show(strings.fullHealth);
        return;
      }
      confirmingDiscard = null;
      if (authoritative) {
        if (!mp()?.connected) return;
        mp().syncState();
        if (!mp().send({ type: 'frontierUse', item: kind, health: player.health,
          ...(kind === 'grenade' ? { point: landingPoint() } : {}) })) return;
      } else {
        inventory[kind]--;
        saveOffline();
        if (kind === 'quiet') silence();
        else if (kind === 'grenade') {
          const point = landingPoint();
          playAction('grenade', rules.throwWindup * 2);
          throwFx({ x: player.eye.x, y: player.eye.y, z: player.eye.z }, point, true, true);
        } else {
          player.heal(kind === 'drink' ? 25 : 65);
          if (kind === 'drink') playAction('drink', 1450);
        }
      }
      if (thirdPerson && (kind === 'drink' || kind === 'grenade')) closeBackpack(true);
    }
    const vector = point => new THREE.Vector3(point.x, point.y, point.z);
    function playAction(kind, duration) {
      if (!player.alive || insertion || game.game.state !== 'playing') return;
      const next = { kind, duration, start: clock(), grip: null };
      if (kind === 'reload') reloadAction = next;
      else action = next;
    }
    function actionPose() {
      const now = clock();
      if (action && now - action.start >= action.duration) action = null;
      if (reloadAction && now - reloadAction.start >= reloadAction.duration) reloadAction = null;
      const active = action || reloadAction;
      if (!active) return null;
      return window.SaltPlayerCombat.actionPose(THREE, active.kind, (now - active.start) / active.duration, heldPosition);
    }
    function heldProp(kind) {
      if (!actionProps.has(kind)) {
        const prop = getModels().item(kind === 'reload' ? 'magazine' : kind);
        prop.name = 'frontier-held-' + kind;
        actionProps.set(kind, prop);
      }
      return actionProps.get(kind);
    }
    function throwFx(start, point, local = false, ownThrow = false, delay = 0) {
      const mesh = getModels().item('grenade');
      mesh.position.copy(vector(start));
      effectRoot.add(mesh);
      const windup = delay || (local ? rules.throwWindup : 0);
      const gesture = ownThrow ? action : null;
      mesh.visible = !windup;
      throwables.push({ mesh, start: vector(start), point: vector(point), releaseAt: (gesture?.start ?? clock()) + windup,
        local, releasing: !!windup, gesture });
    }
    const blastGeo = new THREE.SphereGeometry(1, 12, 8);
    function explosion(point, local) {
      const center = vector(point);
      const mesh = new THREE.Mesh(blastGeo, new THREE.MeshBasicMaterial({
        color: 0xffb35d, transparent: true, depthWrite: false, opacity: .75
      }));
      effectRoot.add(mesh);
      mesh.position.copy(center);
      blasts.push({ mesh, t: 0 });
      game.fx.sparks?.(center, new THREE.Vector3(0, 1, 0), 20);
      if (local) game.combat.explode(center, 5, 60);
      else for (const unit of game.enemies.list) {
        const distance = unit.pos.distanceTo(center);
        if (unit.alive && sameArea(unit.pos) && distance < 5 && physics.lineOfSight(center, unit.pos)) {
          unit.damage(60 * (1 - distance / 5), unit.pos, unit.pos.clone().sub(center).normalize(), 'body');
        }
      }
    }
    function updateEffects(dt) {
      for (let i = throwables.length - 1; i >= 0; i--) {
        const trail = throwables[i];
        const elapsed = clock() - trail.releaseAt;
        if (elapsed < 0) continue;
        if (trail.releasing) {
          trail.releasing = false;
          if (trail.gesture?.grip) trail.start.copy(trail.gesture.grip);
          trail.mesh.visible = true;
        }
        const phase = Math.min(1, elapsed / 1050);
        trail.mesh.position.lerpVectors(trail.start, trail.point, phase);
        trail.mesh.position.y += Math.sin(phase * Math.PI) * 3.2;
        trail.mesh.rotation.x += dt * 10;
        if (phase < 1) continue;
        effectRoot.remove(trail.mesh);
        throwables.splice(i, 1);
        if (trail.local) explosion(trail.point, true);
      }
      for (let i = blasts.length - 1; i >= 0; i--) {
        const blast = blasts[i];
        blast.t += dt;
        blast.mesh.scale.setScalar(.15 + blast.t * 16);
        blast.mesh.material.opacity = Math.max(0, .75 * (1 - blast.t / .34));
        if (blast.t < .34) continue;
        effectRoot.remove(blast.mesh);
        blast.mesh.material.dispose();
        blasts.splice(i, 1);
      }
    }

    function refreshCarriedOutfits() {
      const shop = window.SaltShop;
      const next = shop?.cosmetics().map(key => shop.get(key)).filter(item => item?.kind === 'outfit') || [];
      if (next.length === carriedOutfits.length && next.every((item, index) => item.key === carriedOutfits[index].key)) return;
      carriedOutfits = next;
      latestActions = '';
      updateHud(currentMap() === rules.map);
    }

    function renderCarriedOutfits(outfit, canChange) {
      const key = JSON.stringify([outfit, canChange, carriedOutfits.map(item => item.key)]);
      if (key === renderedOutfits) return;
      renderedOutfits = key;
      clothing.hidden = carriedOutfits.length === 0;
      clothingRows.replaceChildren();
      if (clothing.hidden) return;
      const choices = [{ id: 'default', name: strings.bagDefaultOutfit },
        ...carriedOutfits.map(item => ({ id: item.id, name: window.SaltShop.label(item) }))];
      for (const choice of choices) {
        const row = document.createElement('li');
        const label = document.createElement('span');
        label.textContent = choice.name;
        row.append(label);
        if (canChange) {
          const wear = document.createElement('button');
          wear.type = 'button';
          wear.disabled = outfit === choice.id;
          wear.textContent = wear.disabled ? strings.equipped : strings.bagWearOutfit;
          wear.addEventListener('click', () => {
            const session = mp();
            if (!canWearOutfit(session)) return;
            if (choice.id !== 'default' && !window.SaltShop?.has('outfit:' + choice.id)) return;
            session.setSoldier(session.soldier, choice.id);
            updateHud(currentMap() === rules.map);
            clothingRows.querySelector('button:not([disabled])')?.focus();
          });
          row.append(wear);
        }
        clothingRows.append(row);
      }
    }

    function updateHud(inDustfall) {
      const touch = input.touch || coarsePointer.matches;
      const inLunar = currentMap() === 'lunar';
      const phase = insertion?.phase;
      const message = phase === 'plane' ? strings.inPlane : phase === 'fall' ? strings.fall :
        phase === 'canopy' ? strings.canopy : clock() < noteUntil ? note : inDustfall && !weapons.some(([kind]) => inventory[kind]) ? (touch ? strings.unarmedTouch : strings.unarmed) : '';
      const shortcut = text => touch ? text.replace(/ \[[^\]]+\]$/, '') : text;
      const pickText = nearest && (nearest.issue ? strings[nearest.issue] :
        shortcut(strings.pick.replace('{item}', names[nearest.entry.kind])));
      const playing = game.game.state === 'playing' && player.alive && !window.__SALT_FOCUS__?.active;
      const hasItems = carriedOutfits.length > 0 || Object.values(inventory).some(Boolean);
      const session = mp();
      const outfit = backpack.open ? session?.outfit || 'default' : 'default';
      const canChangeOutfit = canWearOutfit(session);
      const canPreviewOutfit = canChangeOutfit && carriedOutfits.length > 0;
      const cache = JSON.stringify([phase, message, pickText, inventory, inDustfall, inLunar, thirdPerson, viewChosen,
        playing, touch, backpack.open, confirmingDiscard, game.weapon.arsenalId, outfit, canChangeOutfit]);
      if (cache === latestActions) return;
      latestActions = cache;
      syncDock(touch, playing && !phase);
      ui.hidden = !playing || (!viewChosen && !backpack.open && !inDustfall && !inLunar && !hasItems && !message);
      ui.classList.toggle('frontier-touch', touch);
      ui.classList.toggle('frontier-dropping', !!phase);
      state.textContent = phase === 'plane' && touch ? strings.inPlaneTouch : message;
      state.hidden = !message;
      const activeKind = weapons.find(([, id]) => id === (game.weapon.arsenalId || 'pac9'))?.[0];
      equipment.textContent = [inventory[activeKind] && names[activeKind] + ' · ' + strings.equipped,
        inventory.helmet && names.helmet + ' ' + inventory.helmet,
        inventory.vest && names.vest + ' ' + inventory.vest,
        !touch && availableWeapons().length > 1 && strings.wheelSwitch].filter(Boolean).join('  ·  ');
      equipment.hidden = !equipment.textContent || !!phase;
      buttons.jump.hidden = phase !== 'plane';
      buttons.jump.textContent = shortcut(strings.jump);
      buttons.pick.hidden = !pickText || !!phase;
      buttons.pick.textContent = pickText || '';
      buttons.view.hidden = (!inDustfall && !inLunar && !viewChosen && !canPreviewOutfit) || !!phase || !player.alive;
      buttons.view.textContent = shortcut(thirdPerson ? strings.switchFirst : strings.switchThird);
      const slots = rules.usedSlots(inventory);
      const space = slots + '/' + rules.capacity;
      buttons.backpack.hidden = !!phase || !player.alive || (!inDustfall && !hasItems);
      buttons.backpack.textContent = strings.backpack + ' ' + space + (touch ? '' : ' [0]');
      if (backpack.open) {
        capacity.textContent = strings.capacity.replace('{space}', space);
        capacity.classList.toggle('frontier-bag-full', slots >= rules.capacity);
        empty.hidden = hasItems;
        renderCarriedOutfits(outfit, canChangeOutfit);
        bagStatus.textContent = confirmingDiscard ?
          strings.confirmDiscardItem.replace('{item}', names[confirmingDiscard]) : clock() < noteUntil ? note : '';
        bagStatus.hidden = !bagStatus.textContent;
        for (const [kind, { row, label }] of Object.entries(rows)) {
          row.hidden = !inventory[kind];
          const weapon = rules.weaponKinds[kind];
          if (weapon) {
            const equip = buttons['equip-' + kind];
            label.textContent = names[kind];
            equip.hidden = false;
            equip.disabled = kind === activeKind;
            equip.textContent = equip.disabled ? strings.equipped : strings.equipWeapon;
            continue;
          }
          const usable = rules.consumables.includes(kind);
          label.textContent = names[kind] + (usable ? ' ×' + inventory[kind] :
            ' · ' + strings.equipped + (kind === 'rifle' ? '' : ' ' + inventory[kind] + '/' + rules.limits[kind]));
          if (!usable) continue;
          const useButton = buttons['use-' + kind];
          const discardButton = buttons['discard-' + kind];
          useButton.hidden = discardButton.hidden = false;
          useButton.textContent = strings.useOne;
          discardButton.textContent = confirmingDiscard === kind ? strings.confirmDiscard : strings.discardOne;
        }
      }
      useBar.hidden = !!phase || (!inDustfall && !rules.consumables.some(kind => inventory[kind]));
      for (const kind of rules.consumables) {
        buttons[kind].hidden = !!phase;
        buttons[kind].disabled = !inventory[kind];
        buttons[kind].textContent = names[kind] + ' ×' + inventory[kind] + ' [' + keys[kind] + ']';
      }
    }


    function toggleView() {
      if (insertion || !player.alive ||
          game.game.state !== 'playing' || window.__SALT_FOCUS__?.active) return;
      viewChosen = true;
      thirdPerson = !thirdPerson;
      resetViewTrace();
      updateHud(currentMap() === rules.map);
    }

    const shoulderView = window.SaltPlayerCombat.shoulderView(THREE, physics);
    const resetViewTrace = () => shoulderView.reset();
    const presentedPosition = new THREE.Vector3();
    const presentedRotation = new THREE.Quaternion();
    let hasPresentedView = false;
    let presentedThird = false;
    let presentedBody = false;
    let presentedFov;
    let restoreFov;
    let thirdPersonFrame = false;
    let restoreBody = false;

    function rememberView(third) {
      if (game.game.state !== 'playing') return;
      hasPresentedView = true;
      presentedThird = third;
      presentedBody = !!selfView?.model.visible;
      presentedPosition.copy(camera.position);
      presentedRotation.copy(camera.quaternion);
      presentedFov = camera.fov;
    }

    function ensureSelfView() {
      const session = mp();
      if (selfView && selfView.kind !== session?.soldier) {
        selfView.dispose();
        selfView = null;
      }
      return selfView ||= session?.createSelfView?.();
    }

    function beginView(dt, scoped) {
      if (game.game.state === 'paused' && hasPresentedView) {
        firstPosition.copy(camera.position);
        firstRotation.copy(camera.quaternion);
        restoreBody = !!selfView?.model.visible;
        if (selfView) selfView.model.visible = presentedBody;
        camera.position.copy(presentedPosition);
        camera.quaternion.copy(presentedRotation);
        if (camera.fov !== presentedFov) {
          restoreFov = camera.fov;
          camera.fov = presentedFov;
          camera.updateProjectionMatrix();
        }
        cameraChanged = true;
        thirdPersonFrame = presentedThird;
        return presentedThird;
      }
      if (insertion || game.sedan?.riding || scoped || input.ads || !thirdPerson || window.__saltBoat?.riding ||
          !player.alive || game.game.state !== 'playing' || window.__SALT_FOCUS__?.active) return false;
      if (!ensureSelfView()) return false;

      firstPosition.copy(camera.position);
      firstRotation.copy(camera.quaternion);
      const map = currentMap();
      if (!shoulderView.prepare(firstPosition, firstRotation, dt, map)) return false;

      const pose = actionPose();
      const showProp = pose && (pose.kind === 'drink' || (pose.kind === 'grenade' && pose.phase < .5) ||
        (pose.kind === 'reload' && pose.phase > .16 && pose.phase < .73));
      const grip = selfView.update(dt, rules.equipmentFlags(inventory), rules.canEquip(inventory, game.weapon.arsenalId || 'pac9', map),
        pose, showProp ? heldProp(pose.kind) : null);
      if (pose?.kind === 'grenade' && pose.phase < .5 && grip) action.grip = grip.clone();
      restoreBody = false;
      selfView.model.visible = true;
      cameraChanged = true;
      thirdPersonFrame = true;
      shoulderView.apply(camera, firstPosition);
      return true;
    }

    function endView() {
      if (!cameraChanged) return;
      cameraChanged = false;
      thirdPersonFrame = false;
      if (selfView) selfView.model.visible = restoreBody;
      camera.position.copy(firstPosition);
      camera.quaternion.copy(firstRotation);
      if (restoreFov !== undefined) {
        camera.fov = restoreFov;
        camera.updateProjectionMatrix();
        restoreFov = undefined;
      }
      camera.updateWorldMatrix(true, false);
    }

    function onMessage(message) {
      if (message.type === 'frontierInventory') {
        authoritative = true;
        inventory = rules.normalize(message.items);
      } else if (message.type === 'frontierStock') {
        unavailable.clear();
        for (const id of message.unavailable) unavailable.add(id);
      } else if (message.type === 'frontierPicked') picked(message.item);
      else if (message.type === 'frontierUsed') {
        if (message.item === 'quiet') silence();
        else if (Number.isFinite(message.health)) {
          player.health = message.health;
          if (message.item === 'drink') playAction('drink', 1450);
        }
      } else if (message.type === 'frontierThrow') {
        const ownThrow = !!message.thrower && message.thrower === mp()?.id;
        if (ownThrow) playAction('grenade', rules.throwWindup * 2);
        throwFx(message.start, message.point, false, ownThrow, message.windup || 0);
      } else if (message.type === 'frontierBlast') explosion(message.point, false);
      else if (message.type === 'frontierDiscarded') show(strings.discarded.replace('{item}', names[message.item]));
      else if (message.type === 'frontierDenied') show(
        ['bagFull', 'itemLimit'].includes(message.reason) ? strings[message.reason] : strings.saveDenied
      );
      else if (message.type === 'frontierLanded' && currentMap() === rules.map &&
          player.pos.distanceToSquared(vector(message.pos)) > 9) {
        player.pos.copy(vector(message.pos));
        player.lastSafe.copy(player.pos);
        player.syncView();
      }
    }
    game.events.on('weapon:reload', ({ phase, duration }) => {
      if (phase === 'start' && duration > 0) playAction('reload', duration * 1000);
      else if (phase === 'done') reloadAction = null;
    });
    game.events.on('game:state', ({ state: next }) => {
      if (next !== 'playing') {
        action = reloadAction = null;
        closeBackpack(false);
      }
    });
    window.addEventListener('keydown', event => {
      const backpackKey = backpackKeys.has(event.code) && !event.ctrlKey && !event.altKey && !event.metaKey;
      if (backpack.open) {
        if (event.code === 'Escape' || (backpackKey && !event.repeat &&
            !event.target?.closest?.('input, textarea, [contenteditable]'))) {
          event.preventDefault();
          event.stopImmediatePropagation();
          closeBackpack(true);
        }
        return;
      }
      if (event.repeat || event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey ||
          event.target?.closest?.('input, textarea, [contenteditable], dialog') ||
          game.game.state !== 'playing' || window.__SALT_FOCUS__?.active) return;
      if (!backpackKey && !['Space', 'KeyF', 'KeyV'].includes(event.code) && !itemKeys[event.code]) return;
      if (backpackKey && !insertion && !event.target?.closest?.('select')) openBackpack();
      else if (event.code === 'Space' && insertion?.phase === 'plane') jump();
      else if (event.code === 'KeyF' && nearest) pick();
      else if (event.code === 'KeyV' && !insertion && (viewChosen || currentMap() === rules.map || currentMap() === 'lunar' ||
          (carriedOutfits.length > 0 && canWearOutfit(mp())))) toggleView();
      else {
        const kind = itemKeys[event.code];
        if (!kind || !inventory[kind]) return;
        use(kind);
      }
      event.preventDefault();
      if (backpackKey) event.stopImmediatePropagation();
    }, { capture: true });
    game.renderer?.domElement?.addEventListener('wheel', weaponWheel.onWheel, { passive: false });
    window.addEventListener('saltline:shop', refreshCarriedOutfits);
    if (window.SaltShop) refreshCarriedOutfits();
    return game.frontier = {
      begin, leave, onMessage, beginView, endView, rememberView, serverDamage: rawDamage,
      registerDockTool(tool) { dockTools.push(tool); latestActions = ''; },
      get prefersThirdPerson() { return thirdPerson; },
      get renderingThirdPerson() { return thirdPersonFrame; },
      get backpackOpen() { return backpack.open; },
      closeBackpack(relock = false) { closeBackpack(relock); },
      get airborne() { return !!insertion; },
      get equipmentFlags() { return rules.equipmentFlags(inventory); },
      get availableWeaponIds() { return availableWeapons().map(([, id]) => id); },
      canEquipWeapon(id) { return rules.canEquip(inventory, id, currentMap()); },
      switchWeapon(direction) { return weaponWheel.cycleWeapon(direction); },
      get canFire() { return this.canEquipWeapon(game.weapon.arsenalId || 'pac9'); },
      update(dt, insertionDt = dt) {
        const inDustfall = currentMap() === rules.map;
        if (backpack.open && (!player.alive || game.game.state !== 'playing' || window.__SALT_FOCUS__?.active)) {
          closeBackpack(false);
        }
        nearest = null;
        let blocked = null;
        const slots = rules.usedSlots(inventory);
        if (!authoritative) for (const [id, until] of replenish) {
          if (clock() >= until) { unavailable.delete(id); replenish.delete(id); }
        }
        if (inDustfall) prepareGroundWeapons();
        if (inDustfall) for (const drop of drops) {
          if (!drop.ready) continue;
          const distance = Math.hypot(player.pos.x - drop.entry.x, player.pos.z - drop.entry.z);
          const available = !unavailable.has(drop.entry.id);
          drop.model.visible = available && distance < 49;
          if (drop.model.visible) {
            drop.model.position.y = drop.y + (drop.weapon ? .045 : .11 + Math.sin(game.time.t * 2.1 + drop.entry.id) * .035);
          }
          if (!available || insertion || !player.alive || distance >= (nearest?.distance ?? 3) ||
              Math.abs(player.pos.y - drop.y) >= 2.3 ||
              !physics.lineOfSight(player.eye, new THREE.Vector3(drop.entry.x, drop.y + .35, drop.entry.z))) continue;
          const issue = rules.pickupIssue(inventory, drop.entry.kind, slots);
          if (!issue) nearest = { ...drop, distance };
          else if (distance < (blocked?.distance ?? 3)) blocked = { ...drop, distance, issue };
        }
        nearest ||= blocked;
        updateEffects(dt);
        if (insertion) stepInsertion(insertionDt);
        const unarmed = !this.canFire || !!insertion;
        if (unarmed !== wasUnarmed) {
          game.weapon.setVisible(!unarmed);
          game.hud.root?.classList.toggle('frontier-unarmed', unarmed);
          wasUnarmed = unarmed;
        }
        updateHud(inDustfall);
      }
    };
  };
})();
