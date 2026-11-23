'use strict';

const { randomUUID } = require('node:crypto');
const storage = require('../config/storage');
const { isBlocked } = require('./contentFilter');
const { parse } = require('../public/js/gold-rules');
const catalog = require('./port-container-faces.json');

const FILE = 'frontier-inventory.json';
const PRICE = parse('0.1');
const DAY = 86400000;
const MAX_IMAGE_BYTES = 200000;
const RANGE = 8;
const TICKET_MS = 120000;
const tickets = new Map();
let publicAds;
let revision = randomUUID();

function fail(code) {
  throw new Error(code);
}

function targetFor(box, side) {
  if (!Number.isInteger(box) || (side !== 1 && side !== -1) || !catalog[box]) return null;
  return { ...catalog[box], id: box + (side === 1 ? '-a' : '-b'), box, side };
}

function available(player, target, now = Date.now()) {
  if (!target || !player?.joined || !player.active || !player.alive || !player.signOwner ||
      player.mapId || player.inQingyun || player.focusUntil > now ||
      player.boatSeat != null || player.carSeat != null || player.ws?.readyState !== 1) return false;
  const dx = player.pos.x - target.x;
  const dz = player.pos.z - target.z;
  const c = Math.cos(target.yaw), s = Math.sin(target.yaw);
  const along = dx * c - dz * s;
  const outward = (dx * s + dz * c) * target.side;
  const eyeDelta = player.pos.y + 1.35 - target.y - 1.35;
  return outward >= 1.12 && Math.hypot(Math.max(0, Math.abs(along) - 1.6), outward - 1.219, eyeDelta) <= RANGE;
}

function ads() {
  return publicAds ||= storage.readJson(FILE).portContainerAds || {};
}

const active = (ad, now = Date.now()) => !!ad && ad.expiresAt > now;

function publicRow(ad) {
  const { id, box, side, mode, text, purchase, at, expiresAt, rejected } = ad;
  return { id, box, side, mode: rejected ? 'rejected' : mode, text: rejected ? undefined : text, at, expiresAt,
    ...(!rejected && mode === 'image' ? { image: purchase } : {}) };
}

function quote(player, box, side, wallet, now = Date.now()) {
  const target = targetFor(box, side);
  if (!available(player, target, now)) return { error: 'range' };
  if (active(ads()[target.id], now)) return { error: 'occupied' };
  if (now - (player.portAdQuoteAt || 0) < 500) return { error: 'busy' };
  player.portAdQuoteAt = now;
  tickets.delete(player.portAdTicket);
  for (const [key, ticket] of tickets) {
    if (ticket.until <= now || ticket.ws.readyState !== 1) tickets.delete(key);
  }
  const token = randomUUID();
  tickets.set(token, { player, ws: player.ws, target, wallet, until: now + TICKET_MS });
  player.portAdTicket = token;
  return { token, price: PRICE };
}

function ticketFor(token) {
  const ticket = tickets.get(token);
  if (!ticket || ticket.until <= Date.now() || ticket.player.ws !== ticket.ws ||
      !available(ticket.player, ticket.target)) fail('expired');
  return ticket;
}

function validImage(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 20 || bytes.length > MAX_IMAGE_BYTES ||
      bytes.readUInt16BE(0) !== 0xffd8 || bytes.readUInt16BE(bytes.length - 2) !== 0xffd9) return false;
  // Read the JPEG frame header before handing the bytes to any browser decoder.
  for (let offset = 2; offset + 4 <= bytes.length;) {
    if (bytes[offset++] !== 0xff) return false;
    const marker = bytes[offset++];
    if (marker === 0xff) { offset--; continue; }
    if (marker === 0xda || marker === 0xd9) return false;
    const length = bytes.readUInt16BE(offset);
    if (length < 2 || offset + length > bytes.length) return false;
    if ([0xc0, 0xc1, 0xc2].includes(marker)) {
      if (length < 11) return false;
      const height = bytes.readUInt16BE(offset + 3);
      const width = bytes.readUInt16BE(offset + 5);
      return width > height && height > 0 && width <= 1024 && height <= 576;
    }
    offset += length;
  }
  return false;
}

function imageFile(id, version) {
  return 'port-container-ad-' + id + '-' + version + '.json';
}

function publish(token, mode, rawText, rawDays, bytes) {
  const { player, target, wallet } = ticketFor(token);
  const now = Date.now();
  const days = typeof rawDays === 'string' && /^\d+$/.test(rawDays) ? Number(rawDays) : 0;
  const cost = days * PRICE;
  const expiresAt = now + days * DAY;
  if (!Number.isSafeInteger(days) || days < 1 || !Number.isSafeInteger(cost) ||
      !Number.isSafeInteger(expiresAt) || expiresAt > 8640000000000000) fail('days');
  let text = '';
  if (mode === 'text') {
    text = typeof rawText === 'string' ? rawText.replace(/[\p{C}\s]+/gu, ' ').trim() : '';
    if (!text || [...text].length > 80 || isBlocked(text)) fail('text');
  } else if (mode !== 'image' || !validImage(bytes)) fail('image');

  let saved;
  let purchased = false;
  let previous;
  const data = storage.updateJson(FILE, raw => {
    const state = Array.isArray(raw) ? {} : raw;
    const records = state.portContainerAds ||= {};
    const existing = records[target.id];
    if (existing?.purchase === token) {
      saved = existing;
      return state;
    }
    if (active(existing, now)) fail('occupied');
    previous = existing;
    const carried = (state.gold ||= {}).carried ||= {};
    const balance = carried[player.signOwner] || 0;
    if (!Number.isSafeInteger(balance) || balance - wallet.reserved(player.signOwner) < cost) fail('funds');
    if (mode === 'image') storage.writeJson(imageFile(target.id, token), bytes.toString('base64'));
    saved = records[target.id] = { id: target.id, box: target.box, side: target.side,
      mode, text, purchase: token, cost, name: player.name, at: now, expiresAt };
    carried[player.signOwner] = balance - cost;
    purchased = true;
    return state;
  });
  publicAds = data.portContainerAds;
  if (purchased) {
    revision = randomUUID();
    if (previous?.mode === 'image') {
      const fs = require('node:fs');
      const path = require('node:path');
      fs.unlink(path.join(storage.DATA_DIR, imageFile(previous.id, previous.purchase)), error => {
        if (error && error.code !== 'ENOENT') console.error('[port-container-ads] expired file:', error.message);
      });
    }
    try { wallet.deposited(player, now); } catch (error) {
      console.error('[port-container-ads] wallet refresh failed:', error.message);
    }
  }
  return publicRow(saved);
}

function list(since) {
  const now = Date.now();
  const rows = Object.values(ads()).filter(ad => active(ad, now));
  const stamp = revision + ':' + rows.length;
  return since === stamp ? null : { revision: stamp, ads: rows.map(publicRow) };
}

function adminList() {
  return Object.values(ads()).sort((a, b) => b.at - a.at);
}

function review(id, purchase, rejected) {
  if (!/^\d{1,2}-[ab]$/.test(id)) return false;
  const data = storage.updateJson(FILE, state => {
    const ad = state.portContainerAds?.[id];
    if (!ad || ad.purchase !== purchase) fail('missing');
    ad.rejected = rejected;
    return state;
  });
  publicAds = data.portContainerAds;
  revision = randomUUID();
  return true;
}

function image(id, version, admin = false) {
  const ad = ads()[id];
  if (ad?.mode !== 'image' || ad.purchase !== version ||
      (!admin && (!active(ad) || ad.rejected))) return null;
  const data = storage.readJson(imageFile(id, version));
  return typeof data === 'string' ? Buffer.from(data, 'base64') : null;
}

module.exports = { MAX_IMAGE_BYTES, quote, ticketFor, publish, list, image, adminList, review };
