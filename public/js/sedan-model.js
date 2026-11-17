(() => {
  'use strict';
  window.SaltSedanModel = function (T) {
    const { clamp, lerp } = T.MathUtils;
    const mat=(c,r=.5,m=0)=>new T.MeshStandardMaterial({color:c,roughness:r,metalness:m});
    const paint=new T.MeshPhysicalMaterial({color:0x446b7d,metalness:.43,roughness:.24,clearcoat:1,clearcoatRoughness:.12,side:T.DoubleSide});
    const darkPaint=paint.clone();darkPaint.color.setHex(0x263e48);
    const black=mat(0x101418,.63),trim=mat(0x161b20,.3,.55),rubber=mat(0x151617,.88),chrome=mat(0xd2d8dc,.2,.95),alloy=mat(0x8d969e,.26,1),brake=mat(0x62676b,.65,.75),leather=mat(0x312f2c,.86),seatMat=mat(0x796251,.82);
    const glass=new T.MeshPhysicalMaterial({color:0x67818b,metalness:.3,roughness:.09,transparent:true,opacity:.48,depthWrite:false,side:T.DoubleSide});
    const head=mat(0xd6edff,.18,.2);head.emissive=new T.Color(0xc4e5ff);head.emissiveIntensity=2;
    const tail=mat(0xa20c16,.2,.3);tail.emissive=new T.Color(0xff1122);tail.emissiveIntensity=.8;
    const rig=new T.Group(),car=new T.Group();rig.add(car);car.name='SedanBody';
    function mesh(geometry, material, parent = car) {
      const part = new T.Mesh(geometry, material);
      part.castShadow = true;
      part.receiveShadow = true;
      parent.add(part);
      return part;
    }

    function rounded(width, height, depth, radius, material, x = 0, y = 0, z = 0, parent = car) {
      const outline = new T.Shape();
      const l = -width / 2, r = width / 2, b = -height / 2, t = height / 2;
      const corner = Math.min(radius, r - .001, t - .001);
      outline.moveTo(l + corner, b);
      outline.lineTo(r - corner, b);
      outline.quadraticCurveTo(r, b, r, b + corner);
      outline.lineTo(r, t - corner);
      outline.quadraticCurveTo(r, t, r - corner, t);
      outline.lineTo(l + corner, t);
      outline.quadraticCurveTo(l, t, l, t - corner);
      outline.lineTo(l, b + corner);
      outline.quadraticCurveTo(l, b, l + corner, b);
      const geometry = new T.ExtrudeGeometry(outline, {
        depth: Math.max(.002, depth - 2 * corner), steps: 1, bevelEnabled: true,
        bevelThickness: Math.min(corner, depth / 3), bevelSize: Math.min(corner, .018),
        bevelSegments: 3, curveSegments: 6
      });
      geometry.center();
      const part = mesh(geometry, material, parent);
      part.position.set(x, y, z);
      return part;
    }

    function surf(rows, columns, sample, material) {
      const positions = [], indices = [];
      for (let row = 0; row <= rows; row++) {
        for (let col = 0; col <= columns; col++) positions.push(...sample(row / rows, col / columns));
      }
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
          const a = row * (columns + 1) + col, b = a + columns + 1;
          indices.push(a, b, a + 1, a + 1, b, b + 1);
        }
      }
      const geometry = new T.BufferGeometry();
      geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      return mesh(geometry, material);
    }

    function tube(points, radius, material) {
      const curve = new T.CatmullRomCurve3(points.map(point => new T.Vector3(...point)), false, 'centripetal');
      return mesh(new T.TubeGeometry(curve, Math.max(18, points.length * 9), radius, 6, false), material);
    }

    const stations = [
      [-2.39, .70, .77], [-2.26, .84, .86], [-1.96, .912, .93], [-1.43, .94, .965],
      [-.7, .935, .955], [.3, .925, .947], [1.12, .94, .952], [1.57, .944, .913],
      [2.08, .865, .806], [2.39, .71, .735]
    ];
    function profile(z, column) {
      let i = 0;
      while (i < stations.length - 2 && z > stations[i + 1][0]) i++;
      const from = stations[i], to = stations[i + 1];
      const previous = stations[Math.max(0, i - 1)], next = stations[Math.min(stations.length - 1, i + 2)];
      const span = to[0] - from[0];
      const t = clamp((z - from[0]) / span, 0, 1);
      const startSlope = (to[column] - previous[column]) / (to[0] - previous[0]);
      const endSlope = (next[column] - from[column]) / (next[0] - from[0]);
      return (2 * t ** 3 - 3 * t ** 2 + 1) * from[column] + (t ** 3 - 2 * t ** 2 + t) * span * startSlope +
        (-2 * t ** 3 + 3 * t ** 2) * to[column] + (t ** 3 - t ** 2) * span * endSlope;
    }

    const axles = [-1.42, 1.43], radius = .345;
    function bottom(z) {
      let y = .235;
      for (const axle of axles) {
        const d = Math.abs(z - axle);
        if (d < .427) y = Math.max(y, radius + Math.sqrt(.427 ** 2 - d ** 2));
        else if (d < .457) y = Math.max(y, lerp(radius, .235, (d - .427) / .03));
      }
      return y;
    }

    function sideX(z, y) {
      const lower = bottom(z);
      const t = clamp((y - lower) / (profile(z, 2) - lower), 0, 1);
      return profile(z, 1) - .044 * (1 - t) ** 2 - .055 * t ** 5 + .013 * Math.sin(t * Math.PI);
    }
    // Wheel openings are cut into the body mesh itself, not drawn over a solid block.
    for(const side of [-1,1]){
    surf(300,18,(u,v)=>{const z=lerp(-2.39,2.39,u),y=lerp(bottom(z),profile(z,2),v);return [side*sideX(z,y),y,z];},paint);
    for(const a of axles){const pts=[];for(let j=0;j<=48;j++){const t=j/48*Math.PI,z=a+Math.cos(t)*.429,y=.345+Math.sin(t)*.429;pts.push([side*(sideX(z,y)+.004),y,z]);}tube(pts,.014,paint);surf(48,4,(u,v)=>{const t=u*Math.PI,z=a+Math.cos(t)*.422,y=.345+Math.sin(t)*.422;return [side*lerp(.925,.70,v),y,z];},black);}
    // Narrow shoulder strips leave the cabin genuinely hollow.
    surf(140,12,(u,v)=>{const z=lerp(-2.39,2.39,u),w=profile(z,1),t=profile(z,2);return [side*lerp(w-.055,w-.18,v),t+.012*Math.sin(v*Math.PI),z];},paint);
    tube([[side*.89,.252,-.96],[side*.90,.247,0],[side*.9,.253,.97]],.033,darkPaint);
    }
    function deck(z0,z1){surf(60,36,(v,u)=>{const z=lerp(z0,z1,v),x=(u*2-1)*(profile(z,1)-.16);return [x,profile(z,2)+.025*(1-Math.pow(u*2-1,2)),z];},paint);}
    deck(1.13,2.39);deck(-2.39,-1.48);
    // Sculpted, closed front and rear faces.
    for(const end of [-1,1])surf(18,48,(v,u)=>{const x=(u*2-1)*.71,y=lerp(.245,end>0?.738:.772,v);return [x,y,end*(2.39+.025*Math.sin(v*Math.PI)-.05*Math.pow(Math.abs(u*2-1),4))];},paint);
    rounded(1.38,.13,.13,.04,darkPaint,0,.285,2.35);rounded(1.40,.14,.14,.04,darkPaint,0,.285,-2.35);
    // Thin swept lamp lenses and recessed intakes follow the fascia.
    for(const s of [-1,1]){
    const lamp=rounded(.48,.09,.10,.025,trim,s*.535,.735,2.33);lamp.rotation.y=s*-.17;
    for(let i=0;i<3;i++)rounded(.10,.046,.018,.012,head,s*(.395+i*.12),.74,2.389-i*.014);
    tube([[s*.31,.793,2.381],[s*.57,.787,2.367],[s*.79,.757,2.29]],.012,head);
    rounded(.20,.15,.035,.04,black,s*.585,.431,2.399);
    const ta=rounded(.50,.087,.07,.024,tail,s*.52,.784,-2.361);ta.rotation.y=s*.10;
    rounded(.19,.048,.05,.015,chrome,s*.59,.279,-2.414);
    const pipe=mesh(new T.CylinderGeometry(.025,.025,.064,20),black);pipe.rotation.x=Math.PI/2;pipe.position.set(s*.59,.279,-2.443);
    }
    rounded(.86,.095,.05,.024,black,0,.635,2.419);rounded(.86,.19,.04,.03,black,0,.426,2.421);
    for(let i=0;i<5;i++)rounded(.82,.008,.008,.003,alloy,0,.358+i*.031,2.446);
    rounded(.46,.012,.025,.006,tail,0,.797,-2.396);
    function plate(z){const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#e1e4df';ctx.fillRect(0,0,512,128);ctx.fillStyle='#263238';ctx.font='bold 62px sans-serif';ctx.textAlign='center';ctx.fillText('TOURING',256,86);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;const o=mesh(new T.PlaneGeometry(.38,.095),new T.MeshStandardMaterial({map:tex,roughness:.5}));o.position.set(0,z>0?.542:.50,z);if(z<0)o.rotation.y=Math.PI;}
    plate(2.451);plate(-2.418);
    // Smooth roof and exactly matching glass edges, A/B/C pillars.
    function roof(t,u){let z=lerp(-.91,.48,t),w=.695+.025*Math.sin(t*Math.PI),y=1.437+.034*Math.sin(t*Math.PI);return [u*w,y-.028*u*u,z];}
    surf(45,36,(v,u)=>roof(v,u*2-1),paint);
    const lining=mat(0xa59b8e,.9);lining.side=T.DoubleSide;
    surf(35,24,(v,u)=>{let p=roof(v,(u*2-1)*.975);p[1]-=.032;return p;},lining);
    for(const [end,zbase,wbase,ybase] of [[1,1.15,.76,.976],[0,-1.49,.765,.974]]){
    surf(20,32,(v,u)=>{const top=roof(end,u*2-1),bot=[(u*2-1)*wbase,ybase+.017*(1-(u*2-1)**2),zbase];return [lerp(bot[0],top[0],v),lerp(bot[1],top[1]-.013,v)+.017*Math.sin(v*Math.PI),lerp(bot[2],top[2],v)];},glass);
    for(const s of [-1,1])tube([[s*wbase,ybase,zbase],roof(end,s)],end===1?.032:.052,paint);
    tube([[-wbase,ybase,zbase],[0,ybase+.017,zbase],[wbase,ybase,zbase]],.013,trim);
    }
    for(const s of [-1,1]){
    const rb=[s*.78,.975,-1.48],fb=[s*.78,.975,1.15],rt=roof(0,s),ft=roof(1,s),bt=roof(.49,s),bb=[s*.798,.966,-.23];
    // Side windows are open so occupants can lean out.
    tube([fb,ft,roof(.75,s),roof(.5,s),roof(.25,s),rt,rb],.018,chrome);
    tube([fb,bb,rb],.018,trim);tube([bb,bt],.028,trim);
    // Door gaps are projected onto the actual curved side skin.
    for(const zz of [[1.02,.01],[-.03,-1.12]]){const p=[[zz[0],.932],[zz[0]-.02,.80],[Math.min(zz[0],.87),.35],[zz[1]+.03,.31],[zz[1],.57],[zz[1],.934]];tube(p.map(([z,y])=>[s*(sideX(z,y)+.006),y,z]),.0035,black);}
    for(const z of [.23,-.81]){const y=.886;const h=rounded(.15,.025,.021,.009,chrome,0,0,0);h.rotation.y=Math.PI/2;h.position.set(s*(sideX(z,y)+.011),y,z);}
    // Rounded mirrors with a rear-facing reflective glass insert.
    tube([[s*.80,1.012,.92],[s*.965,1.042,.85]],.022,trim);
    const mirror=mesh(new T.SphereGeometry(1,24,16),paint);mirror.scale.set(.133,.066,.10);mirror.position.set(s*1.035,1.07,.85);
    const mg=mesh(new T.CircleGeometry(1,32),chrome);mg.scale.set(.106,.047,1);mg.rotation.y=Math.PI;mg.position.set(s*1.035,1.07,.766);
    // Hood character crease.
    tube([[s*.49,.975,1.17],[s*.47,.918,1.60],[s*.40,.802,2.16]],.0035,darkPaint);
    }
    // True-depth tires, alloy spokes, visible discs and fixed calipers.
    const wheels=[];
    function wheel(s,z){const root=new T.Group();root.position.set(s*.875,radius,z);rig.add(root);const spin=new T.Group();root.add(spin);const tireGeo=new T.LatheGeometry([new T.Vector2(.224,-.116),new T.Vector2(.295,-.116),new T.Vector2(.334,-.095),new T.Vector2(.345,-.064),new T.Vector2(.345,.064),new T.Vector2(.334,.095),new T.Vector2(.295,.116),new T.Vector2(.224,.116)],64);tireGeo.rotateZ(Math.PI/2);mesh(tireGeo,rubber,spin);
    for(const x of [-.113,.113]){const o=mesh(new T.TorusGeometry(.267,.0024,5,64),trim,spin);o.rotation.y=Math.PI/2;o.position.x=x;}
    for(const x of [-.055,0,.055]){const o=mesh(new T.TorusGeometry(.344,.002,4,64),black,spin);o.rotation.y=Math.PI/2;o.position.x=x;}
    const outward=s*.119;
    const ring=mesh(new T.TorusGeometry(.224,.015,10,64),alloy,spin);ring.rotation.y=Math.PI/2;ring.position.x=outward;
    const disc=mesh(new T.CylinderGeometry(.181,.181,.012,48),brake,spin);disc.rotation.z=Math.PI/2;disc.position.x=s*.066;
    for(let n=0;n<5;n++)for(const offset of [-.085,.085]){const a=n*Math.PI*2/5+offset;const spoke=rounded(.035,.177,.024,.009,chrome,0,0,0,spin);spoke.rotation.y=Math.PI/2;spoke.rotation.x=a;spoke.position.set(outward,Math.cos(a)*.126,Math.sin(a)*.126);}
    for(let n=0;n<5;n++){const a=n*2*Math.PI/5;const bolt=mesh(new T.SphereGeometry(.009,8,6),chrome,spin);bolt.position.set(s*.14,Math.cos(a)*.045,Math.sin(a)*.045);}
    const hub=mesh(new T.CylinderGeometry(.063,.063,.038,24),alloy,spin);hub.rotation.z=Math.PI/2;hub.position.x=outward;
    rounded(.045,.107,.073,.02,mat(0xae3022,.46,.4),s*.081,.015,-.144,root);
    wheels.push({root,spin,front:z>0,side:s});}
    for(const s of [-1,1])for(const z of axles)wheel(s,z);
    // Interior, clear footwell and a usable driver's camera.
    rounded(1.40,.10,2.52,.04,black,0,.235,-.12);
    function seat(x,z){const g=new T.Group();g.position.set(x,.42,z);car.add(g);rounded(.46,.14,.49,.07,seatMat,0,0,0,g);let b=rounded(.455,.52,.12,.055,seatMat,0,.30,-.185,g);b.rotation.x=-.14;rounded(.265,.17,.105,.04,leather,0,.61,-.22,g);for(const s of [-1,1])rounded(.065,.45,.17,.029,leather,s*.205,.28,-.156,g);}
    seat(-.365,.12);seat(.365,.12);seat(-.36,-.88);seat(.36,-.88);
    rounded(1.43,.175,.32,.055,leather,0,.858,.918);rounded(.25,.19,.95,.03,leather,0,.51,.02);
    const display=mat(0x152b38,.2,.15);display.emissive=new T.Color(0x276880);display.emissiveIntensity=.55;rounded(.30,.13,.026,.014,display,0,1.001,.855);
    const steer=new T.Group();steer.position.set(-.365,.94,.61);steer.rotation.x=-.28;car.add(steer);const steeringSpin=new T.Group();steer.add(steeringSpin);mesh(new T.TorusGeometry(.15,.018,12,40),black,steeringSpin);rounded(.095,.07,.035,.022,leather,0,0,0,steeringSpin);for(const a of [-Math.PI/2,Math.PI/2,Math.PI]){const p=rounded(.024,.1,.025,.006,alloy,Math.sin(a)*.09,Math.cos(a)*.09,0,steeringSpin);p.rotation.z=-a;}
    rig.name = 'Touring_Driveable_Car';
    return { root: rig, wheels, steeringSpin, radius };
  };
})();
