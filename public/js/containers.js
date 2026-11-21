(() => {
  'use strict';

  window.installContainers = game => {
    const { THREE, scene, player, input, camera } = game;
    const rules = window.SaltFrontierRules;
    const words = window.__SALT_I18N__.messages;
    const tr = (zh, en) => document.documentElement.lang === 'en-US' ? en : zh;
    const flow = words.containerFlow || {};
    const t = key => typeof flow[key] === 'string' ? flow[key] : key;
    const format = (key, values) => t(key).replace(/\{(\w+)\}/g, (_, name) =>
      Object.hasOwn(values, name) ? String(values[name]) : '');
    const formatGold = window.SaltGoldRules.format;
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
      amount: t('amount'),
      itemAmount: t('itemAmount'),
      draft: tr('密码领用已过期，请重新创建。', 'This password offer expired. Create a new one.'),
      cosmetic: tr('此外观不在当前位置。', 'This cosmetic is unavailable.'),
      cosmeticDuplicate: tr('目的地已有此外观。', 'The destination already has this cosmetic.'),
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
    const coinPlate = new THREE.BoxGeometry(.08, .39, .92);
    const coinBoard = new THREE.PlaneGeometry(.88, .28);
    const signFaceOffset = .05;

    function mesh(parent, geometry, material, x, y, z) {
      const child = new THREE.Mesh(geometry, material);
      child.position.set(x, y, z);
      child.castShadow = true;
      child.receiveShadow = true;
      parent.add(child);
      return child;
    }
    function addSignFaces(group, geometry, material) {
      for (const side of [-1, 1]) {
        mesh(group, geometry, material, side * signFaceOffset, 1.35, 0).rotation.y = side * Math.PI / 2;
      }
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
      addSignFaces(group, board, model.signMaterial);
    }
    function setCoinSign(model, amount) {
      model.coinSign?.removeFromParent();
      model.coinSignMaterial?.map.dispose();
      model.coinSignMaterial?.dispose();
      model.coinSign = model.coinSignMaterial = null;
      if (amount == null) {
        model.coinAmount = null;
        return;
      }
      const value = Number.isSafeInteger(amount) && amount >= 0 ? amount : 0;
      model.coinAmount = value;
      const group = model.coinSign = new THREE.Group();
      group.name = 'container-coin-sign';
      group.userData.coinAmount = value;
      group.position.set(3.15, 0, 2.92);
      model.root.add(group);
      mesh(group, post, iron, 0, .675, 0);
      mesh(group, coinPlate, iron, 0, 1.35, 0);
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 216;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#241a08';
      ctx.fillRect(0, 0, 640, 216);
      ctx.strokeStyle = '#e9b14f';
      ctx.lineWidth = 6;
      ctx.strokeRect(10, 10, 620, 196);
      ctx.fillStyle = '#f2c66d';
      ctx.font = '600 27px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(t('goldSignLabel'), 320, 66, 580);
      ctx.fillStyle = '#fff2cc';
      ctx.font = '700 58px sans-serif';
      ctx.fillText(formatGold(value), 320, 137, 590);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      model.coinSignMaterial = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
      addSignFaces(group, coinBoard, model.coinSignMaterial);
    }
    function syncCoinSign(model, amount) {
      if (!model) return;
      const value = Number.isSafeInteger(amount) && amount >= 0 ? amount : 0;
      model.row = { ...model.row, gold: value };
      if (model.coinAmount !== value || !model.coinSign) setCoinSign(model, value);
    }
    function erase(id) {
      const model = models.get(id);
      if (!model) return;
      setSign(model, '');
      setCoinSign(model, null);
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
      const model = { row: { ...row }, root, hinges, latch, hook, progress: row.open ? 1 : 0, boxes: [] };
      setSign(model, row.sign);
      setCoinSign(model, row.gold ?? 0);
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
    game.frontier?.registerDockTool(toolbar);

    const depositHud = document.createElement('aside');
    depositHud.className = 'container-deposit-hud';
    depositHud.hidden = true;
    depositHud.innerHTML = '<span></span><button type="button"></button>';
    const depositStatus = depositHud.querySelector('span');
    const depositButton = depositHud.querySelector('button');
    depositButton.textContent = t('deposit');
    document.body.append(depositHud);

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
    let storedCosmetics = [];
    let cosmeticCounts = {};
    let sequence = 0;
    let listAt = -Infinity;
    const lastList = new THREE.Vector3();
    const direction = new THREE.Vector3();

    function insideBox(row) {
      if (!row) return false;
      const angle = row.yaw * Math.PI / 2;
      const dx = player.pos.x - row.pos.x;
      const dz = player.pos.z - row.pos.z;
      return Math.abs(dx * Math.cos(angle) - dz * Math.sin(angle)) < 2.91 &&
        Math.abs(dx * Math.sin(angle) + dz * Math.cos(angle)) < 1.13 &&
        player.pos.y >= row.pos.y - .05 && player.pos.y <= row.pos.y + 1;
    }
    function nearbyBox(row) {
      return !!row && Math.hypot(row.pos.x - player.pos.x, row.pos.z - player.pos.z) <= 7 &&
        Math.abs(row.pos.y - player.pos.y) <= 2.5;
    }
    function setText(node, text) {
      if (node.textContent !== text) node.textContent = text;
    }
    function notify(text) {
      setText(notice, text);
      window.__mp?.toast?.(text);
    }
    function button(parent, text, click) {
      const element = document.createElement('button');
      element.type = 'button';
      element.textContent = text;
      element.addEventListener('click', click);
      parent.append(element);
      return element;
    }
    let passwordBookOpen = false;
    function reset(title) {
      passwordBookOpen = false;
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
      if (pending) return false;
      if (!mp?.connected) {
        notify(errors.unavailable);
        return false;
      }
      const id = ++sequence;
      mp.syncState();
      if (mp.send({ type: 'containerAction', request: id, action, ...payload })) {
        pending = { id, action, at: performance.now(), payload };
        notify(tr('正在处理…', 'Working…'));
        return true;
      }
      notify(errors.unavailable);
      return false;
    }
    depositButton.addEventListener('click', () => {
      if (!openedId || !insideBox(models.get(openedId)?.row)) return;
      request('depositGold', { id: openedId });
    });
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
    const passwordBookKey = 'saltline.password-book.v1';
    const bookTitle = tr('密码本', 'Password book');
    function readBook() {
      const value = JSON.parse(localStorage.getItem(passwordBookKey) || '[]');
      return Array.isArray(value) ? value.filter(row =>
        typeof row?.label === 'string' && typeof row?.password === 'string') : [];
    }
    function passwordBook(initial = '', back = menu) {
      reset(bookTitle);
      passwordBookOpen = true;
      notice.textContent = tr(
        '密码只保存在当前浏览器本地，不上传云端，也不会同步到其他设备。清除本站数据会删除记录。',
        'Passwords are stored only in this browser. They are not uploaded or synced. Clearing this site’s data removes the entries.'
      );
      const status = document.createElement('p');
      status.setAttribute('role', 'status');
      const form = document.createElement('form');
      const label = document.createElement('input');
      label.maxLength = 48;
      label.placeholder = tr('备注，如「湾城仓库」', 'Label, e.g. Bayhaven storage');
      label.setAttribute('aria-label', tr('备注', 'Label'));
      const password = document.createElement('input');
      password.type = 'password';
      password.autocomplete = 'off';
      password.spellcheck = false;
      password.maxLength = 120;
      password.required = true;
      password.placeholder = tr('输入密码', 'Enter password');
      password.setAttribute('aria-label', tr('密码', 'Password'));
      password.value = initial;
      const save = document.createElement('button');
      save.type = 'submit';
      save.textContent = tr('保存到本机', 'Save on this device');
      form.append(label, password, save);
      const list = document.createElement('ul');
      list.className = 'container-password-book';
      list.setAttribute('aria-label', tr('已保存的密码', 'Saved passwords'));
      const manualCopy = document.createElement('input');
      manualCopy.readOnly = true;
      manualCopy.hidden = true;
      manualCopy.setAttribute('aria-label', tr('手动复制密码', 'Copy password manually'));
      function clearManualCopy() {
        manualCopy.value = '';
        manualCopy.hidden = true;
      }
      manualCopy.addEventListener('blur', clearManualCopy);
      content.append(form, list, status, manualCopy);
      const storageError = () => { status.textContent = tr('无法访问浏览器本地存储。', 'Browser storage is unavailable.'); };

      function render() {
        list.replaceChildren();
        let rows;
        try { rows = readBook(); } catch { storageError(); return; }
        for (const row of rows) {
          const item = document.createElement('li');
          const name = document.createElement('b');
          name.textContent = row.label;
          item.append(name);
          button(item, tr('复制', 'Copy'), async () => {
            clearManualCopy();
            try {
              await navigator.clipboard.writeText(row.password);
              status.textContent = tr('已复制密码。', 'Password copied.');
            } catch {
              manualCopy.hidden = false;
              manualCopy.value = row.password;
              manualCopy.focus();
              manualCopy.select();
              status.textContent = tr('已选中密码，可手动复制。', 'Password selected for manual copying.');
            }
          });
          let confirmed = false;
          const remove = button(item, tr('删除', 'Delete'), () => {
            if (!confirmed) {
              confirmed = true;
              remove.textContent = tr('确认删除', 'Confirm delete');
              return;
            }
            try {
              localStorage.setItem(passwordBookKey, JSON.stringify(readBook().filter(
                entry => entry.password !== row.password
              )));
              render();
              status.textContent = tr('已删除本地记录。', 'Local entry deleted.');
            } catch { storageError(); }
          });
          list.append(item);
        }
        if (!rows.length) {
          const empty = document.createElement('li');
          empty.textContent = tr('还没有保存密码。', 'No passwords saved yet.');
          list.append(empty);
        }
      }

      form.addEventListener('submit', event => {
        event.preventDefault();
        const value = password.value;
        if (!value.trim()) return;
        try {
          const rows = readBook();
          const existing = rows.find(entry => entry.password === value);
          localStorage.setItem(passwordBookKey, JSON.stringify([
            { label: label.value.trim() || existing?.label || tr('集装箱密码', 'Container password'), password: value },
            ...rows.filter(entry => entry.password !== value)
          ]));
          label.value = password.value = '';
          render();
          status.textContent = tr('已保存到当前浏览器。', 'Saved in this browser.');
        } catch { storageError(); }
      });
      button(footer, tr('返回', 'Back'), back);
      render();
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
      button(list, bookTitle, () => passwordBook());
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
    function parseGoldAmount(value, maximum) {
      const text = String(value || '').trim();
      if (!text) return undefined;
      const units = window.SaltGoldRules.parse(text);
      return units !== null && units > 0 && units <= maximum ? units : null;
    }
    function parseItemAmount(value, maximum) {
      const text = String(value || '').trim();
      if (!text) return undefined;
      if (!/^\d+$/.test(text)) return null;
      const amount = Number(text);
      return Number.isSafeInteger(amount) && amount > 0 && amount <= maximum ? amount : null;
    }
    function inventory() {
      reset(tr('门已打开 · 存取物品', 'Doors open · Transfer items'));
      const gold = document.createElement('p');
      gold.className = 'container-gold-balance';
      gold.textContent = tr('箱内金币 ', 'Stored gold ') + formatGold(banked) +
        tr(' · 随身金币 ', ' · Carried gold ') + formatGold(game.gold?.carried || 0);
      content.append(gold);
      const inside = insideBox(models.get(openedId)?.row);
      const enter = button(content, tr('返回游戏，进箱或离箱', 'Return to game to enter or exit the container'), () => dismiss(false, true));
      enter.className = 'container-walk';
      const carried = game.gold?.carried || 0;
      if (carried || banked) {
        const goldActions = document.createElement('div');
        goldActions.className = 'container-gold-actions';
        const amount = document.createElement('input');
        amount.type = 'text';
        amount.inputMode = 'decimal';
        amount.maxLength = 24;
        amount.placeholder = t('goldAmountPlaceholder');
        amount.setAttribute('aria-label', t('goldAmount'));
        goldActions.append(amount);
        if (carried) {
          const putSelected = button(goldActions, t('depositSelected'), () => {
            const units = parseGoldAmount(amount.value, carried);
            if (units === null) { notify(t('amount')); return; }
            if (request('depositGold', { id: openedId, ...(units === undefined ? {} : { amount: units }) })) {
              putSelected.disabled = true;
            }
          });
          const putAll = button(goldActions, t('deposit'), () => {
            if (request('depositGold', { id: openedId })) putAll.disabled = true;
          });
          putSelected.disabled = putAll.disabled = !inside || !!pending;
        }
        if (banked) {
          const takeAll = button(goldActions, t('withdraw'), () => {
            if (request('withdrawGold', { id: openedId })) takeAll.disabled = true;
          });
          const takeSelected = button(goldActions, t('withdrawSelected'), () => {
            const units = parseGoldAmount(amount.value, banked);
            if (units === null) { notify(t('amount')); return; }
            if (request('withdrawGold', { id: openedId, ...(units === undefined ? {} : { amount: units }) })) {
              takeSelected.disabled = true;
            }
          });
          takeAll.disabled = takeSelected.disabled = !inside || !!pending;
        }
        content.append(goldActions);
      }
      const shop = window.SaltShop;
      const carriedCosmetics = shop?.cosmetics() || [];
      const cosmeticKeys = [...new Set([...storedCosmetics, ...carriedCosmetics])];
      if (shop && cosmeticKeys.length) {
        const section = document.createElement('section');
        section.className = 'container-cosmetics';
        const title = document.createElement('h3');
        title.textContent = tr('外观存取', 'Store and retrieve cosmetics');
        section.append(title);
        for (const key of cosmeticKeys) {
          const product = shop.get(key);
          if (!product || product.kind === 'pass') continue;
          const row = document.createElement('div');
          row.className = 'container-cosmetic-row';
          const label = document.createElement('span');
          const stored = cosmeticCounts[key] ?? Number(storedCosmetics.includes(key));
          const carried = shop.count(key);
          const sign = product.kind === 'sign';
          label.textContent = shop.label(product) + (sign
            ? tr(' · 身上 ', ' · Carried ') + carried + tr(' / 箱内 ', ' / Stored ') + stored : '');
          row.append(label);
          const controls = document.createElement('div');
          controls.className = 'container-cosmetic-controls';
          for (const [action, allowed, title] of [
            ['depositCosmetic', carried && (sign || !stored), sign ? tr('存 1 块', 'Store 1') : tr('存入', 'Store')],
            ['withdrawCosmetic', stored && (sign || !carried), sign ? tr('取 1 块', 'Take 1') : tr('取出', 'Withdraw')]
          ]) {
            if (!allowed) continue;
            const move = button(controls, title, () => {
              if (request(action, { id: openedId, item: key })) move.disabled = true;
            });
            move.disabled = !inside || !!pending;
          }
          row.append(controls);
          section.append(row);
        }
        content.append(section);
      }
      const hint = document.createElement('p');
      hint.className = 'container-item-hint';
      hint.textContent = t('itemHint');
      content.append(hint);
      const rows = document.createElement('div');
      rows.className = 'container-items';
      content.append(rows);
      const kinds = Object.keys(rules.limits).filter(kind => bag[kind] || stored[kind]);
      if (!kinds.length) notice.textContent = tr('背包和集装箱都是空的。', 'Your backpack and container are empty.');
      for (const kind of kinds) {
        const line = document.createElement('div');
        line.className = 'container-item-row';
        const meta = document.createElement('div');
        meta.className = 'container-item-meta';
        const name = document.createElement('strong');
        name.textContent = words.frontier.items[kind] || window.SaltArsenalRules[kind]?.name ||
          (kind === 'knife' ? words.arsenal.knife : kind);
        const counts = document.createElement('small');
        counts.textContent = format('itemBalances', { bag: bag[kind] || 0, stored: stored[kind] || 0 });
        meta.append(name, counts);
        const quantity = document.createElement('input');
        quantity.type = 'number';
        quantity.min = '1';
        quantity.step = '1';
        quantity.inputMode = 'numeric';
        quantity.maxLength = 6;
        quantity.max = String(Math.max(bag[kind] || 0, stored[kind] || 0, 1));
        quantity.placeholder = t('itemAmountPlaceholder');
        quantity.setAttribute('aria-label', format('itemQuantity', { item: name.textContent }));
        line.append(meta, quantity);
        const put = button(line, t('storeItem'), () => {
          const amount = parseItemAmount(quantity.value, bag[kind] || 0);
          if (amount === null) { notify(t('itemAmount')); return; }
          const payload = { id: openedId, item: kind, itemName: name.textContent,
            ...(amount === undefined ? {} : { amount }) };
          if (request('deposit', payload)) put.disabled = true;
        });
        const take = button(line, t('takeItem'), () => {
          const amount = parseItemAmount(quantity.value, stored[kind] || 0);
          if (amount === null) { notify(t('itemAmount')); return; }
          const payload = { id: openedId, item: kind, itemName: name.textContent,
            ...(amount === undefined ? {} : { amount }) };
          if (request('withdraw', payload)) take.disabled = true;
        });
        put.disabled = !bag[kind] || !!pending;
        take.disabled = !stored[kind] || !!pending;
        rows.append(line);
      }
      if (!inside && carried) notice.textContent = t('walkIn');
      else if (!inside && banked) notice.textContent = t('withdrawHint');
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
      button(options, tr('存进密码本', 'Save to password book'), () => passwordBook(issued, showPassword));
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
      if (dialog.open || !player.alive || game.game.state !== 'playing' ||
          document.querySelector('dialog[open]')) return;
      menuTarget = target;
      relock = !!document.pointerLockElement;
      input.setGameplay(false);
      input.exitLock();
      dialog.showModal();
      if (!map || !mp?.connected) passwordBook('', () => dismiss());
      else if (issued) { reveal = true; showPassword(); }
      else if (openedId) inventory();
      else menu();
    }
    control.addEventListener('click', openMenu);
    dialog.addEventListener('cancel', event => {
      event.preventDefault();
      if (!reveal || passwordBookOpen) dismiss(false, !!openedId);
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
            const gold = Number.isSafeInteger(row.gold) && row.gold >= 0 ? row.gold : 0;
            if (gold !== model.coinAmount || !model.coinSign) setCoinSign(model, gold);
            model.row = { ...row, gold };
          }
        }
      } else if (message.type === 'containerClosed' && message.id === openedId) {
        openedId = null;
        pending = null;
        if (dialog.open) { menu(); notice.textContent = tr('已自动关门上锁。', 'The doors closed and locked automatically.'); }
      } else if (message.type === 'containerResult') {
        if (message.request !== pending?.id) return;
        if (message.password) issued = message.password;
        const { action, payload } = pending;
        pending = null;
        if (message.error) {
          const key = message.error === 'amount' && ['deposit', 'withdraw'].includes(action)
            ? 'itemAmount' : message.error;
          notify(errors[key] || errors.storage);
          return;
        }
        if (issued && action === 'issue') {
          if (dialog.open) {
            reveal = true;
            showPassword();
          }
        } else if (action === 'create') {
          issued = null;
          reveal = false;
          if (dialog.open) menu();
          notify(t('placed'));
        } else if (action === 'open' || action === 'deposit' || action === 'withdraw' || action === 'depositGold' || action === 'withdrawGold' || action === 'depositCosmetic' || action === 'withdrawCosmetic') {
          openedId = message.id;
          stored = message.items || {};
          banked = message.gold || 0;
          storedCosmetics = message.cosmetics || [];
          cosmeticCounts = message.cosmeticCounts || {};
          syncCoinSign(models.get(openedId), banked);
          if (action === 'open' && dialog.open) dismiss(false, true);
          if (dialog.open && action !== 'open') inventory();
          if (action === 'open') notify(t('openedHint'));
          else if (action === 'deposit' || action === 'withdraw') {
            notify(format(action === 'deposit' ? 'itemStored' : 'itemWithdrawn', {
              amount: message.moved || 0, item: payload.itemName || ''
            }));
          } else if (action === 'depositGold') {
            notify(format('goldDeposited', { amount: formatGold(message.moved || 0) }));
          } else if (action === 'withdrawGold') {
            notify(format('goldWithdrawn', { amount: formatGold(message.moved || 0) }));
          } else {
            notify(action === 'depositCosmetic' ? tr('外观已存入。', 'Cosmetic stored.') : tr('外观已取出。', 'Cosmetic retrieved.'));
          }
        } else if (action === 'close') {
          openedId = null;
          dismiss();
        } else {
          if (dialog.open) menu();
          if (message.location) {
            const { map: name, pos } = message.location;
            notify(mapNames[name] + ' · X ' + Math.round(pos.x) + ' / Z ' +
              Math.round(pos.z - window.SaltExpeditionZones.maps[name].offset));
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
        const canOpenBook = player.alive && game.game.state === 'playing' &&
          !game.frontier?.airborne && !game.portalArrival?.active && !game.sedan?.riding;
        const playing = !!map && mp?.connected && canOpenBook;
        toolbar.hidden = !canOpenBook;
        if (!playing) {
          setText(control, bookTitle);
          if (control.getAttribute('aria-label') !== bookTitle) {
            control.setAttribute('aria-label', bookTitle);
            control.title = bookTitle;
          }
        }
        const depositRow = openedId ? models.get(openedId)?.row : null;
        const showDeposit = playing && nearbyBox(depositRow);
        depositHud.hidden = !showDeposit;
        if (showDeposit) {
          const inside = insideBox(depositRow);
          const carried = game.gold?.carried || 0;
          depositButton.hidden = !inside;
          setText(depositStatus, inside ? t('insideHint') : t('openHint'));
          const label = t('deposit') + (carried ? ' · ' + window.SaltGoldRules.format(carried) : '');
          setText(depositButton, label);
          depositButton.disabled = !inside || !carried || !!pending;
        }
        if (dialog.open && (!canOpenBook || !playing && !passwordBookOpen)) {
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
        const docked = toolbar.parentElement?.classList.contains('mobile-field-dock');
        const visibleLabel = docked ? tr('集装箱', 'Container') : label;
        if (control.textContent !== visibleLabel) control.textContent = visibleLabel;
        if (control.getAttribute('aria-label') !== label) {
          control.setAttribute('aria-label', label);
          control.title = label;
        }
        control.classList.toggle('container-near-open', !!target?.open);
        control.classList.toggle('container-near-locked', !!target && !target.open);
      }
    };
  };
})();
