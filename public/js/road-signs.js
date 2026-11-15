(() => {
  'use strict';

  window.installRoadSigns = function (game) {
    const { THREE, scene, camera, player, physics, input } = game;
    const { protectedSpot } = window.SaltRoadSignRules;
    const { sweep, model: { post, collar, board } } = window.SaltRoadSignPhysics;
    const currentMap = () => game.expedition?.active?.id || (game.qingyun?.active ? 'qingyun' : null);
    const english = document.documentElement.lang === 'en-US';
    const tr = (zh, en) => english ? en : zh;
    const text = {
      place: tr('立路牌', 'Place sign'),
      remove: tr('拔路牌', 'Remove sign'),
      cancel: tr('取消', 'Cancel'),
      label: tr('牌面文字', 'Sign text'),
      help: tr('瞄准五米内的地面，可在绿色标记处立牌。', 'Aim at the ground within five metres. The green marker shows where the sign will go.'),
      rules: tr('路牌会一直留在原地。只有你能拔除，最早是次日零点（北京时间）。', 'The sign stays in place. Only you can remove it, from midnight the next day in Beijing time.'),
      blue: tr('蓝底白字', 'Blue with white letters'),
      yellow: tr('黄底黑字', 'Yellow with black letters'),
      offline: tr('联网后才能立路牌。', 'Connect to multiplayer to place a sign.'),
      flagged: tr('你的路牌已被标记违规，牌面文字已替换。', 'Your road sign was flagged and its displayed text replaced.'),
      placed: tr('路牌已立好。', 'Sign planted.'),
      removed: tr('路牌已拔除。', 'Sign removed.'),
      confirm: tr('拔除这块路牌？', 'Remove this sign?'),
      reason: {
        occupied: tr('附近已经有路牌，请换个位置。', 'A sign is already here. Pick another spot.'),
        tomorrow: tr('次日零点（北京时间）后才能拔掉自己的牌子。', 'You can remove your sign from midnight the next day in Beijing time.'),
        owner: tr('只能拔除自己的路牌。', 'You can only remove your own signs.'),
        range: tr('请靠近并瞄准平坦的地面。', 'Move closer and aim at flat ground.'),
        gate: tr('传送门和落点周围 10 米内不能立路牌。', 'Keep signs at least 10 m from portals and arrival points.'),
        text: tr('请输入可公开展示的文字，最多 32 字。', 'Enter up to 32 characters suitable for public display.'),
        map: tr('请在青云宗或远征地图内操作。', 'Road signs are available in Qingyun and the expedition maps.'),
        identity: tr('请启用本站 Cookie 后刷新。', 'Enable cookies for this site and reload.'),
        storage: tr('路牌保存暂时失败，请重试。', 'Could not save the sign. Try again.'),
        busy: tr('操作过快，请稍等。', 'Wait a moment and try again.')
      }
    };

    const holder = new THREE.Group();
    holder.name = 'expedition-road-signs';
    holder.visible = false;
    scene.add(holder);
    const postGeom = new THREE.CylinderGeometry(post.topRadius, post.bottomRadius, post.height, 8);
    const collarGeom = new THREE.CylinderGeometry(collar.topRadius, collar.bottomRadius, collar.high - collar.low, 8);
    const backGeom = new THREE.BoxGeometry(board.width, board.height, board.depth);
    const plateGeom = new THREE.PlaneGeometry(board.width, board.height);
    const metal = new THREE.MeshStandardMaterial({ color: 0x8d98a0, metalness: .76, roughness: .31 });
    const marker = new THREE.Mesh(
      new THREE.RingGeometry(.18, .25, 20).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x8cffac, transparent: true, opacity: .8, depthWrite: false })
    );
    marker.visible = false;
    holder.add(marker);

    const toolbar = document.createElement('div');
    toolbar.className = 'road-sign-tools';
    toolbar.hidden = true;
    const make = document.createElement('button');
    make.type = 'button';
    make.textContent = text.place;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = text.remove;
    remove.hidden = true;
    toolbar.append(make, remove);
    document.body.append(toolbar);

    const dialog = document.createElement('dialog');
    dialog.className = 'road-sign-dialog';
    dialog.innerHTML = '<form><h2></h2><p></p><label><span></span><input required maxlength="64" autocomplete="off"></label><select></select><footer><button type="button"></button><button type="submit"></button></footer></form>';
    const form = dialog.querySelector('form');
    const heading = dialog.querySelector('h2');
    const detail = dialog.querySelector('p');
    const field = dialog.querySelector('label');
    const value = dialog.querySelector('input');
    const style = dialog.querySelector('select');
    const [cancel, confirm] = dialog.querySelectorAll('button');
    field.querySelector('span').textContent = text.label;
    style.setAttribute('aria-label', tr('牌面颜色', 'Sign colors'));
    style.append(new Option(text.blue, 'blue'), new Option(text.yellow, 'yellow'));
    cancel.textContent = text.cancel;
    document.body.append(dialog);

    const notices = document.createElement('div');
    notices.className = 'road-sign-message';
    notices.setAttribute('role', 'status');
    notices.hidden = true;
    document.body.append(notices);
    let noticeTimer;
    function notice(message) {
      notices.textContent = message;
      notices.hidden = false;
      clearTimeout(noticeTimer);
      noticeTimer = setTimeout(() => { notices.hidden = true; }, 3600);
    }

    let map = null;
    let target = null;
    let editor = null;
    let mp;
    let unsubscribe;
    let lastCheck = 0;
    let listAt = -Infinity;
    const lastList = new THREE.Vector3();
    const origin = new THREE.Vector3();
    const direction = new THREE.Vector3();
    const entries = new Map();
    const models = new Map();
    const buildQueue = new Set();
    const planarDistance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

    const signClock = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    });
    function timestamp(value) {
      if (!Number.isFinite(value) || value <= 0) return '';
      const parts = Object.fromEntries(signClock.formatToParts(value).map(({ type, value }) => [type, value]));
      return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
    }

    function build(sign) {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 170;
      const ctx = canvas.getContext('2d');
      const yellow = sign.style === 'yellow';
      const ink = yellow ? '#151a1f' : '#f4f9ff';
      const gradient = ctx.createLinearGradient(0, 0, 0, 170);
      gradient.addColorStop(0, yellow ? '#ffe16e' : '#2266b9');
      gradient.addColorStop(1, yellow ? '#eeb526' : '#0d3a82');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 170);
      ctx.strokeStyle = ink;
      ctx.lineWidth = 5;
      ctx.strokeRect(10, 10, 492, 150);
      ctx.fillStyle = '#acb7c2';
      for (const x of [23, 489]) for (const y of [23, 147]) {
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      const time = timestamp(sign.submittedAt);
      const glyphs = Array.from(sign.text);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = ink;
      ctx.font = 'bold 60px system-ui, sans-serif';
      if (ctx.measureText(sign.text).width <= 450) ctx.fillText(sign.text, 256, time ? 69 : 86);
      else {
        const middle = Math.ceil(glyphs.length / 2);
        ctx.font = 'bold 47px system-ui, sans-serif';
        ctx.fillText(glyphs.slice(0, middle).join(''), 256, time ? 49 : 58, 450);
        ctx.fillText(glyphs.slice(middle).join(''), 256, time ? 98 : 114, 450);
      }

      if (time) {
        ctx.font = '500 20px ui-monospace, monospace';
        ctx.fillText(time, 256, 139);
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const face = new THREE.MeshBasicMaterial({ map: texture });
      const base = new THREE.Group();
      const pole = new THREE.Mesh(postGeom, metal);
      const backing = new THREE.Mesh(backGeom, metal);
      const mount = new THREE.Mesh(collarGeom, metal);
      pole.position.y = post.height / 2;
      mount.position.y = (collar.low + collar.high) / 2;
      backing.position.y = board.center;
      base.add(pole, mount, backing);
      for (const side of [1, -1]) {
        const plate = new THREE.Mesh(plateGeom, face);
        plate.position.set(0, board.center, side * board.faceOffset);
        plate.rotation.y = side === 1 ? 0 : Math.PI;
        base.add(plate);
      }
      base.position.copy(sign.pos);
      base.rotation.y = sign.yaw;
      base.updateMatrix();
      base.matrixAutoUpdate = false;
      holder.add(base);
      models.set(sign.id, { base, face, texture });
    }

    function erase(id) {
      buildQueue.delete(id);
      entries.delete(id);
      const model = models.get(id);
      if (!model) return;
      holder.remove(model.base);
      model.texture.dispose();
      model.face.dispose();
      models.delete(id);
    }

    function accept(sign) {
      const previous = entries.get(sign.id);
      if (previous && (previous.text !== sign.text || previous.submittedAt !== sign.submittedAt || previous.suppressed !== sign.suppressed)) erase(sign.id);
      entries.set(sign.id, sign);
      if (!sign.suppressed && !models.has(sign.id)) buildQueue.add(sign.id);
    }

    function receive(msg) {
      if (msg.type === 'signFlagged') {
        notice(text.flagged);
        return;
      }
      if (msg.type === 'signResult') {
        notice(msg.reason ? (text.reason[msg.reason] || text.reason.storage) : (msg.removed ? text.removed : text.placed));
        return;
      }
      if (msg.map !== map) return;
      if (msg.type === 'signList' && Array.isArray(msg.signs)) {
        const ids = new Set(msg.signs.map(sign => sign.id));
        for (const id of entries.keys()) if (!ids.has(id)) erase(id);
        for (const sign of msg.signs) accept(sign);
      } else if (msg.type === 'signChange') {
        if (msg.removed) erase(msg.id);
        else if (msg.sign) accept(msg.sign);
      }
    }

    function coords() {
      if (!map || !player.onGround || mp?.soldier === 'drone') return null;
      camera.getWorldPosition(origin);
      camera.getWorldDirection(direction);
      if (direction.y > -.13) return null;
      const hit = physics.raycast(origin, direction, 7);
      if (!hit || hit.surface === 'road-sign' || hit.normal.y < .65 || planarDistance(hit.point, player.pos) > 5 ||
          Math.abs(hit.point.y - player.pos.y) > 2.5) return null;
      const floor = physics.groundHeight(hit.point.x, hit.point.z, hit.point.y + .35);
      if (Math.abs(floor - hit.point.y) > .75) return null;
      hit.point.y = floor;
      return hit.point;
    }

    function ownsNearby() {
      let nearest = null;
      let best = 5;
      for (const sign of entries.values()) {
        if (!sign.own || Math.abs(sign.pos.y - player.pos.y) > 3) continue;
        const distance = planarDistance(sign.pos, player.pos);
        if (distance < best) { nearest = sign; best = distance; }
      }
      return nearest;
    }

    function open(mode) {
      if (!map || game.game.state !== 'playing' || editor) return;
      if (!mp?.connected) { notice(text.offline); return; }
      const entry = mode === 'place' ? coords() : ownsNearby();
      if (!entry) { notice(mode === 'place' ? text.help : text.reason.range); return; }
      if (mode === 'place' && protectedSpot(map, entry)) { notice(text.reason.gate); return; }
      editor = { mode, entry, map, relock: input.locked };
      heading.textContent = mode === 'place' ? text.place : text.confirm;
      detail.textContent = mode === 'place' ? text.rules : entry.text;
      field.hidden = style.hidden = mode !== 'place';
      value.disabled = mode !== 'place';
      value.value = '';
      value.setCustomValidity('');
      confirm.textContent = mode === 'place' ? text.place : text.remove;
      input.setGameplay(false);
      input.exitLock();
      dialog.showModal();
      if (mode === 'place') value.focus();
      else cancel.focus();
    }

    function close(relock) {
      if (!editor) return;
      const wasLocked = editor.relock;
      editor = null;
      dialog.close();
      if (game.game.state === 'playing') {
        input.setGameplay(true);
        if (relock && wasLocked) input.requestLock();
      }
    }

    make.addEventListener('click', () => open('place'));
    remove.addEventListener('click', () => open('remove'));
    value.addEventListener('input', () => value.setCustomValidity(''));
    cancel.addEventListener('click', () => close(true));
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(true); });
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!editor || editor.map !== map || !mp?.connected) { close(false); return; }
      const { mode, entry } = editor;
      const words = value.value.trim();
      if (mode === 'place' && (!words || Array.from(words).length > 32)) {
        value.setCustomValidity(text.reason.text);
        value.reportValidity();
        return;
      }
      mp.syncState();
      if (mode === 'place') mp.send({ type: 'signPlace', pos: { x: entry.x, y: entry.y, z: entry.z }, text: words, style: style.value });
      else mp.send({ type: 'signRemove', id: entry.id });
      close(true);
    });
    window.addEventListener('keydown', event => {
      if (editor) { event.stopImmediatePropagation(); return; }
      if (!map || game.game.state !== 'playing' || event.repeat || event.ctrlKey || event.metaKey ||
          event.altKey || event.target?.matches?.('input, textarea, select, [contenteditable]')) return;
      if (event.code !== 'KeyB' && event.code !== 'Delete') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      open(event.code === 'KeyB' ? 'place' : 'remove');
    }, true);
    // Keep native typing/IME event handling while preventing the game from seeing key releases.
    dialog.addEventListener('keyup', event => event.stopPropagation());

    function findHit(from, delta, radius, height) {
      if (!map || map !== currentMap() || !entries.size) return null;
      let best = null;
      for (const entry of entries.values()) {
        if (entry.suppressed) continue;
        const hit = sweep(from, delta, entry, radius, height, best?.at ?? 1);
        if (hit) best = hit;
      }
      return best;
    }

    const baseMove = physics.moveCapsule.bind(physics);
    const baseRaycast = physics.raycast.bind(physics);
    const delta = new THREE.Vector3();
    const moveStart = new THREE.Vector3();
    const baseGround = physics.groundHeight.bind(physics);
    function beforeHit(hit, motion) {
      return Math.max(0, hit.at - .002 / Math.max(.002, motion.length()));
    }

    physics.moveCapsule = (pos, vel, dt, radius = .32, height = 1.8, grounded = true) => {
      if (!entries.size || !map || map !== currentMap()) return baseMove(pos, vel, dt, radius, height, grounded);
      moveStart.copy(pos);
      const movingUp = vel.y > 0;
      const state = baseMove(pos, vel, dt, radius, height, grounded);
      let collided = false;
      // Both map solvers move along X, then Z. Use their actual motion so
      // terrain collisions and sliding along the sign resolve in the same order.
      for (const axis of ['x', 'z']) {
        delta.set(0, 0, 0);
        delta[axis] = pos[axis] - moveStart[axis];
        const hit = findHit(moveStart, delta, radius, height);
        if (hit) {
          pos[axis] = moveStart[axis] + delta[axis] * beforeHit(hit, delta);
          vel[axis] = 0;
          state.hitWall = true;
          collided = true;
        }
        moveStart[axis] = pos[axis];
      }
      if (collided && state.onGround) {
        const floor = baseGround(pos.x, pos.z, moveStart.y + .45);
        if (floor >= moveStart.y - .45) pos.y = floor;
        else { pos.y = moveStart.y; state.onGround = false; }
      }
      delta.set(0, pos.y - moveStart.y, 0);
      const vertical = findHit(moveStart, delta, radius, height);
      if (vertical) {
        pos.y = moveStart.y + delta.y * beforeHit(vertical, delta);
        vel.y = 0;
        state.onGround = !movingUp && vertical.normal.y > 0;
        state.hitCeil = movingUp && vertical.normal.y < 0;
        state.surface = 'metal';
      }
      return state;
    };

    const castDelta = new THREE.Vector3();
    physics.raycast = (from, dir, limit = 500) => {
      const base = baseRaycast(from, dir, limit);
      const range = Math.min(limit, base?.dist ?? limit);
      castDelta.copy(dir).multiplyScalar(range);
      const hit = findHit(from, castDelta, 0, 0);
      if (!hit) return base;
      const dist = hit.at * range;
      return { dist, point: from.clone().addScaledVector(dir, dist),
        normal: new THREE.Vector3(hit.normal.x, hit.normal.y, hit.normal.z), surface: 'road-sign', box: null };
    };

    game.roadSigns = {
      get editing() { return !!editor; },
      clipDrone(previous, next) {
        if (!previous || !map || map !== currentMap()) return next;
        const droneMotion = delta.copy(next).sub(previous);
        if (droneMotion.lengthSq() > 144) return next;
        const hit = findHit(previous, droneMotion, .42, .84);
        return hit ? next.copy(previous).addScaledVector(droneMotion, beforeHit(hit, droneMotion)) : next;
      },
      update() {
        const nextMap = currentMap();
        if (nextMap !== map) {
          close(false);
          for (const id of entries.keys()) erase(id);
          map = nextMap;
          listAt = -Infinity;
          lastCheck = 0;
          target = null;
        }
        const playing = !!map && player.alive && game.game.state === 'playing';
        holder.visible = !!map;
        toolbar.hidden = !playing;
        if (!playing) {
          close(false);
          marker.visible = false;
          return;
        }
        if (mp !== window.__mp) {
          unsubscribe?.();
          mp = window.__mp;
          unsubscribe = mp?.onMessage(receive);
        }
        const now = performance.now();
        if (!mp?.connected) listAt = -Infinity;
        else if (now - listAt >= 700 && (now - listAt >= 8000 || planarDistance(lastList, player.pos) >= 12)) {
          mp.syncState();
          if (mp.send({ type: 'signList' })) {
            lastList.copy(player.pos);
            listAt = now;
          }
        }
        if (now >= lastCheck) {
          lastCheck = now + 90;
          target = editor?.mode === 'place' ? editor.entry : coords();
          remove.hidden = !ownsNearby();
          const eligible = target && !protectedSpot(map, target) &&
            !Array.from(entries.values()).some(sign => planarDistance(sign.pos, target) < 3);
          marker.visible = !!eligible;
          if (eligible) marker.position.set(target.x, target.y + .024, target.z);
        }
        // A dense roadside must not upload all of its label textures in one frame.
        let built = 0;
        for (const id of buildQueue) {
          buildQueue.delete(id);
          build(entries.get(id));
          if (++built === 2) break;
        }
      }
    };
  };
})();
