(() => {
  'use strict';

  window.installContainers = game => {
    const { THREE, scene, player, input, camera } = game;
    const rules = window.SaltFrontierRules;
    const words = window.__SALT_I18N__.messages;
    const tr = (zh, en) => document.documentElement.lang === 'en-US' ? en : zh;
    const mapNames = {
      bayhaven: tr('湾城', 'Bayhaven'), dustfall: tr('西部荒野', 'Dustfall'),
      mothlight: tr('霓虹雨城', 'Mothlight')
    };
    const errors = {
      unavailable: tr('请落地并进入联机对局。', 'Land and enter an online match.'),
      busy: tr('请稍候再操作。', 'Try again in a moment.'),
      range: tr('请靠近集装箱。', 'Move closer to the container.'),
      password: tr('密码或助记词不正确，或不属于这个集装箱。', 'The password or recovery phrase does not match this container.'),
      inUse: tr('请先关门上锁，再搬迁或重新开门。', 'Close and lock the door before moving or reopening it.'),
      closed: tr('门已锁，请重新输入密码。', 'The door is locked. Enter the password again.'),
      position: tr('这里放不下。走到平坦的空地，再朝向空地使用。', 'Face an open, level area and try again.'),
      item: tr('物品不足，或背包／集装箱容量已满。', 'Item unavailable or storage capacity reached.'),
      exists: tr('已有集装箱，可用原密码查找或搬迁。', 'You already have a container. Use its password to find or move it.'),
      identity: tr('请启用本站 Cookie 并刷新后再创建。', 'Enable site cookies and reload to create a container.'),
      text: tr('请输入可公开展示的文字，最多 32 字。', 'Enter up to 32 characters suitable for public display.'),
      inside: tr('先走进集装箱，再存金币。', 'Step inside the container before depositing gold.'),
      exit: tr('先走出集装箱，再关门上锁。', 'Step outside before closing and locking the doors.'),
      draft: tr('密码领用已过期，请重新创建。', 'This password offer expired. Create a new one.'),
      storage: tr('存档暂时无法写入，请稍后重试。', 'Could not save. Try again later.')
    };

    const holder = new THREE.Group();
    holder.name = 'player-containers';
    scene.add(holder);
    const models = new Map();
    const buildQueue = new Map();
    const brass = new THREE.MeshStandardMaterial({ color: 0xe9b14f, metalness: .7, roughness: .31 });
    const steel = new THREE.MeshStandardMaterial({ color: 0xb9c7d4, metalness: .8, roughness: .29 });
    const iron = new THREE.MeshStandardMaterial({ color: 0x252d34, metalness: .66, roughness: .49 });
    const lockBody = new THREE.BoxGeometry(.125, .29, .28);
    const hasp = new THREE.BoxGeometry(.085, .12, .32);
    const keyhole = new THREE.BoxGeometry(.006, .068, .035);
    const points = [new THREE.Vector3(0, -.05, -.095)];
    for (let step = 0; step <= 12; step++) {
      const angle = Math.PI * (1 - step / 12);
      points.push(new THREE.Vector3(0, .065 + .095 * Math.sin(angle), .095 * Math.cos(angle)));
    }
    points.push(new THREE.Vector3(0, -.035, .095));
    const shackle = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 28, .021, 8, false);
    const post = new THREE.BoxGeometry(.09, 1.35, .09);
    const plate = new THREE.BoxGeometry(.08, .39, 1.08);
    const board = new THREE.PlaneGeometry(1.04, .35);

    function mesh(parent, geometry, material, x, y, z) {
      const child = new THREE.Mesh(geometry, material);
      child.position.set(x, y, z);
      child.castShadow = true;
      child.receiveShadow = true;
      parent.add(child);
      return child;
    }
    function setSign(model, label) {
      model.sign?.removeFromParent();
      model.signMaterial?.map.dispose();
      model.signMaterial?.dispose();
      model.sign = model.signMaterial = null;
      if (!label) return;
      const group = model.sign = new THREE.Group();
      group.position.set(3.15, 0, 1.72);
      model.root.add(group);
      mesh(group, post, iron, 0, .675, 0);
      mesh(group, plate, iron, 0, 1.35, 0);
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 216;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#17374b';
      ctx.fillRect(0, 0, 640, 216);
      ctx.strokeStyle = '#a7cfdf';
      ctx.lineWidth = 6;
      ctx.strokeRect(10, 10, 620, 196);
      ctx.fillStyle = '#f3f8fb';
      ctx.font = '600 35px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const chars = [...label];
      if (chars.length <= 16) ctx.fillText(label, 320, 108, 590);
      else {
        ctx.fillText(chars.slice(0, 16).join(''), 320, 79, 590);
        ctx.fillText(chars.slice(16).join(''), 320, 137, 590);
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      model.signMaterial = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
      mesh(group, board, model.signMaterial, .043, 1.35, 0).rotation.y = Math.PI / 2;
    }
    function erase(id) {
      const model = models.get(id);
      if (!model) return;
      setSign(model, '');
      model.root.removeFromParent();
      models.delete(id);
    }
    function build(row) {
      const root = game.props.build('container20', { color: row.color, animated: true });
      const hinges = root.userData.hinges || [];
      const lock = new THREE.Group();
      const pivot = hinges[0]?.pivot || root;
      lock.position.set(hinges.length ? .125 : 3.08, 1.06, hinges.length ? -1.04 : .14);
      pivot.add(lock);
      mesh(lock, hasp, iron, -.06, .12, -.08);
      const latch = new THREE.Group();
      lock.add(latch);
      mesh(latch, lockBody, brass, 0, -.04, 0);
      mesh(latch, keyhole, iron, .065, -.055, 0);
      const hook = mesh(latch, shackle, steel, 0, .115, 0);
      root.position.copy(row.pos);
      root.rotation.y = row.yaw * Math.PI / 2;
      holder.add(root);
      const model = { row, root, hinges, latch, hook, progress: row.open ? 1 : 0, boxes: [] };
      setSign(model, row.sign);
      animate(model, 0, true);
      models.set(row.id, model);
    }

    const easing = x => {
      const t = Math.max(0, Math.min(1, x));
      return t * t * (3 - 2 * t);
    };
    const boxOrigin = new THREE.Vector3();
    const boxEnd = new THREE.Vector3();
    function rebuildBoxes(model) {
      const { root, hinges, boxes } = model;
      root.updateMatrixWorld(true);
      boxes.length = 0;
      const offset = game.expedition.active.offset;
      function worldBox(node, a, b) {
        boxOrigin.set(...a).applyMatrix4(node.matrixWorld);
        boxEnd.set(...b).applyMatrix4(node.matrixWorld);
        boxes.push([
          Math.min(boxOrigin.x, boxEnd.x), Math.min(boxOrigin.y, boxEnd.y), Math.min(boxOrigin.z, boxEnd.z) - offset,
          Math.max(boxOrigin.x, boxEnd.x), Math.max(boxOrigin.y, boxEnd.y), Math.max(boxOrigin.z, boxEnd.z) - offset
        ]);
      }
      for (const { min, max } of root.userData.colliders) worldBox(root, min, max);
      for (const [index, { pivot }] of hinges.entries()) {
        const side = index === 0 ? -1 : 1;
        for (let segment = 0; segment < 5; segment++) {
          const a = new THREE.Vector3(0, 0, side * segment * .23).applyMatrix4(pivot.matrixWorld);
          const b = new THREE.Vector3(0, 2.5, side * (segment + 1) * .23).applyMatrix4(pivot.matrixWorld);
          boxes.push([Math.min(a.x, b.x) - .04, a.y, Math.min(a.z, b.z) - offset - .04,
            Math.max(a.x, b.x) + .04, b.y, Math.max(a.z, b.z) - offset + .04]);
        }
      }
    }
    function animate(model, dt, force = false) {
      const from = model.progress;
      model.progress = model.row.open ? Math.min(1, from + dt / 1.05) : Math.max(0, from - dt / 1.05);
      if (!force && from === model.progress) return;
      const t = model.progress;
      const unlock = easing(t / .28);
      model.hook.position.y = .115 + unlock * .095;
      model.hook.rotation.y = unlock * .85;
      model.latch.rotation.x = unlock * .39;
      for (const [index, { pivot, angle }] of model.hinges.entries()) {
        const start = .29 + index * .11;
        pivot.rotation.y = angle * easing((t - start) / (1 - start));
      }
      rebuildBoxes(model);
    }

    const toolbar = document.createElement('div');
    toolbar.className = 'road-sign-tools container-tools';
    const control = document.createElement('button');
    control.textContent = tr('集装箱', 'Container');
    toolbar.append(control);
    toolbar.hidden = true;
    document.body.append(toolbar);

    const dialog = document.createElement('dialog');
    dialog.className = 'road-sign-dialog container-dialog';
    dialog.innerHTML = '<h2></h2><p role="status"></p><div class="container-content"></div><footer></footer>';
    document.body.append(dialog);
    const heading = dialog.querySelector('h2');
    const notice = dialog.querySelector('p');
    const content = dialog.querySelector('.container-content');
    const footer = dialog.querySelector('footer');
    let mp, unsubscribe, map, target, menuTarget, relock, pending, issued, reveal, openedId;
    let bag = rules.normalize();
    let stored = {};
    let banked = 0;
    let sequence = 0;
    let listAt = -Infinity;
    const lastList = new THREE.Vector3();
    const direction = new THREE.Vector3();

    function button(parent, text, click) {
      const element = document.createElement('button');
      element.type = 'button';
      element.textContent = text;
      element.addEventListener('click', click);
      parent.append(element);
      return element;
    }
    function reset(title) {
      heading.textContent = title;
      notice.textContent = '';
      content.replaceChildren();
      footer.replaceChildren();
    }
    function placementPoint() {
      camera.getWorldDirection(direction);
      if (Math.hypot(direction.x, direction.z) < .14) return null;
      const yaw = ((Math.round(Math.atan2(direction.z, -direction.x) / (Math.PI / 2)) % 4) + 4) % 4;
      const radians = yaw * Math.PI / 2;
      const x = player.pos.x - 6.3 * Math.cos(radians);
      const z = player.pos.z + 6.3 * Math.sin(radians);
      const y = game.expedition.containerGround(x, z, yaw);
      return y === null ? null : { x, y, z, yaw };
    }
    function request(action, payload = {}) {
      if (pending) return;
      if (!mp?.connected) {
        notice.textContent = errors.unavailable;
        return;
      }
      const id = ++sequence;
      mp.syncState();
      if (mp.send({ type: 'containerAction', request: id, action, ...payload })) {
        pending = { id, action, at: performance.now() };
        notice.textContent = tr('正在处理…', 'Working…');
      } else notice.textContent = errors.unavailable;
    }
    function dismiss(force = false, leaveOpen = false) {
      if (!dialog.open || (pending && !force)) return;
      if (!leaveOpen && openedId && mp?.connected) mp.send({
        type: 'containerAction', action: 'close', id: openedId, request: ++sequence
      });
      if (!leaveOpen) openedId = null;
      dialog.close();
      content.replaceChildren();
      if (game.game.state === 'playing') {
        input.setGameplay(true);
        if (relock && !force) input.requestLock();
      }
    }
    function menu() {
      reset(tr('个人集装箱', 'Personal container'));
      const list = document.createElement('div');
      list.className = 'container-actions';
      content.append(list);
      if (menuTarget) {
        button(list, tr('输入密码开门', 'Unlock and open'), () => form('open'));
        button(list, tr('编辑箱旁牌子', 'Edit sign'), () => form('sign'));
      }
      button(list, tr('创建集装箱', 'Create container'), () => form('create'));
      button(list, tr('搬到这里', 'Move here'), () => form('move'));
      button(list, tr('查找我的集装箱', 'Find my container'), () => form('locate'));
      button(footer, tr('返回游戏', 'Back to game'), () => dismiss());
    }
    function form(action) {
      if (pending) return;
      const labels = {
        create: tr('创建集装箱', 'Create container'), open: tr('开门', 'Open doors'),
        move: tr('搬迁集装箱', 'Move container'), sign: tr('编辑箱旁牌子', 'Edit sign'),
        locate: tr('查找集装箱', 'Find container')
      };
      reset(labels[action]);
      const point = ['create', 'move'].includes(action) ? placementPoint() : undefined;
      if (point === null) notice.textContent = errors.position;
      const node = document.createElement('form');
      content.append(node);
      let password, text, color;
      function field(label, element) {
        const wrap = document.createElement('label');
        wrap.append(label, element);
        node.append(wrap);
        return element;
      }
      if (action === 'create') {
        color = field(tr('箱体颜色', 'Container finish'), document.createElement('select'));
        color.add(new Option(tr('盐港锈红', 'Port red'), 'red'));
        color.add(new Option(tr('船运深蓝', 'Shipping blue'), 'blue'));
        color.add(new Option(tr('货场深绿', 'Yard green'), 'green'));
        if (point) notice.textContent = tr('箱门朝向你，密码由服务器生成。', 'The doors face you. The server generates your password.');
      } else {
        password = field(tr('集装箱密码或 12 词助记词', 'Container password or 12-word recovery phrase'), document.createElement('input'));
        password.type = 'password';
        password.required = true;
        password.autocomplete = 'off';
        password.spellcheck = false;
        password.maxLength = 120;
      }
      if (action === 'sign') {
        text = field(tr('牌面文字（留空移除）', 'Sign text (blank removes it)'), document.createElement('input'));
        text.value = menuTarget?.sign || '';
        text.maxLength = 64;
      }
      const back = button(footer, tr('返回', 'Back'), () => { if (!pending) menu(); });
      const submit = button(footer, labels[action], () => node.requestSubmit());
      submit.disabled = point === null;
      node.addEventListener('submit', event => {
        event.preventDefault();
        if (point === null || pending) return;
        request(action === 'create' ? 'issue' : action, { password: password?.value, id: menuTarget?.id, color: color?.value, text: text?.value, point });
        if (password) password.value = '';
      });
      (password || color || back).focus();
    }
    function inventory() {
      reset(tr('门已打开 · 存取物品', 'Doors open · Transfer items'));
      const gold = document.createElement('p');
      gold.className = 'container-gold-balance';
      const formatGold = window.SaltGoldRules.format;
      gold.textContent = tr('箱内金币 ', 'Stored gold ') + formatGold(banked) +
        tr(' · 随身金币 ', ' · Carried gold ') + formatGold(game.gold?.carried || 0);
      content.append(gold);
      const enter = button(content, tr('返回游戏，进箱或离箱', 'Return to game to enter or exit the container'), () => dismiss(false, true));
      enter.className = 'container-walk';
      const rows = document.createElement('div');
      rows.className = 'container-items';
      content.append(rows);
      const kinds = Object.keys(rules.limits).filter(kind => bag[kind] || stored[kind]);
      if (!kinds.length) notice.textContent = tr('背包和集装箱都是空的。', 'Your backpack and container are empty.');
      for (const kind of kinds) {
        const line = document.createElement('div');
        const label = document.createElement('span');
        label.textContent = words.frontier.items[kind] || window.SaltArsenalRules[kind]?.name ||
          (kind === 'knife' ? words.arsenal.knife : kind);
        line.append(label);
        const put = button(line, tr('存入', 'Store') + ' · ' + (bag[kind] || 0),
          () => request('deposit', { id: openedId, item: kind }));
        const take = button(line, tr('取出', 'Take') + ' · ' + (stored[kind] || 0),
          () => request('withdraw', { id: openedId, item: kind }));
        put.disabled = !bag[kind];
        take.disabled = !stored[kind];
        rows.append(line);
      }
      if (game.gold?.carried) {
        const put = button(footer, tr('存入全部金币', 'Deposit all gold'), () => request('depositGold', { id: openedId }));
        const row = models.get(openedId)?.row;
        if (row) {
          const angle = row.yaw * Math.PI / 2;
          const dx = player.pos.x - row.pos.x;
          const dz = player.pos.z - row.pos.z;
          const inside = Math.abs(dx * Math.cos(angle) - dz * Math.sin(angle)) < 2.91 &&
            Math.abs(dx * Math.sin(angle) + dz * Math.cos(angle)) < 1.13 &&
            player.pos.y >= row.pos.y - .05 && player.pos.y <= row.pos.y + 1;
          put.disabled = !inside;
          if (!inside) notice.textContent = tr('走进箱内，再按 K 或点「集装箱」存金币。', 'Walk inside, then open Container again to deposit your gold.');
        }
      }
      button(footer, tr('关门上锁', 'Close and lock'), () => request('close', { id: openedId }));
    }
    function showPassword() {
      reset(tr('保存你的集装箱密码', 'Save your container password'));
      notice.textContent = tr(
        '这是你的全服唯一密码。请先存到私人收藏或密码管理器，也可以截图留存。换设备后，凭密码或助记词找回箱子和箱内资产。',
        'Save your unique password in private favorites or a password manager, or take a private screenshot. The password or recovery phrase restores access on another device.'
      );
      const code = document.createElement('input');
      code.value = issued;
      code.readOnly = true;
      code.setAttribute('aria-label', tr('新密码', 'New password'));
      content.append(code);
      const feedback = document.createElement('p');
      feedback.setAttribute('role', 'status');
      feedback.hidden = true;
      async function copyText(value, fallback) {
        feedback.hidden = false;
        try {
          await navigator.clipboard.writeText(value);
          feedback.textContent = tr('已复制。', 'Copied.');
        } catch {
          fallback.focus();
          fallback.select();
          feedback.textContent = tr('已选中，可手动复制或截图。', 'Selected. Copy it manually or take a screenshot.');
        }
      }
      const options = document.createElement('div');
      options.className = 'container-password-options';
      content.append(options);
      button(options, tr('复制密码', 'Copy password'), () => copyText(code.value, code));
      const phrase = document.createElement('textarea');
      phrase.rows = 3;
      phrase.readOnly = true;
      phrase.hidden = true;
      phrase.setAttribute('aria-label', tr('12 词助记词', '12-word recovery phrase'));
      const toggle = button(options, tr('显示助记词（可选）', 'Show optional recovery phrase'), () => {
        phrase.hidden = !phrase.hidden;
        copyPhrase.hidden = phrase.hidden;
        toggle.setAttribute('aria-expanded', String(!phrase.hidden));
        toggle.textContent = phrase.hidden ? tr('显示助记词（可选）', 'Show optional recovery phrase') :
          tr('隐藏助记词', 'Hide recovery phrase');
        if (!phrase.hidden) phrase.value = window.SaltContainerPassword.wordsFor(issued);
      });
      toggle.setAttribute('aria-expanded', 'false');
      const copyPhrase = button(options, tr('复制助记词', 'Copy recovery phrase'),
        () => copyText(phrase.value, phrase));
      copyPhrase.hidden = true;
      content.append(phrase, feedback);
      button(footer, tr('返回', 'Back'), () => {
        if (pending) return;
        issued = null;
        reveal = false;
        menu();
      });
      button(footer, tr('已保存，放置箱子', 'Saved. Place container'), () =>
        request('create', { password: issued }));
      code.select();
    }
    function openMenu() {
      if (dialog.open || !map || !player.alive || game.game.state !== 'playing' ||
          document.querySelector('dialog[open]')) return;
      menuTarget = target;
      relock = !!document.pointerLockElement;
      input.setGameplay(false);
      input.exitLock();
      dialog.showModal();
      if (issued) { reveal = true; showPassword(); }
      else if (openedId) inventory();
      else menu();
    }
    control.addEventListener('click', openMenu);
    dialog.addEventListener('cancel', event => {
      event.preventDefault();
      if (!reveal) dismiss(false, !!openedId);
    });
    window.addEventListener('keydown', event => {
      if (dialog.open) { event.stopImmediatePropagation(); return; }
      if (event.code !== 'KeyK' || event.repeat || toolbar.hidden || event.target?.matches?.('input, textarea, select, [contenteditable]')) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      openMenu();
    }, true);
    dialog.addEventListener('keyup', event => event.stopPropagation());

    function receive(message) {
      if (message.type === 'frontierInventory') {
        bag = rules.normalize(message.items);
        if (openedId && dialog.open && !pending) inventory();
      } else if (message.type === 'containerList' && message.map === map) {
        const ids = new Set(message.containers.map(row => row.id));
        for (const id of models.keys()) if (!ids.has(id)) erase(id);
        for (const id of buildQueue.keys()) if (!ids.has(id)) buildQueue.delete(id);
        for (const row of message.containers) {
          const model = models.get(row.id);
          if (!model || model.row.yaw !== row.yaw || ['x', 'y', 'z'].some(axis => row.pos[axis] !== model.row.pos[axis])) {
            erase(row.id);
            buildQueue.set(row.id, row);
          } else {
            if (row.sign !== model.row.sign) setSign(model, row.sign);
            model.row = row;
          }
        }
      } else if (message.type === 'containerClosed' && message.id === openedId) {
        openedId = null;
        pending = null;
        if (dialog.open) { menu(); notice.textContent = tr('已自动关门上锁。', 'The doors closed and locked automatically.'); }
      } else if (message.type === 'containerResult') {
        if (message.request !== pending?.id) return;
        if (message.password) issued = message.password;
        const { action } = pending;
        pending = null;
        if (!dialog.open) return;
        if (message.error) { notice.textContent = errors[message.error] || errors.storage; return; }
        if (issued && action === 'issue') {
          reveal = true;
          showPassword();
        } else if (action === 'create') {
          issued = null;
          reveal = false;
          menu();
          notice.textContent = tr('已放置并上锁。', 'Placed and locked.');
        } else if (action === 'open' || action === 'deposit' || action === 'withdraw' || action === 'depositGold') {
          openedId = message.id;
          stored = message.items || {};
          banked = message.gold || 0;
          inventory();
          if (action === 'depositGold') notice.textContent = tr('金币已存入集装箱，换设备也能用密码查看。', 'Gold deposited. Use your password to access it on another device.');
        } else if (action === 'close') {
          openedId = null;
          dismiss();
        } else {
          menu();
          if (message.location) {
            const { map: name, pos } = message.location;
            notice.textContent = mapNames[name] + ' · X ' + Math.round(pos.x) + ' / Z ' +
              Math.round(pos.z - window.SaltExpeditionZones.maps[name].offset);
          } else notice.textContent = action === 'move' ? tr('已搬迁并上锁。', 'Moved and locked.') : tr('牌面已更新。', 'Sign updated.');
        }
      }
    }

    game.containers = {
      get editing() { return dialog.open; },
      boxes(x1, z1, x2, z2) {
        if (!map || map !== game.expedition?.active?.id) return [];
        const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
        const minZ = Math.min(z1, z2), maxZ = Math.max(z1, z2);
        const result = [];
        for (const model of models.values()) {
          for (const box of model.boxes) {
            if (box[3] >= minX && box[0] <= maxX && box[5] >= minZ && box[2] <= maxZ) result.push(box);
          }
        }
        return result;
      },
      update(dt) {
        const nextMap = game.expedition?.active?.id;
        if (mp !== window.__mp) {
          unsubscribe?.();
          mp = window.__mp;
          unsubscribe = mp?.onMessage(receive);
          listAt = -Infinity;
        }
        if (map !== nextMap || !mp?.connected) {
          for (const id of models.keys()) erase(id);
          buildQueue.clear();
          map = nextMap;
          listAt = -Infinity;
        }
        const playing = !!map && mp?.connected && player.alive && game.game.state === 'playing' &&
          !game.frontier?.airborne && !game.sedan?.riding;
        toolbar.hidden = !playing;
        if (!playing && dialog.open) {
          pending = null;
          dismiss(true);
        }
        if (!map || !mp?.connected) return;
        const now = performance.now();
        if (pending && now - pending.at > 6500) {
          pending = null;
          notice.textContent = tr('请求超时，请重试。', 'Request timed out. Try again.');
        }
        if (now - listAt >= 1300 && (now - listAt >= 7000 || lastList.distanceToSquared(player.pos) > 64)) {
          mp.send({ type: 'containerList' });
          lastList.copy(player.pos);
          listAt = now;
        }
        const queued = buildQueue.entries().next();
        if (!queued.done) {
          const [id, row] = queued.value;
          buildQueue.delete(id);
          build(row);
        }
        target = null;
        let closest = 7;
        for (const model of models.values()) {
          animate(model, Math.min(dt, .1));
          const dist = model.root.position.distanceTo(player.pos);
          if (dist < closest) { closest = dist; target = model.row; }
        }
        const label = target ? (target.open ? tr('集装箱 · 已开门', 'Container · Open') : tr('集装箱 · 已上锁', 'Container · Locked')) : tr('集装箱', 'Container');
        if (control.textContent !== label) control.textContent = label;
      }
    };
  };
})();
