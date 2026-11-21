(function (root) {
  'use strict';
  const node = typeof module === 'object' && module.exports;
  const signs = node ? require('./road-sign-styles').styles : root.SaltRoadSignStyles.styles;
  const outfits = node ? require('./soldier-outfits').options : root.SaltSoldierOutfits.options;
  const pass = 'pass:lunar';
  const products = Object.freeze(Object.fromEntries([
    ...Object.values(signs).slice(2).map((style, i) => ({
      ...style, key: 'sign:' + style.id, kind: 'sign', price: i < 5 ? 250000 : 400000
    })),
    ...Object.values(outfits).map((outfit, i) => ({
      ...outfit, key: 'outfit:' + outfit.id, kind: 'outfit', price: outfit.id === 'lunar-suit' ? 1000000 : i < 5 ? 500000 : 750000
    })),
    { key: pass, kind: 'pass', id: 'lunar', zh: '月球通行证', en: 'Lunar Pass', price: 1000000 }
  ].map(product => [product.key, Object.freeze(product)])));
  const get = key => typeof key === 'string' && Object.hasOwn(products, key) ? products[key] : undefined;
  const api = { pass, products, get };
  if (node) module.exports = api;
  else root.SaltShopCatalog = api;
})(globalThis);
