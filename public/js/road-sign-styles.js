(function (root) {
  'use strict';
  const entries = [
    ['blue','蓝底白字','Blue with white letters','#2266b9','#0d3a82','#f4f9ff','#f4f9ff','classic'],
    ['yellow','黄底黑字','Yellow with black letters','#ffe16e','#eeb526','#151a1f','#151a1f','classic'],
    ['harbor','港区搪瓷','Harbor Enamel','#f7f1d9','#e1dcc4','#153c5a','#286688','double'],
    ['warning','工程警戒','Worksite Hazard','#ffe16a','#eaa62c','#241803','#231708','hazard'],
    ['rust','荒野锈铁','Rust Trail','#973f2d','#54221d','#ffe5ba','#e49862','pinned'],
    ['trail','林场指路','Forest Trail','#355344','#192e26','#e9eed5','#acbe85','arrows'],
    ['neon','霓虹夜路','Neon Night','#232342','#131428','#f7e8ff','#ec7eff','circuit'],
    ['polar','极地勘察','Polar Survey','#e0f0f1','#b2d4dc','#153a4e','#438ca1','survey'],
    ['transit','橙线站牌','Orange Line','#3f332c','#26211f','#fff1dc','#f9a458','station'],
    ['lunar','月面信标','Lunar Beacon','#363942','#20222a','#f6f4e8','#b0bfd1','orbit'],
    ['jade','青玉界碑','Jade Marker','#2d645a','#173b35','#f1e8bc','#e3c686','brackets'],
    ['post','旧邮驿','Postal Waystation','#f1d3a4','#d0aa77','#422b22','#a0503a','dash']
  ];
  const styles = Object.freeze(Object.fromEntries(entries.map(([id, zh, en, top, bottom, ink, accent, motif]) =>
    [id, Object.freeze({ id, zh, en, top, bottom, ink, accent, motif })])));
  const has = id => typeof id === 'string' && Object.hasOwn(styles, id);

  function decorate(ctx, style) {
    const { motif, accent, ink } = style;
    ctx.strokeStyle = accent;
    ctx.fillStyle = accent;
    ctx.lineWidth = motif === 'classic' ? 5 : 3;
    ctx.strokeRect(10, 10, 492, 150);
    switch (motif) {
      case 'double':
        ctx.strokeRect(16, 16, 480, 138);
        break;
      case 'hazard':
        for (let x = 30; x < 473; x += 24) {
          ctx.beginPath();
          ctx.moveTo(x, 13); ctx.lineTo(x + 10, 13); ctx.lineTo(x + 3, 23); ctx.lineTo(x - 7, 23); ctx.fill();
          ctx.beginPath();
          ctx.moveTo(x, 147); ctx.lineTo(x + 10, 147); ctx.lineTo(x + 3, 157); ctx.lineTo(x - 7, 157); ctx.fill();
        }
        break;
      case 'pinned':
        ctx.globalAlpha = .29;
        for (let i = 0; i < 260; i++) ctx.fillRect((i * 113) % 512, (i * i * 19 + i * 13) % 170, 1 + i % 4, 1);
        ctx.globalAlpha = 1;
        break;
      case 'arrows':
        for (const [x, d] of [[17, 1], [495, -1]]) {
          ctx.beginPath(); ctx.moveTo(x, 69); ctx.lineTo(x + 11 * d, 85); ctx.lineTo(x, 101); ctx.stroke();
        }
        break;
      case 'circuit':
        ctx.strokeStyle = '#76e5eb';
        ctx.beginPath(); ctx.moveTo(10, 58); ctx.lineTo(10, 10); ctx.lineTo(141, 10);
        ctx.moveTo(502, 112); ctx.lineTo(502, 160); ctx.lineTo(371, 160); ctx.stroke();
        break;
      case 'survey':
        for (let x = 38; x < 490; x += 12) ctx.fillRect(x, 12, 2, x % 24 === 14 ? 12 : 6);
        break;
      case 'station':
        ctx.fillRect(12, 12, 8, 146); ctx.fillRect(492, 12, 8, 146);
        break;
      case 'orbit':
        for (const x of [53, 459]) {
          ctx.beginPath(); ctx.ellipse(x, 136, 17, 5, -.27, 0, Math.PI * 2); ctx.stroke();
        }
        break;
      case 'brackets':
        ctx.lineWidth = 1;
        for (const [x, d] of [[16, 1], [496, -1]]) {
          ctx.beginPath(); ctx.moveTo(x + 25 * d, 21); ctx.lineTo(x, 21); ctx.lineTo(x, 148); ctx.lineTo(x + 25 * d, 148); ctx.stroke();
        }
        break;
      case 'dash':
        ctx.setLineDash([7, 5]); ctx.strokeRect(16, 16, 480, 138); ctx.setLineDash([]);
        break;
    }
    ctx.fillStyle = motif === 'classic' ? '#acb7c2' : ink;
    for (const x of [23, 489]) for (const y of [23, 147]) {
      ctx.beginPath(); ctx.arc(x, y, motif === 'classic' ? 4 : 2.4, 0, Math.PI * 2); ctx.fill();
    }
  }

  function draw(ctx, id, label, time = '') {
    const style = has(id) ? styles[id] : styles.blue;
    ctx.save();
    const gradient = ctx.createLinearGradient(0, 0, 0, 170);
    gradient.addColorStop(0, style.top);
    gradient.addColorStop(1, style.bottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 170);
    decorate(ctx, style);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = style.ink;
    ctx.font = 'bold 60px system-ui, "Noto Sans CJK SC", sans-serif';
    if (ctx.measureText(label).width <= 450) ctx.fillText(label, 256, time ? 69 : 86);
    else {
      const glyphs = Array.from(label);
      const middle = Math.ceil(glyphs.length / 2);
      ctx.font = 'bold 47px system-ui, "Noto Sans CJK SC", sans-serif';
      ctx.fillText(glyphs.slice(0, middle).join(''), 256, time ? 49 : 58, 450);
      ctx.fillText(glyphs.slice(middle).join(''), 256, time ? 98 : 114, 450);
    }
    if (time) {
      ctx.font = '500 20px ui-monospace, monospace';
      ctx.fillText(time, 256, 139);
    }
    ctx.restore();
  }

  const api = { styles, has, draw };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SaltRoadSignStyles = api;
})(globalThis);
