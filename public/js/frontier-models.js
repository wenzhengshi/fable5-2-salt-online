(() => {
  'use strict';
  window.createFrontierModels = function (T) {
    function wear(base, label, type) {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 128;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, 128, 128);
      let seed = 7183;
      for (let i = 0; i < 8200; i++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        ctx.fillStyle = seed % 3 ? 'rgba(12,10,7,.13)' : 'rgba(252,235,196,.13)';
        ctx.fillRect(seed & 127, (seed >>> 10) & 127, type === 'cloth' ? 3 : 1, 1);
      }
      if (type === 'cloth') {
        ctx.strokeStyle = '#241c1677';
        for (let x = 0; x < 128; x += 8) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 128); ctx.stroke();
        }
      }
      if (label) {
        ctx.fillStyle = '#eee4ce';
        ctx.font = 'bold 17px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(label, 64, 72);
      }
      const texture = new T.CanvasTexture(canvas);
      texture.colorSpace = T.SRGBColorSpace;
      texture.anisotropy = 4;
      return texture;
    }

    function material(color, roughness, metalness = 0, label = '', type = '') {
      const map = wear(color, label, type);
      return new T.MeshStandardMaterial({ map, roughness, metalness,
        ...(type === 'cloth' ? { bumpMap: map, bumpScale: .014 } : {}) });
    }
    const steel = material('#535957', .56, .65);
    const dark = material('#252829', .68, .36);
    const webbing = material('#766447', .94, 0, '', 'cloth');
    const olive = material('#62654c', .86, .05, '', 'cloth');
    const armor = material('#4a5143', .78, .11, 'III A', 'cloth');
    const green = material('#566143', .73, .31);
    const medic = material('#922d29', .83, .02, '+', 'cloth');
    const badge = material('#274d65', .54, .31, 'QUIET');
    const drink = material('#397e92', .38, .53, 'BOOST');
    const pale = material('#a5ac9f', .51, .49);
    const chute = Array.from({ length: 8 }, (_, index) =>
      material(index % 2 ? '#c8a26a' : '#aa663a', .94, 0, '', 'cloth'));

    function add(parent, geometry, mat, x = 0, y = 0, z = 0) {
      const piece = new T.Mesh(geometry, mat);
      piece.position.set(x, y, z);
      parent.add(piece);
      return piece;
    }
    function box(parent, mat, w, h, d, x = 0, y = 0, z = 0) {
      return add(parent, new T.BoxGeometry(w, h, d), mat, x, y, z);
    }
    function tube(parent, mat, r1, r2, height, x = 0, y = 0, z = 0) {
      return add(parent, new T.CylinderGeometry(r1, r2, height, 12), mat, x, y, z);
    }
    function ring(parent, mat, r, size, x, y, z) {
      return add(parent, new T.TorusGeometry(r, size, 6, 18), mat, x, y, z);
    }
    function profile(parent, mat, shape, segments = 20) {
      return add(parent, new T.LatheGeometry(shape.map(([x,y]) => new T.Vector2(x,y)), segments), mat);
    }
    const factories = {
      helmet(group) {
        const shell = profile(group, olive, [[.21,.05],[.24,.08],[.245,.15],[.21,.24],[.15,.29],[.07,.32],[0,.33]]);
        shell.scale.z = 1.18;
        const rim = ring(group, dark, .223, .015, 0, .075, 0);
        rim.rotation.x = Math.PI / 2; rim.scale.y = 1.18;
        for (const x of [-.212, .212]) box(group, webbing, .035, .09, .033, x, .045, 0);
        box(group, dark, .10, .055, .032, 0, .16, .24);
      },
      vest(group) {
        const shape = new T.Shape();
        shape.moveTo(-.28,.01); shape.lineTo(.28,.01); shape.lineTo(.32,.30);
        shape.lineTo(.22,.48); shape.lineTo(.10,.51); shape.lineTo(.08,.40);
        shape.lineTo(-.08,.40); shape.lineTo(-.10,.51); shape.lineTo(-.22,.48);
        shape.lineTo(-.32,.30); shape.closePath();
        add(group, new T.ExtrudeGeometry(shape,{depth:.085,bevelThickness:.02,bevelSize:.025,bevelSegments:2}), armor);
        for (const x of [-.17,0,.17]) {
          box(group, olive,.145,.16,.08,x,.13,.143);
          box(group, webbing,.145,.032,.094,x,.22,.15);
        }
        for (const x of [-.23,.23]) box(group, dark,.061,.16,.024,x,.39,.11);
      },
      medkit(group) {
        box(group, medic,.60,.28,.35,0,.16);
        for (const x of [-.255,.255]) box(group, webbing,.026,.284,.354,x,.163);
        box(group, dark,.22,.028,.046,0,.35);
        for (const x of [-.10,.10]) box(group,dark,.032,.05,.046,x,.321);
        const white = pale;
        box(group,white,.16,.05,.01,0,.17,.18);
        box(group,white,.05,.15,.01,0,.17,.181);
      },
      drink(group) {
        tube(group,drink,.105,.105,.29,0,.17);
        tube(group,steel,.095,.106,.027,0,.322);
        tube(group,steel,.105,.094,.023,0,.018);
        ring(group,dark,.034,.008,0,.339,0).rotation.x = Math.PI/2;
      },
      grenade(group) {
        profile(group,green,[[0,.02],[.077,.026],[.12,.07],[.13,.15],[.104,.24],[.055,.28],[0,.28]]);
        for (const y of [.085,.14,.195]) {
          const loop = ring(group,dark,y === .14 ? .13 : .114,.009,0,y,0);
          loop.rotation.x=Math.PI/2;
        }
        box(group,steel,.074,.065,.067,0,.283);
        box(group,steel,.033,.14,.05,.082,.25).rotation.z=-.18;
        ring(group,steel,.042,.009,-.062,.30,.02);
      },
      quiet(group) {
        const shape = new T.Shape();
        shape.moveTo(-.24,0); shape.lineTo(.24,0); shape.lineTo(.24,.27);
        shape.lineTo(.19,.32); shape.lineTo(-.24,.32); shape.closePath();
        add(group,new T.ExtrudeGeometry(shape,{depth:.044,bevelThickness:.012,bevelSize:.012,bevelSegments:2}),badge);
        box(group,steel,.44,.042,.007,0,.065,.049);
        for (const x of [-.145,-.107,-.05,.018,.06,.13,.172]) box(group,pale,.012,.052,.006,x,.012,.05);
      },
      magazine(group) {
        box(group,steel,.075,.17,.055,0,0).rotation.x = -.1;
        box(group,dark,.083,.023,.064,0,-.085);
      },
      rifle(group) {
        box(group,dark,.48,.11,.085,0,.12);
        box(group,steel,.35,.055,.051,.38,.136);
        box(group,olive,.26,.11,.083,-.37,.12);
        box(group,dark,.053,.11,.076,-.505,.12);
        box(group,steel,.09,.16,.046,.04,.04).rotation.z=.18;
        box(group,dark,.075,.112,.05,-.12,.06).rotation.z=-.25;
        box(group,dark,.35,.025,.07,.015,.185);
        for (let i=0;i<7;i++) box(group,steel,.021,.017,.076,-.14+i*.047,.199);
      }
    };
    const prototypes = new Map();
    function item(kind) {
      if (!prototypes.has(kind)) {
        const root = new T.Group();
        factories[kind](root);
        prototypes.set(kind,root);
      }
      return prototypes.get(kind).clone(true);
    }
    function airplane() {
      const group = new T.Group();
      const fuselage = profile(group,pale,[[0,-12],[1.7,-10],[2.45,-6],[2.5,6],[1.65,11],[.3,14],[0,14.2]],32);
      fuselage.rotation.x=Math.PI/2;
      box(group,steel,29,.48,3.4,0,0,-1.2);
      for (const sign of [-1,1]) {
        box(group,steel,7,.25,2,sign*3.5,1,-9);
        for (const x of [sign*5.5,sign*10]) {
          tube(group,pale,.86,1.0,4.5,x,-.25,-.42).rotation.x=Math.PI/2;
          const prop = new T.Group();
          prop.position.set(x, -.25, 2.05);
          for(let blade=0;blade<3;blade++) {
            const wing = box(prop,dark,3.15,.18,.12);
            wing.rotation.z=blade*Math.PI/3;
          }
          group.add(prop);
          (group.userData.props ||= []).push(prop);
        }
        for (let z=-5;z<=7;z+=2) box(group,dark,.075,.39,.59,sign*2.43,.7,z);
      }
      box(group,pale,.32,3.8,3.5,0,2.55,-9);
      box(group,dark,2.15,.62,.26,0,.82,12);
      box(group,steel,2.55,1.35,.12,0,-.44,-11.4).rotation.x=.25;
      return group;
    }
    function parachute() {
      const root = new T.Group();
      root.name = 'frontier-parachute';
      const lines = [];
      for (let index=0;index<8;index++) {
        const theta=index*Math.PI/4;
        const panel=add(root,new T.SphereGeometry(3.4,5,7,theta,Math.PI/4,0,Math.PI*.44),chute[index],0,3.4);
        panel.scale.y=.64;
        lines.push(new T.Vector3(Math.sin(theta)*3.3,3.75,Math.cos(theta)*3.3),
          new T.Vector3(Math.sin(theta)*.35,.65,Math.cos(theta)*.35));
      }
      root.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(lines),new T.LineBasicMaterial({color:0xdcd0b0})));
      return root;
    }
    function wearable(slot, machine) {
      const group = new T.Group();
      if (machine) {
        if (slot === 'helmet') {
          box(group, armor, .32, .07, .29, 0, .09);
          for (const x of [-.15, .15]) box(group, dark, .047, .12, .23, x, .033);
          box(group, steel, .19, .029, .032, 0, .074, -.15);
        } else {
          box(group, armor, .37, .07, .59, 0, .08);
          for (const x of [-.20, .20]) {
            box(group, armor, .055, .13, .51, x, .008);
            for (const z of [-.19, .19]) box(group, steel, .012, .046, .052, x * 1.17, .026, z);
          }
        }
      } else if (slot === 'helmet') {
        profile(group, olive, [[.162,0],[.177,.025],[.174,.082],[.146,.142],[.092,.173],[0,.19]], 24);
        const rim = ring(group, dark, .162, .010, 0, .006, 0);
        rim.rotation.x = Math.PI / 2;
        for (const x of [-.158, .158]) box(group, webbing, .021, .057, .055, x, -.018, .024);
        box(group, dark, .061, .032, .019, 0, .039, -.166);
      } else {
        const contour = new T.Shape();
        contour.moveTo(-.262, .025);
        contour.lineTo(.262, .025); contour.lineTo(.277, .24);
        contour.lineTo(.197, .39); contour.lineTo(.10, .42);
        contour.lineTo(.067, .33); contour.lineTo(-.067, .33);
        contour.lineTo(-.10, .42); contour.lineTo(-.197, .39);
        contour.lineTo(-.277, .24); contour.closePath();
        const plate = new T.ExtrudeGeometry(contour, { depth: .027, bevelThickness: .012, bevelSize: .013, bevelSegments: 2 });
        add(group, plate, armor, 0, 0, -.187);
        add(group, plate, olive, 0, 0, .139);
        for (const x of [-.139, .139]) {
          box(group, webbing, .091, .045, .31, x, .402, -.014);
          box(group, dark, .044, .063, .026, x, .326, -.189);
        }
        for (const x of [-.14, 0, .14]) {
          box(group, olive, .126, .125, .052, x, .109, -.203);
          box(group, webbing, .127, .029, .055, x, .177, -.21);
        }
        for (const x of [-.246, .246]) box(group, webbing, .037, .13, .33, x, .171, -.015);
      }
      group.name = 'frontier-worn-' + slot;
      group.traverse(mesh => { if (mesh.isMesh) mesh.castShadow = true; });
      return group;
    }

    return { item, airplane, parachute, wearable };
  };
})();
