(() => {
  'use strict';

  const ENDPOINT = '/api/game/container-ads';
  const MAX_BYTES = 200000;
  const PRINT_WIDTH = 3.2, PRINT_HEIGHT = 1.8;
  const PRINT_KEY_CODES = new Set(['Digit9', 'Numpad9']), PRINT_KEY_LABEL = '9';
  let rosterOpen = false;
  let portAdOpen = false;
  try {
    rosterOpen = !!window.__SALT_ROSTER_OPEN__;
    Object.defineProperty(window, '__SALT_ROSTER_OPEN__', {
      configurable: true,
      get: () => rosterOpen || portAdOpen,
      set: value => { rosterOpen = !!value; }
    });
  } catch (error) { /* keep the engine's original marker if it cannot be wrapped */ }
  // Mobile browsers hide the page while the native image picker is open.
  // The engine auto-pauses on visibilitychange, so hold that pause while this panel owns the screen.
  const holdAutoPause = event => {
    if (portAdOpen && document.hidden) event.stopPropagation();
  };
  window.addEventListener('visibilitychange', holdAutoPause, true);
  document.addEventListener('visibilitychange', holdAutoPause, true);
  const tr = (zh, en) => document.documentElement.lang === 'en-US' ? en : zh;
  const messages = {
    range: ['请靠近并瞄准集装箱侧面。', 'Move closer and aim at a container side.'],
    occupied: ['这一侧正在投放广告。', 'This side already has an active ad.'],
    funds: ['随身盐线币不足。', 'Not enough Saltline Coins.'],
    text: ['请输入 1–80 个合规字符。', 'Enter 1–80 allowed characters.'],
    image: ['请选择横版图，压缩后须小于 0.2 MB。', 'Use a landscape image under 0.2 MB after compression.'],
    days: ['请输入有效的投放天数。', 'Enter a valid number of days.'],
    expired: ['选择已过期，请重新瞄准箱体再打开。', 'Selection expired. Aim at the container and reopen.'],
    busy: ['请稍候再试。', 'Try again shortly.'],
    storage: ['暂时无法印刷，请稍后再试。', 'Printing is temporarily unavailable.']
  };

  const toJpeg = (canvas, quality) => new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));

  async function compress(file) {
    if (!file || !/^image\/(jpeg|png|webp|avif)$/.test(file.type)) throw Error('image');
    const source = await createImageBitmap(file);
    try {
      if (source.width <= source.height) throw Error('image');
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { alpha: false });
      const scale = Math.min(1, 1024 / source.width, 576 / source.height);
      canvas.width = Math.max(2, Math.round(source.width * scale));
      canvas.height = Math.max(1, Math.round(source.height * scale));
      while (canvas.width > canvas.height) {
        context.fillStyle = '#101516';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(source, 0, 0, canvas.width, canvas.height);
        for (const quality of [.88, .73, .58, .42]) {
          const blob = await toJpeg(canvas, quality);
          if (blob?.type === 'image/jpeg' && blob.size <= MAX_BYTES) return blob;
        }
        canvas.width = Math.floor(canvas.width * .75);
        canvas.height = Math.max(1, Math.floor(canvas.height * .75));
      }
      throw Error('image');
    } finally {
      source.close();
    }
  }

  function paint(canvas, ad, photo) {
    const c = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    c.clearRect(0, 0, w, h);
    c.save();
    c.beginPath();
    c.rect(5, 5, w - 10, h - 10);
    c.clip();
    if (photo) {
      const scale = Math.min((w - 12) / photo.width, (h - 12) / photo.height);
      const iw = photo.width * scale, ih = photo.height * scale;
      c.drawImage(photo, (w - iw) / 2, (h - ih) / 2, iw, ih);
    } else {
      const rejected = ad.mode === 'rejected';
      const text = rejected ? tr('该广告违规', 'Ad violates the rules') : ad.text;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = '900 52px system-ui, sans-serif';
      const chars = Array.from(text || '');
      const rows = [];
      while (chars.length) {
        let line = chars.shift();
        while (chars.length && c.measureText(line + chars[0]).width <= w - 72) line += chars.shift();
        rows.push(line);
      }
      const size = Math.min(52, 175 / Math.max(1, rows.length));
      c.font = '900 ' + size + 'px system-ui, sans-serif';
      c.strokeStyle = '#141a1c';
      c.lineWidth = 5;
      c.fillStyle = rejected ? '#ffb09d' : '#ffedb9';
      rows.forEach((row, index) => {
        const y = h / 2 + (index - (rows.length - 1) / 2) * size * 1.13;
        c.strokeText(row, w / 2, y, w - 50);
        c.fillText(row, w / 2, y, w - 50);
      });
    }
    // Thin paint loss reveals the original steel instead of hiding the dents.
    c.globalCompositeOperation = 'destination-out';
    c.fillStyle = 'rgba(0,0,0,.32)';
    let state = 10973;
    for (let i = 0; i < 360; i++) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      const x = state % w;
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      c.fillRect(x, state % h, 1 + i % 3, 1);
    }
    c.restore();
  }

  window.installPortContainerAds = game => {
    const { THREE: T, camera, player } = game;
    if (game.params?.seed && Number(game.params.seed) !== 4207) return;
    const boxes = game.level?.placed?.filter(row => /^container(?:20|40|40hc)$/.test(row.name)) || [];
    if (!boxes.some(box => box.adSides)) return;
    const ads = new Map(), visuals = new Map();
    const group = new T.Group();
    group.name = 'port-container-ads';
    game.scene.add(group);
    const direction = new T.Vector3();
    const shortcut = document.createElement('button');
    shortcut.type = 'button';
    shortcut.className = 'port-ad-shortcut';
    shortcut.textContent = tr('印广告', 'Print ad');
    shortcut.dataset.key = PRINT_KEY_LABEL;
    shortcut.hidden = true;
    document.getElementById('ui').append(shortcut);

    const dialog = document.createElement('dialog');
    dialog.className = 'port-ad-dialog';
    dialog.innerHTML = '<form><h2></h2><p class="port-ad-rate"></p>' +
      '<label><span></span><select name="mode"><option value="text"></option><option value="image"></option></select></label>' +
      '<label><span></span><textarea name="text" rows="3" maxlength="160"></textarea></label>' +
      '<label hidden><span></span><input name="image" type="file" accept="image/jpeg,image/png,image/webp,image/avif"></label>' +
      '<label><span></span><input name="days" type="number" value="1" min="1" step="1" required></label>' +
      '<p class="port-ad-status" role="status"></p><footer><button type="button"></button><button type="submit"></button></footer></form>';
    document.body.append(dialog);
    const form = dialog.querySelector('form');
    const { mode, text, image, days } = form.elements;
    const submit = form.querySelector('[type=submit]');
    const progress = form.querySelector('.port-ad-status');
    const labels = [
      tr('广告类型', 'Ad format'), tr('广告文案', 'Ad text'),
      tr('横版图片，自动压缩至 0.2 MB 以内', 'Landscape image, compressed to 0.2 MB'),
      tr('投放天数', 'Days')
    ];
    form.querySelectorAll('label > span').forEach((node, i) => node.textContent = labels[i]);
    form.querySelector('h2').textContent = tr('印刷集装箱广告', 'Print a container ad');
    mode.options[0].textContent = tr('纯文字', 'Text');
    mode.options[1].textContent = tr('横版图片', 'Landscape image');
    const cancel = form.querySelector('[type=button]');
    cancel.textContent = tr('关闭', 'Close');
    cancel.addEventListener('click', () => dialog.close());
    mode.addEventListener('change', () => {
      image.closest('label').hidden = mode.value !== 'image';
      text.closest('label').hidden = mode.value !== 'text';
    });
    let selected, mp, detach, revision = '', ticket, request = 0, pollAt = 0, updateAt = 0;
    let loading = false, submitting = false, relock = false, dailyPrice = 0;
    const tell = key => progress.textContent = tr(...(messages[key] || messages.storage));
    function updatePrice() {
      const cost = window.SaltGoldRules.format(Math.max(0, dailyPrice * Number(days.value)));
      submit.textContent = tr('支付 ' + cost + ' 枚盐线币并印刷', 'Print for ' + cost + ' Saltline Coins');
    }
    days.addEventListener('input', updatePrice);
    const playing = () => game.game.state === 'playing' && !game.expedition?.active &&
      !game.qingyun?.active && !game.portalArrival?.active && !window.SaltMapShell?.active;
    const selectable = () => playing() && player.alive && !game.sedan?.riding && !window.__saltBoat?.riding && mp?.joined;
    function aim() {
      if (!selectable()) return null;
      camera.getWorldDirection(direction);
      const hit = game.physics.raycast(camera.position, direction, 8);
      if (hit?.surface !== 'metal' || !hit.normal) return null;
      let best, score = Infinity;
      for (const [box, row] of boxes.entries()) {
        const dx = hit.point.x - row.x, dz = hit.point.z - row.z;
        const cos = Math.cos(row.yaw), sin = Math.sin(row.yaw);
        const x = dx * cos - dz * sin, z = dx * sin + dz * cos;
        const height = row.name === 'container40hc' ? 2.9 : 2.59;
        const normal = hit.normal.x * sin + hit.normal.z * cos;
        const side = Math.sign(z);
        const error = Math.abs(Math.abs(z) - 1.219);
        if (error > .14 || error >= score || normal * side < .7 ||
            Math.abs(x) > (row.name === 'container20' ? 3.03 : 6.095) - .09 ||
            hit.point.y < row.y || hit.point.y > row.y + height) continue;
        score = error;
        best = { box, side, id: box + (side === 1 ? '-a' : '-b') };
      }
      return best;
    }

    function open() {
      if (!selectable() || !selected || document.querySelector('dialog[open]') || ads.has(selected.id)) return;
      relock = Boolean(game.input.locked);
      portAdOpen = true;
      game.input.exitLock();
      form.reset();
      mode.dispatchEvent(new Event('change'));
      progress.textContent = tr('正在核对广告位…', 'Checking this ad space…');
      ticket = null;
      submit.disabled = true;
      dialog.showModal();
      if (!mp.send({ type: 'containerAdQuote', request: ++request, box: selected.box, side: selected.side })) tell('busy');
    }
    shortcut.addEventListener('click', open);
    document.addEventListener('keydown', event => {
      if (!PRINT_KEY_CODES.has(event.code) || event.repeat || event.ctrlKey || event.altKey || event.metaKey ||
          event.target.closest?.('input, textarea, select, [contenteditable]') || document.querySelector('dialog[open]')) return;
      if (!selected || shortcut.hidden) return;
      event.preventDefault();
      open();
    });
    dialog.addEventListener('cancel', event => {
      if (submitting) { event.preventDefault(); return; }
      portAdOpen = false;
      ticket = null;
    });
    dialog.addEventListener('close', () => {
      portAdOpen = false;
      ticket = null;
      if (relock && selectable()) game.input.requestLock();
    });

    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (!ticket || submitting) return;
      submitting = submit.disabled = cancel.disabled = true;
      let printed = false;
      progress.textContent = tr('正在印刷…', 'Printing…');
      try {
        const payload = new FormData();
        payload.set('mode', mode.value);
        payload.set('days', days.value);
        if (mode.value === 'text') payload.set('text', text.value);
        else {
          let file;
          try { file = await compress(image.files[0]); }
          catch { throw Error('image'); }
          payload.set('image', file, 'print.jpg');
        }
        const response = await fetch(ENDPOINT, {
          method: 'POST', headers: { 'X-Container-Ad-Ticket': ticket }, body: payload
        });
        const result = await response.json();
        if (!response.ok || !result.ad) throw Error(result.error || 'storage');
        ads.set(result.ad.id, result.ad);
        pollAt = 0;
        printed = true;
        dialog.close();
      } catch (error) { tell(error.message); }
      finally {
        submitting = cancel.disabled = false;
        submit.disabled = printed || !ticket;
      }
    });

    function receive(message) {
      if (message.type !== 'containerAdQuote' || message.request !== request || !dialog.open) return;
      if (!message.token) { tell(message.error); return; }
      ticket = message.token;
      dailyPrice = message.price;
      progress.textContent = '';
      form.querySelector('.port-ad-rate').textContent = tr('每 24 小时 ' + window.SaltGoldRules.format(dailyPrice) + ' 枚盐线币',
        window.SaltGoldRules.format(dailyPrice) + ' Saltline Coins per 24 hours');
      updatePrice();
      submit.disabled = false;
    }

    async function sync() {
      loading = true;
      try {
        const response = await fetch(ENDPOINT + '?since=' + encodeURIComponent(revision), { cache: 'no-store' });
        if (!response.ok || response.status === 204) return;
        const data = await response.json();
        if (!Array.isArray(data.ads)) return;
        revision = data.revision;
        ads.clear();
        for (const ad of data.ads) ads.set(ad.id, ad);
      } catch {} finally { loading = false; }
    }

    function remove(id, entry) {
      group.remove(entry.mesh);
      entry.mesh.geometry.dispose();
      entry.mesh.material.map.dispose();
      entry.mesh.material.dispose();
      visuals.delete(id);
    }

    function mount(ad, row) {
      const geometry = row.adSides[ad.side].clone();
      const positions = geometry.attributes.position;
      const uv = new Float32Array(positions.count * 2);
      for (let i = 0; i < positions.count; i++) {
        uv[i * 2] = .5 + ad.side * positions.getX(i) / PRINT_WIDTH;
        uv[i * 2 + 1] = .5 + (positions.getY(i) - 1.35) / PRINT_HEIGHT;
      }
      geometry.setAttribute('uv', new T.BufferAttribute(uv, 2));
      geometry.translate(0, 0, ad.side * .0007);
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 288;
      const texture = new T.CanvasTexture(canvas);
      texture.colorSpace = T.SRGBColorSpace;
      texture.anisotropy = 2;
      const material = new T.MeshStandardMaterial({ map: texture, transparent: true, depthWrite: false,
        opacity: .93, roughness: .83, metalness: .1, side: T.FrontSide,
        polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
      const mesh = new T.Mesh(geometry, material);
      mesh.name = 'container-ad-' + ad.id;
      mesh.position.set(row.x, row.y, row.z);
      mesh.rotation.y = row.yaw;
      // The paint blends first, leaving both live and restored impact decals on top.
      mesh.renderOrder = -6;
      mesh.receiveShadow = true;
      group.add(mesh);
      const entry = { mesh, key: ad.image || ad.mode + ':' + ad.at };
      visuals.set(ad.id, entry);
      if (ad.mode === 'image') {
        const photo = new Image();
        photo.onload = () => {
          if (visuals.get(ad.id) !== entry) return;
          paint(canvas, ad, photo);
          texture.needsUpdate = true;
        };
        photo.src = ENDPOINT + '/' + ad.id + '/' + ad.image + '.jpg';
      } else paint(canvas, ad);
    }

    game.portContainerAds = { update() {
      if (window.__mp !== mp) {
        detach?.();
        mp = window.__mp;
        detach = mp?.onMessage(receive);
      }
      const onPort = playing();
      group.visible = onPort;
      if (!onPort && dialog.open && !submitting) dialog.close();
      const now = performance.now();
      if (now < updateAt) return;
      updateAt = now + 110;
      selected = onPort && !dialog.open ? aim() : null;
      shortcut.hidden = !selected || !revision || ads.has(selected.id);
      if (!onPort) return;
      if (!loading && now >= pollAt) {
        pollAt = now + 5000;
        void sync();
      }
      const wallClock = Date.now();
      for (const [id, ad] of ads) if (ad.expiresAt <= wallClock) ads.delete(id);
      const nearby = new Map([...ads].filter(([, ad]) => {
        const row = boxes[ad.box];
        return row?.adSides?.[ad.side] && Math.hypot(row.x - player.pos.x, row.z - player.pos.z) <= 56;
      }));
      for (const [id, entry] of visuals) {
        const ad = nearby.get(id);
        if (!ad || entry.key !== (ad.image || ad.mode + ':' + ad.at)) remove(id, entry);
      }
      for (const [id, ad] of nearby) {
        if (!visuals.has(id)) mount(ad, boxes[ad.box]);
      }
    } };
  };
})();
