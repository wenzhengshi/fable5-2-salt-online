'use strict';

const ledger = require('./goldLedger');

const FILE = ledger.FILE;
const LEGACY_FILE = ledger.LEGACY_FILE;
const DEFAULT_LIMIT = ledger.DEFAULT_LIMIT;
const MAX_LIMIT = ledger.MAX_LIMIT;

function record(payload) {
  return ledger.recordPickup(payload);
}

function list(options) {
  return ledger.list({ ...options, kind: 'pickup' });
}

function status() {
  return ledger.status();
}

module.exports = {
  FILE,
  LEGACY_FILE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  record,
  recordPickup: ledger.recordPickup,
  recordGift: ledger.recordGift,
  list,
  status
};
