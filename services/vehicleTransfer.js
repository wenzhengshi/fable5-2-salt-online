'use strict';

const { randomUUID } = require('node:crypto');
const pending = new Map();

function issue(owner, destination, heading, now = Date.now()) {
  if (!owner) return null;
  for (const [id, passage] of pending) {
    if (passage.expires <= now || passage.owner === owner) pending.delete(id);
  }
  const id = randomUUID();
  pending.set(id, { owner, destination, heading, expires: now + 90000 });
  return id;
}

function take(owner, destination, id, now = Date.now()) {
  const passage = pending.get(id);
  if (!passage || passage.owner !== owner || passage.destination !== destination) return null;
  pending.delete(id);
  return passage.expires > now ? passage : null;
}

function cancel(owner, id) {
  if (pending.get(id)?.owner !== owner) return false;
  return pending.delete(id);
}

module.exports = { issue, take, cancel };
