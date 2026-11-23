'use strict';

const PROTOCOL = self.location.protocol === 'https:' ? 'wss://' : 'ws://';
const ENDPOINT = PROTOCOL + self.location.host + '/ws?probe=1';
const SAMPLE_LIMIT = 5;
const PING_INTERVAL_MS = 1000;
const RECONNECT_MS = 2500;

let socket = null;
let pingTimer = 0;
let reconnectTimer = 0;
let samples = [];
let stopped = false;

function post(message) {
  try { self.postMessage(message); } catch (err) { /* page is closing */ }
}

function scheduleReconnect() {
  if (stopped || reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = 0;
    open();
  }, RECONNECT_MS);
}

function sendPing() {
  if (!socket || socket.readyState !== 1) return;
  try {
    socket.send('{"type":"ping","t":' + performance.now().toFixed(3) + '}');
  } catch (err) { /* the close handler will reconnect */ }
}

function open() {
  if (stopped) return;
  try {
    socket = new WebSocket(ENDPOINT);
  } catch (err) {
    post({ type: 'state', state: 'offline' });
    scheduleReconnect();
    return;
  }
  socket.addEventListener('open', () => {
    post({ type: 'state', state: 'online' });
    sendPing();
    clearInterval(pingTimer);
    pingTimer = setInterval(sendPing, PING_INTERVAL_MS);
  });
  socket.addEventListener('message', (event) => {
    let msg;
    try { msg = JSON.parse(event.data); } catch (err) { return; }
    if (!msg || msg.type !== 'pong' || typeof msg.t !== 'number') return;
    const rtt = Math.max(0, performance.now() - msg.t);
    samples.push(rtt);
    if (samples.length > SAMPLE_LIMIT) samples.shift();
    const sorted = samples.slice().sort((a, b) => a - b);
    post({
      type: 'rtt',
      rtt: sorted[Math.floor(sorted.length / 2)],
      latest: rtt,
      sentAt: Date.now()
    });
  });
  socket.addEventListener('error', () => {});
  socket.addEventListener('close', () => {
    clearInterval(pingTimer);
    pingTimer = 0;
    socket = null;
    post({ type: 'state', state: 'offline' });
    scheduleReconnect();
  });
}

self.addEventListener('message', (event) => {
  if (event.data !== 'stop') return;
  stopped = true;
  clearTimeout(reconnectTimer);
  clearInterval(pingTimer);
  reconnectTimer = 0;
  pingTimer = 0;
  try { socket && socket.close(); } catch (err) { /* already closed */ }
  socket = null;
});

open();
