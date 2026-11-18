(function (root) {
  'use strict';

  const looks = [
    ['salt-sand','盐沙巡逻','Salt Dune Patrol','#c0a16e','#715d44','#e6cf9e','#332d25'],
    ['harbor','港区救援','Harbor Rescue','#d66124','#303f51','#ffdb89','#211e23'],
    ['rain','夜雨巡逻','Rain Patrol','#252a49','#181b2e','#53bece','#19262d'],
    ['frost','白霜勘察','Frost Survey','#dce6ec','#829ca9','#d77138','#2e3d47'],
    ['pine','松林侦察','Pine Recon','#516449','#323d36','#d0bc76','#222e27'],
    ['copper','红铜维修','Copper Utility','#a74935','#5e3131','#e3a879','#302426'],
    ['medic','现场救护','Field Medic','#ece5d4','#536878','#de665e','#302c2d'],
    ['prism','紫电特勤','Violet Detail','#7659a3','#3a2b58','#9dd6b1','#2c2936'],
    ['quay','码头工装','Quayside Workwear','#d4aa33','#263348','#ecce55','#25252b'],
    ['lunar','月尘外勤','Moon Dust Crew','#82939f','#4c576b','#c1d4e0','#2d3643']
  ];
  const options = Object.freeze(Object.fromEntries(looks.map(([id, zh, en, jacket, pants, trim, boots]) =>
    [id, Object.freeze({ id, zh, en, jacket, pants, trim, boots })])));
  const normalize = id => typeof id === 'string' && Object.hasOwn(options, id) ? id : 'default';
  const key = 'saltline.multiplayer.outfit';
  function load() {
    try { return normalize(root.localStorage.getItem(key)); } catch { return 'default'; }
  }
  function save(id) {
    try { root.localStorage.setItem(key, normalize(id)); } catch { /* storage unavailable */ }
  }

  function channel(mesh, material) {
    if (mesh.userData.outfitChannel) return mesh.userData.outfitChannel;
    const name = String(material?.name || '').toLowerCase();
    if (/skin|hair|brow|beard|eye|visor/.test(name)) return null;
    if (/feet|boot/.test(mesh.name.toLowerCase())) return 'boots';
    if (/legs/.test(mesh.name.toLowerCase())) return name.includes('black') ? 'boots' : 'pants';
    if (name.includes('black')) return 'boots';
    if (/grey|brown|head/.test(name + mesh.name.toLowerCase())) return 'trim';
    return 'jacket';
  }

  function bind(model) {
    const sources = [];
    model.traverse(mesh => {
      if (!mesh.isMesh || !mesh.material) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const channels = materials.map(mat => mat?.color && channel(mesh, mat));
      if (channels.some(Boolean)) sources.push({ mesh, original: mesh.material, materials, channels });
    });
    const active = new Map();
    let current = 'default';
    function set(id) {
      id = normalize(id);
      if (id === current) return;
      current = id;
      for (const material of active.values()) material.dispose();
      active.clear();
      const outfit = options[id];
      for (const { mesh, original, materials, channels } of sources) {
        if (!outfit) { mesh.material = original; continue; }
        const dyed = materials.map((material, index) => {
          const part = channels[index];
          if (!part) return material;
          const cacheKey = material.uuid + ':' + part;
          if (!active.has(cacheKey)) {
            const copy = material.clone();
            copy.color.set(outfit[part]);
            if (copy.emissive) copy.emissive.set(0);
            active.set(cacheKey, copy);
          }
          return active.get(cacheKey);
        });
        mesh.material = Array.isArray(original) ? dyed : dyed[0];
      }
    }
    return set;
  }
  const api = { options, normalize, load, save, bind };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SaltSoldierOutfits = api;
})(globalThis);
