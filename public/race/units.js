const machineKinds = new Set(['hound', 'drone']);
const models = new Map();

export function kindOf(value) {
  return ['classic', 'male', 'female', 'hound', 'drone'].includes(value) ? value : 'classic';
}

async function load(kind) {
  if (kind === 'classic') return window.ClassicAvatar;
  if (machineKinds.has(kind)) {
    await import('/js/unit-models.js');
    const response = await fetch('/race/models/' + kind);
    if (!response.ok) throw new Error('Could not load race unit ' + kind);
    const group = new window.__G.THREE.ObjectLoader().parse(await response.json());
    window.SaltUnitModels.useSource(kind, group);
    return window.SaltUnitModels;
  }
  await import('/js/hunter-avatar.js');
  if (!await window.SoldierModels.whenReady(kind)) throw new Error('Could not load race unit ' + kind);
  return window.SoldierModels;
}

export async function create(value, outfit) {
  const kind = kindOf(value);
  if (!models.has(kind)) models.set(kind, load(kind));
  let api;
  try {
    api = await models.get(kind);
  } catch (error) {
    models.delete(kind);
    console.warn('[race] unit load failed', error);
    return window.ClassicAvatar.create('classic', { outfit });
  }
  const unit = api.create(kind, { outfit });
  if (unit && kind === 'drone') unit.model.position.y = .55;
  return unit || window.ClassicAvatar.create('classic', { outfit });
}
