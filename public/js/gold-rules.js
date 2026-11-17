(function (root) {
  'use strict';
  const scale = 1000000;
  const eraDays = 90;
  const eraFor = (day, epoch) => Math.max(0, Math.floor((day - epoch) / eraDays));
  const rewardFor = (day, epoch) => Math.max(1, Math.floor(scale / 2 ** eraFor(day, epoch)));
  function format(units) {
    const whole = Math.floor(units / scale);
    const fraction = String(units % scale).padStart(6, '0').replace(/0+$/, '');
    return fraction ? whole + '.' + fraction : String(whole);
  }
  function hit(origin, dir, target, range) {
    const radius = target.kind === 'drone' ? .94 : .76;
    const y = target.pos.y + (target.kind === 'hound' ? .7 : .05);
    const dx = target.pos.x - origin.x, dy = y - origin.y, dz = target.pos.z - origin.z;
    const along = dx * dir.x + dy * dir.y + dz * dir.z;
    const inside = radius ** 2 - (dx ** 2 + dy ** 2 + dz ** 2 - along ** 2);
    if (inside < 0) return null;
    const entry = along - Math.sqrt(inside);
    return entry > .1 && entry < range ? entry : null;
  }
  const rules = { hit, eraDays, eraFor, rewardFor, format };
  if (typeof module === 'object' && module.exports) module.exports = rules;
  else root.SaltGoldRules = rules;
})(globalThis);
