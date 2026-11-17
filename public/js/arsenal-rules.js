(function (root, factory) {
  const rules = factory();
  if (typeof module === 'object' && module.exports) module.exports = rules;
  else root.SaltArsenalRules = rules;
})(globalThis, function () {
  'use strict';

  // Name, model, automatic, shots per second, magazine, reserve, reload, damage, range, model length.
  const entries = {
    pac9: ['PAC-9 长岸', null, true, 12, 30, 150, 2.1, 34, 90, 0],
    mp5: ['MP5', 'Gun_MP5', true, 12, 32, 96, 3.1, 18, 70, .65],
    mp7: ['MP7', 'Gun_MP7', true, 13, 20, 60, 2.4, 12, 65, .52],
    m4a1: ['M4A1', 'Gun_M4A1', true, 9, 30, 90, 3.1, 21, 90, .83],
    m110: ['M110', 'Gun_M110', false, 1.6, 6, 18, 3.1, 55, 90, 1.03],
    m249: ['M249', 'Gun_M249', true, 9, 86, 86, 4, 33, 90, .99],
    m1014: ['M1014', 'Gun_M1014', false, 1.5, 6, 18, 2.5, 48, 24, .86],
    m9a1: ['M9A1', 'Gun_M9A1', false, 13, 12, 36, 3.1, 22, 50, .29],
    knife: ['战术刀', 'Gun_Knife', false, 2, 0, 0, 0, 33, 2.4, .34]
  };
  return Object.freeze(Object.fromEntries(Object.entries(entries).map(([id, values]) => {
    const [name, model, auto, rate, mag, reserve, reload, damage, range, length] = values;
    return [id, Object.freeze({ id, name, model, auto, rate, mag, reserve, reload, damage, range, length })];
  })));
});
