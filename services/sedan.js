'use strict';

const rules = require('../public/js/sedan-rules');

module.exports = function createSedan(players, send, dropping, enterMap = () => true) {
  const cars = [];
  const sessions = new WeakMap();
  let nextCarId = 1;
  const mapOf = player => player.inQingyun ? 'qingyun' : player.mapId || 'port';

  function spawn(map = 'dustfall') {
    const car = { ...rules.create(), id: `sedan-${nextCarId++}`, map };
    cars.push(car);
    sessions.set(car, { lastPose: 0, lastPortal: 0, waitingForDriver: false });
    return car;
  }

  function carOf(player) {
    if (!player?.carId) return null;
    return cars.find(car => car.id === player.carId) || null;
  }

  function ensureDustfallCar() {
    if (cars.some(car => car.map === 'dustfall')) return false;
    spawn('dustfall');
    return true;
  }

  function carOnMap(map, player) {
    const riding = carOf(player);
    if (riding?.map === map) return riding;
    const candidates = cars.filter(car => car.map === map);
    if (candidates.length < 2) return candidates[0] || null;
    return candidates.sort((a, b) => Math.hypot(a.x - player.pos.x, a.z - player.pos.z) -
      Math.hypot(b.x - player.pos.x, b.z - player.pos.z))[0];
  }

  function retireEmptyCar(map) {
    const index = cars.findIndex(car => car.map === map && car.seats.every(id => id == null));
    if (index < 0) return true;
    sessions.delete(cars[index]);
    cars.splice(index, 1);
    return true;
  }

  spawn('dustfall');

  function sync() {
    for (const car of cars) {
      car.seats.forEach((id, index) => {
        if (!id) return;
        const player = players.get(String(id));
        if (!player || !player.alive || mapOf(player) !== car.map) {
          if (player) remove(player);
          else car.seats[index] = null;
          return;
        }
        player.pos = rules.seat(car, index);
        player.carHeading = car.heading;
        player.moving = player.sprint = false;
      });
    }
    ensureDustfallCar();
  }

  function snapshot(map, player) {
    const car = carOnMap(map, player);
    if (!car) return null;
    return {
      ...car,
      seats: car.seats.slice(),
      seat: carOf(player) === car ? player.carSeat ?? null : null
    };
  }

  function remove(player) {
    if (player.carSeat == null) return;
    const car = carOf(player);
    const index = player.carSeat;
    if (car && car.seats[index] === player.id) car.seats[index] = null;
    player.carSeat = null;
    player.carId = null;
    player.carHeading = null;
    player.motionBudget = null;
    if (car && index === 0) {
      car.speed = 0;
      const session = sessions.get(car);
      session.lastPose = 0;
      session.waitingForDriver = false;
    }
  }

  function reply(player, reason, position) {
    send(player.ws, { type: 'sedanResult', reason, position, car: snapshot(mapOf(player), player) });
  }

  function handle(player, msg, now) {
    if (!player.joined || !player.alive || !player.active || player.boatSeat != null ||
        dropping(player, now)) {
      if (msg.type === 'sedanLeave') reply(player, 'not-riding');
      return;
    }
    if (msg.type === 'sedanBoard') {
      if (player.carSeat != null) return;
      const requested = msg.carId ? cars.find(car => car.id === msg.carId && car.map === mapOf(player)) : null;
      const car = requested && rules.near(requested, player.pos) ? requested : carOnMap(mapOf(player), player);
      if (!car || !rules.near(car, player.pos)) {
        reply(player, 'range');
        return;
      }
      const seat = car.seats.indexOf(null);
      if (seat < 0) { reply(player, 'full'); return; }
      if (Math.abs(car.speed) > rules.boardSpeed) { reply(player, 'moving'); return; }
      car.seats[seat] = player.id;
      player.carSeat = seat;
      player.carId = car.id;
      sync();
      reply(player, 'board');
      return;
    }
    const car = carOf(player);
    if (!car || player.carSeat == null || mapOf(player) !== car.map) {
      if (msg.type === 'sedanLeave') reply(player, 'not-riding');
      return;
    }
    const session = sessions.get(car);
    if (msg.type === 'sedanLeave') {
      const reportedSpeed = Number(msg.speed);
      const driverPark = player.carSeat === 0 && msg.park === true &&
        Number.isFinite(reportedSpeed) && Math.abs(reportedSpeed) <= rules.exitSpeed;
      if (Math.abs(car.speed) > rules.exitSpeed && !driverPark) {
        reply(player, 'moving');
        return;
      }
      const candidates = rules.exits(player.carSeat);
      const index = Number.isInteger(msg.index) && candidates[msg.index] ? msg.index : 0;
      const [x, z] = candidates[index];
      const position = rules.point(car, x, 0, z);
      car.speed = 0;
      session.lastPose = now;
      remove(player);
      player.pos = position;
      reply(player, 'leave', position);
      return;
    }
    if (player.carSeat !== 0) return;
    if (msg.type === 'sedanReady') {
      if (msg.revision === car.revision) session.waitingForDriver = false;
      return;
    }
    if (session.waitingForDriver || msg.revision !== car.revision) return;
    if (msg.type === 'sedanPose') {
      const pose = msg.pose;
      if (!pose || !['x', 'y', 'z', 'heading', 'speed'].every(key => Number.isFinite(pose[key]))) return;
      const elapsed = session.lastPose ? now - session.lastPose : 100;
      if (elapsed < 45) return;
      const step = Math.min(.28, elapsed / 1000);
      const candidate = { map: car.map, ...pose };
      if (pose.map !== undefined || !rules.inside(candidate) ||
          pose.speed > rules.maxSpeed + .1 || pose.speed < -rules.maxReverse - .1 ||
          pose.y < -3.5 || pose.y > 220 ||
          Math.hypot(pose.x - car.x, pose.z - car.z) > rules.maxSpeed * step + .27 ||
          Math.abs(pose.y - car.y) > 11 * step + (car.speed === 0 ? 1.4 : .32) ||
          Math.abs(rules.angle(pose.heading - car.heading)) > 1.9 * step + .12) return;
      const { x, y, z, heading, speed } = pose;
      Object.assign(car, { x, y, z, heading: rules.angle(heading), speed });
      session.lastPose = now;
      sync();
      return;
    }
    if (msg.type !== 'sedanPortal' || now - session.lastPortal < 1800) return;
    const route = rules.portal(car);
    if (!route || msg.destination !== route.to) return;
    const resident = cars.find(other => other !== car && other.map === route.to);
    if (resident?.seats.some(Boolean)) return;
    const occupants = car.seats.filter(id => id != null).map(id => players.get(String(id)));
    if (!enterMap(route.to, occupants)) {
      send(player.ws, { type: 'mapDenied', map: route.to, reason: 'locked' });
      return;
    }
    if (resident) retireEmptyCar(route.to);
    session.lastPortal = now;
    session.lastPose = 0;
    session.waitingForDriver = true;
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
    if (car.map !== 'dustfall') ensureDustfallCar();
  }

  return { handle, sync, remove, snapshot };
};
