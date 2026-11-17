(() => {
  'use strict';
  let template;

  function build(THREE) {
    const suit = new THREE.Group();
    const fabric = new THREE.MeshStandardMaterial({ color: 0xe8e6df, roughness: .92 });
    const joints = new THREE.MeshStandardMaterial({ color: 0x282d33, roughness: .76 });
    const stripe = new THREE.MeshStandardMaterial({ color: 0xca563a, roughness: .68 });
    const visor = new THREE.MeshStandardMaterial({ color: 0x323b49, metalness: .36, roughness: .19 });
    const unitBox = new THREE.BoxGeometry(1, 1, 1);
    const unitSphere = new THREE.SphereGeometry(1, 12, 8);
    function part(parent, geo, mat, x, y, z, sx, sy, sz) {
      const object = new THREE.Mesh(geo, mat);
      object.position.set(x, y, z);
      object.scale.set(sx, sy, sz);
      parent.add(object);
      return object;
    }
    part(suit, unitSphere, fabric, 0, 1.14, 0, .30, .39, .205);
    part(suit, unitBox, joints, 0, .98, .01, .49, .11, .35);
    part(suit, unitBox, fabric, 0, 1.26, .22, .42, .56, .23);
    part(suit, unitBox, stripe, 0, 1.42, .345, .31, .06, .025);
    part(suit, unitBox, joints, 0, 1.26, -.185, .24, .20, .11);
    part(suit, unitBox, stripe, .05, 1.29, -.25, .09, .055, .025);
    part(suit, unitSphere, joints, 0, 1.44, 0, .20, .10, .195);
    part(suit, unitSphere, fabric, 0, 1.65, 0, .238, .237, .25);
    part(suit, unitSphere, visor, 0, 1.66, -.124, .194, .147, .168);

    for (const side of [-1, 1]) {
      const leg = new THREE.Group();
      leg.name = side < 0 ? 'left-leg' : 'right-leg';
      leg.position.set(side * .145, .91, 0);
      suit.add(leg);
      part(leg, unitSphere, fabric, 0, -.32, 0, .124, .383, .125);
      part(leg, unitBox, joints, 0, -.465, -.078, .15, .12, .12);
      part(leg, unitBox, fabric, 0, -.736, -.042, .21, .20, .285);
      part(leg, unitBox, joints, 0, -.834, -.042, .216, .047, .29);

      const arm = new THREE.Group();
      arm.name = side < 0 ? 'left-arm' : 'right-arm';
      arm.position.set(side * .30, 1.34, -.015);
      suit.add(arm);
      part(arm, unitSphere, fabric, 0, -.095, 0, .118, .228, .119);
      part(arm, unitSphere, stripe, 0, -.083, 0, .12, .039, .121);
      const glove = part(arm, unitSphere, fabric, -side * .023, -.247, -.14, .09, .12, .239);
      glove.rotation.x = .35;
      part(arm, unitSphere, joints, -side * .045, -.226, -.312, .086, .084, .087);
    }
    const weapon = new THREE.Group();
    weapon.name = 'lunar-weapon';
    weapon.position.set(.14, 1.15, -.39);
    suit.add(weapon);
    part(weapon, unitBox, joints, 0, 0, -.13, .11, .15, .56);
    part(weapon, unitBox, joints, 0, .014, -.466, .055, .06, .17);
    part(weapon, unitBox, joints, 0, -.12, -.08, .074, .12, .095);
    return suit;
  }

  window.SaltLunarSuit = function (THREE) {
    template ||= build(THREE);
    const model = template.clone(true);
    const left = model.getObjectByName('left-leg');
    const right = model.getObjectByName('right-leg');
    const weapon = model.getObjectByName('lunar-weapon');
    let step = 0;
    return {
      model,
      update(dt, moving, armed) {
        if (moving) step += dt * 8;
        const angle = moving ? Math.sin(step) * .43 : 0;
        left.rotation.x = THREE.MathUtils.lerp(left.rotation.x, angle, Math.min(1, dt * 12));
        right.rotation.x = -left.rotation.x;
        weapon.visible = !!armed;
      }
    };
  };
})();
