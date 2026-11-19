(() => {
  'use strict';
  window.installSharedPatrols = function (game) {
    const { THREE, scene } = game;
    const units = new Map();
    let map, rows = [];
    const activeMap = () => game.expedition?.active?.id || (game.qingyun?.active ? 'qingyun' : 'port');
    const spawnLocal = game.enemies?.spawn;
    if (spawnLocal) {
      game.enemies.spawn = function (kind, ...args) {
        if (activeMap() !== 'port' && (kind === 'hound' || kind === 'gull')) return null;
        return spawnLocal.call(this,kind,...args);
      };
    }

    function remove(id) {
      const unit = units.get(id);
      if (!unit) return;
      unit.view.model.removeFromParent();
      unit.view.dispose();
      units.delete(id);
    }

    function snapshot(nextMap, nextRows) {
      map = nextMap;
      rows = Array.isArray(nextRows) ? nextRows : [];
      const wanted = new Set(rows.map(row => row.id));
      for (const id of units.keys()) if (!wanted.has(id) || activeMap() !== map) remove(id);
    }

    function update(dt, connected) {
      if (!connected || map === 'port' || activeMap() !== map) {
        for (const id of units.keys()) remove(id);
        if (!connected) rows = [];
        return;
      }
      for (const row of rows) {
        let unit = units.get(row.id);
        if (!unit) {
          const view = window.SaltUnitModels?.create(row.kind === 'hound' ? 'hound' : 'drone');
          if (!view) continue;
          view.model.name = 'shared-patrol-' + row.id;
          view.model.position.set(row.x,row.y,row.z);
          view.model.rotation.y = row.yaw;
          scene.add(view.model);
          units.set(row.id, unit = { view });
        }
        const model = unit.view.model;
        const mix = 1-Math.exp(-dt*14);
        model.position.x += (row.x-model.position.x)*mix;
        model.position.y += (row.y-model.position.y)*mix;
        model.position.z += (row.z-model.position.z)*mix;
        const turn = row.yaw-model.rotation.y;
        model.rotation.y += Math.atan2(Math.sin(turn),Math.cos(turn))*mix;
        unit.view.rig.update(dt,{moving:row.moving});
      }
    }

    function intersect(origin, dir, range) {
      if (map === 'port' || activeMap() !== map) return null;
      let nearest = null;
      for (const row of rows) {
        const position = units.get(row.id)?.view.model.position || row;
        const x=position.x-origin.x, y=position.y+(row.kind==='hound'?.65:0)-origin.y, z=position.z-origin.z;
        const along=x*dir.x+y*dir.y+z*dir.z;
        const side=x*x+y*y+z*z-along*along;
        const radius=row.kind==='hound'?.92:.78;
        if(along<0||side>=radius*radius)continue;
        const hit=Math.max(0,along-Math.sqrt(radius*radius-side));
        if(hit<(nearest??range))nearest=hit;
      }
      return nearest;
    }

    function destroyed(message) {
      if (message.map !== map) return;
      rows = rows.filter(row => row.id !== message.id);
      remove(message.id);
      if (activeMap() === map && message.pos) {
        const point = new THREE.Vector3(message.pos.x,message.pos.y,message.pos.z);
        game.fx?.sparks?.(point,new THREE.Vector3(0,1,0),18);
      }
    }

    return {snapshot,update,intersect,destroyed};
  };
})();
