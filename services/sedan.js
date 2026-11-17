'use strict';

const rules = require('../public/js/sedan-rules');

module.exports = function createSedan(players, send, dropping) {
  const car = rules.create();
  let lastPose = 0;
  let lastPortal = 0;
  let waitingForDriver = false;
  const mapOf = player => player.inQingyun ? 'qingyun' : player.mapId || 'port';

  function sync() {
    car.seats.forEach((id, index) => {
      if (!id) return;
      const player = players.get(String(id));
      if (!player || !player.alive || mapOf(player) !== car.map) {
        if (player) remove(player);
        else car.seats[index] = null;
        return;
      }
      player.pos = rules.seat(car, index);
      player.moving = player.sprint = false;
    });
  }

  function snapshot(map, player) {
    if (map !== car.map) return null;
    return { ...car, seats: car.seats.slice(), seat: player.carSeat ?? null };
  }

  function remove(player) {
    if (player.carSeat == null) return;
    const index = player.carSeat;
    if (car.seats[index] === player.id) car.seats[index] = null;
    player.carSeat = null;
    player.motionBudget = null;
    if (index === 0) {
      car.speed = 0;
      lastPose = 0;
      waitingForDriver = false;
    }
  }

  function reply(player, reason, position) {
    send(player.ws, { type: 'sedanResult', reason, position, car: snapshot(mapOf(player), player) });
  }

  function handle(player, msg, now) {
    if (!player.joined || !player.alive || !player.active || mapOf(player) !== car.map ||
        player.boatSeat != null || dropping(player, now)) return;
    if (msg.type === 'sedanBoard') {
      if (player.carSeat != null || !rules.near(car, player.pos)) return;
      const seat = car.seats.indexOf(null);
      if (seat < 0) { reply(player, 'full'); return; }
      if (Math.abs(car.speed) > 1.5) { reply(player, 'moving'); return; }
      car.seats[seat] = player.id;
      player.carSeat = seat;
      sync();
      reply(player, 'board');
      return;
    }
    if (player.carSeat == null) return;
    if (msg.type === 'sedanLeave') {
      if (Math.abs(car.speed) > 1.5) { reply(player, 'moving'); return; }
      const candidates = rules.exits(player.carSeat);
      if (!Number.isInteger(msg.index) || !candidates[msg.index]) return;
      const [x, z] = candidates[msg.index];
      const position = rules.point(car, x, 0, z);
      remove(player);
      player.pos = position;
      reply(player, 'leave', position);
      return;
    }
    if (player.carSeat !== 0) return;
    if (msg.type === 'sedanReady') {
      if (msg.revision === car.revision) waitingForDriver = false;
      return;
    }
    if (waitingForDriver || msg.revision !== car.revision) return;
    if (msg.type === 'sedanPose') {
      const pose = msg.pose;
      if (!pose || !['x', 'y', 'z', 'heading', 'speed'].every(key => Number.isFinite(pose[key]))) return;
      const elapsed = lastPose ? now - lastPose : 100;
      if (elapsed < 45) return;
      const step = Math.min(.28, elapsed / 1000);
      const candidate = { map: car.map, ...pose };
      if (pose.map !== undefined || !rules.inside(candidate) ||
          Math.abs(pose.speed) > rules.maxSpeed + .1 || pose.y < -3.5 || pose.y > 220 ||
          Math.hypot(pose.x - car.x, pose.z - car.z) > rules.maxSpeed * step + .27 ||
          Math.abs(pose.y - car.y) > 11 * step + (car.speed === 0 ? 1.4 : .32) ||
          Math.abs(rules.angle(pose.heading - car.heading)) > 1.9 * step + .12) return;
      const { x, y, z, heading, speed } = pose;
      Object.assign(car, { x, y, z, heading: rules.angle(heading), speed });
      lastPose = now;
      sync();
      return;
    }
    if (msg.type !== 'sedanPortal' || now - lastPortal < 1800) return;
    const route = rules.portal(car);
    if (!route || msg.destination !== route.to) return;
    lastPortal = now;
    lastPose = 0;
    waitingForDriver = true;
    Object.assign(car, route.arrival, { speed: 0, map: route.to, revision: car.revision + 1 });
    for (const id of car.seats) {
      if (id == null) continue;
      const occupant = players.get(String(id));
      if (!occupant) continue;
      occupant.inQingyun = car.map === 'qingyun';
      occupant.mapId = ['qingyun', 'port'].includes(car.map) ? null : car.map;
      occupant.frontierDrop = null;
      occupant.shotCredits = 0;
      occupant.pendingShot = null;
      occupant.motionBudget = null;
      occupant.protectedUntil = now + 2500;
      occupant.pos = rules.seat(car, occupant.carSeat);
      send(occupant.ws, { type: 'sedanTravel', car: snapshot(car.map, occupant) });
    }
  }

  return { handle, sync, remove, snapshot };
};
