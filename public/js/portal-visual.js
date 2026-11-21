(() => {
  'use strict';

  function signTexture(THREE, text) {
    const sign = document.createElement('canvas');
    sign.width = 512;
    sign.height = 96;
    const ctx = sign.getContext('2d');
    ctx.textAlign = 'center';
    ctx.font = 'bold 52px sans-serif';
    ctx.fillStyle = '#b9f4ff';
    ctx.shadowColor = '#18bcff';
    ctx.shadowBlur = 14;
    ctx.fillText(text, 256, 68, 485);
    return new THREE.CanvasTexture(sign);
  }

  function create(THREE,title,color=0x56e5ff,ellipse=.68,upright=false) {
    const gate=new THREE.Group();
    const tint=new THREE.Color(color);
    const ringMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(2.25) });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.25, .095, 12, 80), ringMaterial);
    ring.rotation.x = upright ? 0 : -Math.PI / 2;
    ring.scale.y = ellipse;
    gate.add(ring);
    const vortex = new THREE.Mesh(new THREE.CircleGeometry(1.23, 80), new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      uniforms: { time: { value: 0 }, tint: { value: new THREE.Vector3(tint.r, tint.g, tint.b).multiplyScalar(1.65) } },
      vertexShader: `
        varying vec2 portalUV;
        void main() {
          portalUV = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 tint;
        varying vec2 portalUV;
        void main() {
          vec2 p = portalUV * 2.0 - 1.0;
          float r = length(p);
          float angle = atan(p.y, p.x);
          float wave = sin(angle * 5.0 + r * 25.0 + time * 4.0);
          float spiral = pow(wave * .5 + .5, 4.0);
          float edge = smoothstep(.65, .96, r);
          vec3 color = mix(vec3(.025,.012,.12) + tint * .03, tint, spiral * .85 + edge * .15);
          gl_FragColor = vec4(color, (1.0-smoothstep(.96,1.0,r))*.97);
        }
      `
    }));
    vortex.rotation.x = upright ? 0 : -Math.PI / 2;
    vortex.scale.y = ellipse;
    vortex.position.y = upright ? 0 : .012;
    gate.add(vortex);

    const label = new THREE.Sprite(new THREE.SpriteMaterial({
      map: signTexture(THREE,title), color:tint.clone().lerp(new THREE.Color(0xffffff), .55), depthWrite: false
    }));
    label.position.y = upright ? 1.28 : .72;
    label.scale.set(3.6, .675, 1);
    gate.add(label);
    return gate;
  }
  window.SaltPortalVisual={create,signTexture};
})();
