(() => {
  'use strict';
  window.installGold = game => {
    const { THREE, scene, player } = game;
    const tr = (zh, en) => document.documentElement.lang === 'en-US' ? en : zh;
    const { format } = window.SaltGoldRules;
    const group = new THREE.Group();
    group.name = 'gold-dispatch';
    scene.add(group);
    const metal = new THREE.MeshStandardMaterial({ color: 0xffbd39, metalness: .64, roughness: .27, emissive: 0x8d4f00, emissiveIntensity: .7 });
    const coin = new THREE.CylinderGeometry(.22, .22, .06, 14).rotateX(Math.PI / 2);
    const ring = new THREE.TorusGeometry(.35, .035, 8, 25);
    const entities = new Map();
    const drops = new Map();
    const hud = document.createElement('aside');
    hud.className = 'gold-hud';
    hud.hidden = true;
    hud.innerHTML = '<strong></strong><span></span><button type="button" hidden></button>';
    const [status, reminder, button] = hud.children;
    button.textContent = tr('拾取 1 金币', 'Pick up 1 gold');
    document.body.append(hud);

    let mp, off, map, target, carried = 0, reward = 0, issued = 0, remaining = 0, requested = -Infinity;
    let state = { targets: [], drops: [] };
    const currentMap = () => game.expedition?.active?.id || (game.qingyun?.active ? 'qingyun' : 'port');
    function mesh(parent, geometry, x = 0, y = 0, z = 0) {
      const object = new THREE.Mesh(geometry, metal);
      object.position.set(x, y, z);
      parent.add(object);
      return object;
    }
    function remove(collection, id) {
      const entry = collection.get(id);
      entry.model?.dispose();
      entry.marker.removeFromParent();
      collection.delete(id);
    }
    function sync(collection, rows, isDrop) {
      const live = new Set(rows.map(row => row.id));
      for (const id of collection.keys()) if (!live.has(id)) remove(collection, id);
      for (const row of rows) {
        let entry = collection.get(row.id);
        if (!entry) {
          const marker = new THREE.Group();
          const icon = new THREE.Group();
          marker.add(icon);
          mesh(icon, coin);
          mesh(icon, ring);
          group.add(marker);
          entry = { marker, icon, row, model: null };
          collection.set(row.id, entry);
        }
        entry.row = row;
        if (!isDrop && !entry.model) {
          entry.model = window.SaltUnitModels?.create(row.kind);
          if (entry.model) entry.marker.add(entry.model.model);
        }
        entry.marker.position.copy(row.pos);
      }
    }
    function receive(msg) {
      if (msg.type === 'goldList') {
        carried = msg.carried;
        issued = msg.issued;
        reward = msg.reward;
        remaining = msg.remaining;
        if (msg.map === currentMap()) state = msg;
      }
      if (msg.type === 'goldDestroyed') {
        const point = new THREE.Vector3(msg.pos.x, msg.pos.y + .25, msg.pos.z);
        game.fx?.sparks?.(point, new THREE.Vector3(0, 1, 0), 14);
      }
      if (msg.type === 'goldBonus') mp.toast?.(tr(
        '意外掉落！普通机器掉出了金币，走近拾取。',
        'Lucky drop! Move closer to pick up the gold.'
      ));
      if (msg.type === 'goldPicked') mp.toast?.(tr(
        '捡到 ' + format(msg.amount) + ' 金币。换手机前记得回集装箱存金。',
        'Picked up ' + format(msg.amount) + ' gold. Deposit it before switching devices.'
      ));
    }
    function pick() {
      if (!target || !mp?.connected || document.querySelector('dialog[open]')) return;
      mp.syncState();
      mp.send({ type: 'goldPick', id: target.id });
    }
    button.addEventListener('click', pick);
    window.addEventListener('keydown', event => {
      if (event.code !== 'KeyJ' || event.repeat || !target || hud.hidden || document.querySelector('dialog[open]') ||
          event.target?.matches?.('input, textarea, [contenteditable]')) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      pick();
    }, true);

    game.gold = {
      get carried() { return carried; },
      intersect(origin, direction, range) {
        if (!mp?.connected || map !== currentMap()) return null;
        let best = null;
        for (const { row } of entities.values()) {
          const dist = window.SaltGoldRules.hit(origin, direction, row, best?.dist ?? range);
          if (dist !== null) best = { id: row.id, dist };
        }
        return best;
      },
      update(dt) {
        if (mp !== window.__mp) {
          off?.();
          mp = window.__mp;
          off = mp?.onMessage(receive);
          requested = -Infinity;
        }
        const active = mp?.connected && player.alive && game.game.state === 'playing' && !game.frontier?.airborne;
        const next = currentMap();
        if (map !== next || !mp?.connected) {
          state = { targets: [], drops: [] };
          map = next;
          requested = -Infinity;
        }
        hud.hidden = !active;
        group.visible = !!active;
        target = null;
        if (!active) return;
        const now = performance.now();
        if (now - requested > 1500) {
          mp.send({ type: 'goldList' });
          requested = now;
        }
        sync(entities, state.targets, false);
        sync(drops, state.drops, true);
        for (const { row, icon, model } of entities.values()) {
          icon.position.y = (row.kind === 'drone' ? 1.28 : 1.95) + Math.sin(now / 390) * .1;
          icon.rotation.y = now / 680;
          model?.rig.update(Math.min(.05, dt), { moving: false, sprint: false });
        }
        let nearest = 2.4;
        for (const { row, icon } of drops.values()) {
          icon.position.y = .42 + Math.sin(now / 300) * .11;
          icon.rotation.y = now / 480;
          const dist = Math.hypot(player.pos.x - row.pos.x, player.pos.z - row.pos.z);
          if (dist < nearest && Math.abs(player.pos.y - row.pos.y) < 1.8) { target = row; nearest = dist; }
        }
        button.hidden = !target;
        if (target) {
          const pickup = tr('拾取 ', 'Pick up ') + format(target.amount) + tr(' 金币', ' gold');
          if (button.textContent !== pickup) button.textContent = pickup;
        }
        const label = tr('随身金币 ', 'Carried gold ') + format(carried) +
          (issued ? tr(' · 今日目标 ', ' · Targets today ') + remaining + '/' + issued +
            tr(' · 每台 ', ' · Per unit ') + format(reward) : '');
        if (status.textContent !== label) status.textContent = label;
        reminder.hidden = !carried;
        if (carried && !reminder.textContent) reminder.textContent = tr(
          '随身金币换手机找不回。去湾城、西部荒野或霓虹雨城安家，把金币和物资存入集装箱。',
          'Carried gold stays on this device. Set up a container in Bayhaven, Dustfall, or Mothlight to store gold and supplies.'
        );
      }
    };
  };
})();
