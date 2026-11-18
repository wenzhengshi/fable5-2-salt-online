'use strict';
const fs = require('node:fs');
const path = require('node:path');
const storage = require('../config/storage');
const catalog = require('../public/js/shop-catalog');
const outfits = require('../public/js/soldier-outfits');
const FILE = 'frontier-inventory.json';

function effectivePrice(data, product) {
  const custom = data.shopPrices?.[product.key];
  return Number.isSafeInteger(custom) && custom > 0 ? custom : product.price;
}

function priceList(data = storage.readJson(FILE)) {
  return Object.fromEntries(Object.values(catalog.products).map(product => [
    product.key, effectivePrice(data, product)
  ]));
}

function savePrice(key, value) {
  const product = catalog.get(key);
  if (!product || (value !== null && (!Number.isSafeInteger(value) || value <= 0))) return null;
  const data = storage.updateJson(FILE, raw => {
    const current = Array.isArray(raw) ? {} : raw;
    const changes = current.shopPrices ||= {};
    if (value === null || product.price === value) delete changes[key];
    else changes[key] = value;
    return current;
  });
  return priceList(data);
}

const quantity = value => value === true ? 1 : Number.isSafeInteger(value) && value > 0 ? value : 0;
const repeatable = product => product.kind !== 'outfit';
function inventoryCounts(items) {
  return Object.fromEntries(Object.entries(items || {})
    .filter(([key, count]) => catalog.get(key) && quantity(count))
    .map(([key, count]) => [key, quantity(count)]));
}
function setCount(items, key, count) {
  if (count) items[key] = count;
  else delete items[key];
}

function recoverSignDebits() {
  if (!Object.keys(storage.readJson(FILE).pendingSignDebits || {}).length) return;
  storage.updateJson(FILE, data => {
    for (const [id, { owner, key }] of Object.entries(data.pendingSignDebits || {})) {
      try {
        fs.statSync(path.join(storage.DATA_DIR, 'road-signs', id + '.json'));
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        const items = (data.cosmetics ||= {})[owner] ||= {};
        setCount(items, key, quantity(items[key]) + 1);
      }
    }
    delete data.pendingSignDebits;
    return data;
  });
}

function transfer(data, row, owner, key, deposit) {
  const product = catalog.get(key);
  if (!product || product.kind === 'pass') throw new Error('cosmetic');
  const profiles = data.cosmetics ||= {};
  const carried = profiles[owner] ||= {};
  const stored = row.cosmetics = { ...row.cosmetics };
  const source = deposit ? carried : stored;
  const target = deposit ? stored : carried;
  const from = quantity(source[key]), to = quantity(target[key]);
  if (!from) throw new Error('cosmetic');
  if (to && !repeatable(product)) throw new Error('cosmeticDuplicate');
  if (!Number.isSafeInteger(to + 1)) throw new Error('cosmetic');
  setCount(source, key, from - 1);
  setCount(target, key, to + 1);
}

function createShop({ players, send, gold, onOutfitChanged }) {
  recoverSignDebits();
  function owns(player, key) { return quantity(player?.shopOwned?.[key]) > 0; }
  function enter(map, occupants) {
    if (map !== 'lunar') return true;
    const required = new Map();
    for (const player of occupants) {
      if (!player?.signOwner) return false;
      required.set(player.signOwner, (required.get(player.signOwner) || 0) + 1);
    }
    if (!required.size) return false;
    let accepted = false;
    try {
      storage.updateJson(FILE, data => {
        const profiles = data.cosmetics || {};
        for (const [owner, count] of required) if (quantity(profiles[owner]?.[catalog.pass]) < count) return data;
        for (const [owner, count] of required) {
          const items = profiles[owner];
          setCount(items, catalog.pass, quantity(items[catalog.pass]) - count);
        }
        accepted = true;
        return data;
      });
    } catch (error) {
      console.error('[shop] pass debit failed:', error.message);
      return false;
    }
    if (accepted) for (const player of occupants) refresh(player);
    return accepted;
  }

  function claimSign(sign) {
    const key = 'sign:' + sign.style;
    if (!catalog.get(key)) return { finish() {} };
    let accepted = false;
    storage.updateJson(FILE, data => {
      const carried = data.cosmetics?.[sign.owner];
      const count = quantity(carried?.[key]);
      if (!count) return data;
      setCount(carried, key, count - 1);
      (data.pendingSignDebits ||= {})[sign.id] = { owner: sign.owner, key };
      accepted = true;
      return data;
    });
    if (!accepted) return null;
    return { finish(saved) {
      storage.updateJson(FILE, data => {
        if (!data.pendingSignDebits?.[sign.id]) return data;
        if (!saved) {
          const carried = data.cosmetics[sign.owner];
          setCount(carried, key, quantity(carried[key]) + 1);
        }
        delete data.pendingSignDebits[sign.id];
        return data;
      });
    } };
  }
  function outfitFor(player, id) {
    const value = outfits.normalize(id);
    return value !== 'default' && owns(player, 'outfit:' + value) ? value : 'default';
  }
  function publish(player, data = storage.readJson(FILE)) {
    const owned = data.cosmetics?.[player.signOwner] || {};
    player.shopOwned = owned;
    const outfit = outfitFor(player, player.outfit);
    if (outfit !== player.outfit) {
      player.outfit = outfit;
      onOutfitChanged?.(player);
    }
    send(player.ws, { type: 'shopState', balance: data.gold?.carried?.[player.signOwner] || 0,
      prices: priceList(data), owned: Object.keys(inventoryCounts(owned)), counts: inventoryCounts(owned) });
  }
  function refresh(player) {
    const data = storage.readJson(FILE);
    for (const other of players.values()) {
      if (other.joined && other.signOwner === player.signOwner) publish(other, data);
    }
  }
  function handle(player, msg, now) {
    if (!player.joined || !player.signOwner) return;
    if (msg.type === 'shopList') return publish(player);
    const request = Number.isSafeInteger(msg.request) && msg.request > 0 ? msg.request : undefined;
    const reply = reason => send(player.ws, { type: 'shopResult', key: msg.key, request, reason });
    if (now - (player.shopPurchaseAt || 0) < 300) return reply('busy');
    player.shopPurchaseAt = now;
    const product = catalog.get(msg.key);
    if (!product) return reply('unknown');
    let reason;
    try {
      storage.updateJson(FILE, raw => {
        const data = Array.isArray(raw) ? {} : raw;
        const amount = effectivePrice(data, product);
        const owned = (data.cosmetics ||= {})[player.signOwner] ||= {};
        const carried = (data.gold ||= {}).carried ||= {};
        const balance = carried[player.signOwner] || 0;
        const count = quantity(owned[product.key]);
        if (count && !repeatable(product)) reason = 'owned';
        else if (!Number.isSafeInteger(count + 1)) reason = 'storage';
        else if (msg.price !== amount) reason = 'priceChanged';
        else if (!Number.isSafeInteger(balance) || balance - gold.reserved(player.signOwner) < amount) reason = 'funds';
        else {
          carried[player.signOwner] = balance - amount;
          setCount(owned, product.key, count + 1);
        }
        return data;
      });
    } catch (error) {
      console.error('[shop] purchase failed:', error.message);
      return reply('storage');
    }
    if (!reason) gold.deposited(player, now);
    refresh(player);
    reply(reason);
  }
  return { owns, enter, claimSign, outfitFor, publish, refresh, handle };
}

module.exports = { createShop, transfer, priceList, savePrice, inventoryCounts };
