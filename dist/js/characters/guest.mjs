import * as THREE from '../../vendor/three.module.min.js';
// Fully modeled toy guest, with articulated coffee gesture.
export function createGuest(chair) {
  const g = new THREE.Group();
  chair.add(g);
  g.position.z = 0.03;
  const cloth = new THREE.MeshStandardMaterial({ color: '#626a3e', roughness: 0.65 }),
    seam = new THREE.MeshStandardMaterial({ color: '#485136', roughness: 0.9 }),
    skin = new THREE.MeshStandardMaterial({ color: '#d9ae95', roughness: 0.55 }),
    white = new THREE.MeshStandardMaterial({ color: '#eee8d9', roughness: 0.7 }),
    boot = new THREE.MeshStandardMaterial({ color: '#293234', roughness: 0.7 }),
    hair = new THREE.MeshStandardMaterial({ color: '#514739', roughness: 1 });
  function ell(p, mat, x, y, z, sx, sy, sz) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), mat);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    m.castShadow = true;
    m.receiveShadow = true;
    p.add(m);
    return m;
  }
  function box(p, mat, x, y, z, w, h, d) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    p.add(m);
    return m;
  }
  const torso = new THREE.Group();
  g.add(torso);
  ell(torso, cloth, 0, 1.22, -0.07, 0.355, 0.43, 0.225);
  ell(torso, cloth, 0, 0.86, 0.12, 0.35, 0.16, 0.26);
  ell(torso, white, 0, 1.52, 0.115, 0.19, 0.18, 0.05);
  for (const s of [-1, 1]) {
    const collar = box(torso, cloth, s * 0.12, 1.5, 0.14, 0.12, 0.16, 0.025);
    collar.rotation.z = s * 0.35;
    box(torso, seam, s * 0.19, 1.24, 0.155, 0.15, 0.16, 0.025);
    box(torso, cloth, s * 0.19, 1.3, 0.178, 0.17, 0.045, 0.025);
    ell(g, cloth, s * 0.205, 0.86, 0.37, 0.155, 0.145, 0.37);
    ell(g, cloth, s * 0.225, 0.5, 0.68, 0.125, 0.34, 0.13);
    ell(g, boot, s * 0.225, 0.19, 0.78, 0.15, 0.11, 0.235);
  }
  for (let i = 0; i < 4; i++) ell(torso, seam, 0, 1.03 + i * 0.12, 0.199, 0.018, 0.018, 0.012);
  const head = new THREE.Group();
  head.position.set(0, 2.0, 0.025);
  head.rotation.y = -0.12;
  torso.add(head);
  ell(head, skin, 0, -0.36, 0, 0.12, 0.14, 0.12);
  // A single rounded vinyl sculpt keeps the cheeks, forehead and jaw continuous.
  const width = 0.87,
    height = 0.79,
    depth = 0.65,
    radius = 0.205,
    geo = new THREE.BoxGeometry(width, height, depth, 40, 40, 32),
    pos = geo.attributes.position,
    normal = geo.attributes.normal,
    paint = new Float32Array(pos.count * 3);
  const skinColor = new THREE.Color('#e2b49a'),
    beardColor = new THREE.Color('#716054'),
    hairColor = new THREE.Color('#514438');
  const core = new THREE.Vector3(width / 2 - radius, height / 2 - radius, depth / 2 - radius);
  for (let i = 0; i < pos.count; i++) {
    const p = new THREE.Vector3().fromBufferAttribute(pos, i),
      q = p.clone().clamp(core.clone().negate(), core),
      n = p.clone().sub(q).normalize();
    p.copy(q).addScaledVector(n, radius);
    pos.setXYZ(i, p.x, p.y, p.z);
    normal.setXYZ(i, n.x, n.y, n.z);
    let color = skinColor.clone();
    const front = p.z > 0.08;
    if (p.y < -0.245 || (Math.abs(p.x) > 0.3 && p.y < -0.04) || (!front && p.y < -0.12))
      color.lerp(beardColor, 0.94);
    if (front && p.y < -0.195 && Math.abs(p.x) > 0.11) color.lerp(beardColor, 0.75);
    const hairline = front ? 0.265 + 0.035 * Math.cos(p.x * 7) : 0.07;
    if (p.y > hairline) color.copy(hairColor);
    else if (Math.abs(p.x) > 0.35 && p.y > 0.09) color.lerp(hairColor, 0.42);
    paint[i * 3] = color.r;
    paint[i * 3 + 1] = color.g;
    paint[i * 3 + 2] = color.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(paint, 3));
  const skull = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.48 }));
  skull.material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSculpt;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSculpt=position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSculpt;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
 float beardEdge=-0.235+0.23*pow(abs(vSculpt.x)/0.435,3.0);
 float beardMask=1.0-smoothstep(beardEdge-0.006,beardEdge+0.006,vSculpt.y);
 float frontMask=smoothstep(0.0,0.18,vSculpt.z);
 float hairEdge=mix(0.075,0.267+0.025*cos(vSculpt.x*7.0),frontMask);
 float hairMask=smoothstep(hairEdge-0.005,hairEdge+0.005,vSculpt.y);
 vec3 base=mix(vec3(0.761,0.456,0.323),vec3(0.19,0.14,0.11),beardMask*0.78);
 float fade=smoothstep(0.33,0.435,abs(vSculpt.x))*smoothstep(0.06,0.20,vSculpt.y)*0.25;
 base=mix(base,vec3(0.082,0.058,0.041),max(hairMask,fade));
 diffuseColor.rgb*=base;`,
      );
  };
  skull.castShadow = true;
  head.add(skull);
  const eyes = new THREE.MeshStandardMaterial({ color: '#14252b', roughness: 0.18 }),
    browMat = new THREE.MeshStandardMaterial({ color: '#4d4036', roughness: 0.75 });
  for (const side of [-1, 1]) {
    ell(head, skin, side * 0.435, -0.055, -0.015, 0.049, 0.085, 0.055);
    ell(head, eyes, side * 0.185, -0.065, 0.318, 0.076, 0.087, 0.035);
    const brow = ell(head, browMat, side * 0.181, 0.084, 0.316, 0.098, 0.019, 0.014);
    brow.rotation.z = side * 0.04;
    const stache = ell(head, browMat, side * 0.049, -0.225, 0.326, 0.052, 0.017, 0.012);
    stache.rotation.z = side * 0.08;
  }
  ell(head, skin, 0, -0.153, 0.332, 0.044, 0.043, 0.045);
  const mouth = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.082, -0.23, 0.334),
        new THREE.Vector3(0, -0.259, 0.34),
        new THREE.Vector3(0.082, -0.23, 0.334),
      ]),
      12,
      0.007,
      6,
      false,
    ),
    new THREE.MeshStandardMaterial({ color: '#aa7666', roughness: 0.75 }),
  );
  head.add(mouth);
  // Low, side-swept sculpted hair follows the short cut in the reference.
  for (let i = 0; i < 4; i++) {
    const lock = ell(
      head,
      hair,
      -0.24 + i * 0.145,
      0.362 + Math.sin((i / 4) * Math.PI) * 0.026,
      0.008,
      0.16,
      0.052,
      0.265,
    );
    lock.rotation.z = -0.1;
    lock.rotation.y = -0.23;
  }
  const ready = Promise.resolve();
  const paperCanvas = document.createElement('canvas');
  paperCanvas.width = 768;
  paperCanvas.height = 512;
  const pc = paperCanvas.getContext('2d');
  pc.fillStyle = '#f1e8d3';
  pc.fillRect(0, 0, 768, 512);
  pc.fillStyle = '#253237';
  pc.textAlign = 'center';
  pc.font = 'bold 44px Georgia';
  pc.fillText('THE FORTUNE TIMES', 384, 63);
  pc.fillRect(30, 82, 708, 3);
  pc.font = '13px Georgia';
  pc.fillText('CITY EDITION     •     NEWS & CULTURE     •     TODAY', 384, 105);
  pc.font = 'bold 30px Georgia';
  pc.fillText('A CITY FULL OF POSSIBILITIES', 384, 157);
  for (let col = 0; col < 4; col++)
    for (let row = 0; row < 22; row++) {
      pc.fillStyle = row % 4 ? '#768077' : '#3f4c46';
      pc.fillRect(35 + col * 184, 184 + row * 12, 140 + (row % 3) * 8, 3);
    }
  const paperTex = new THREE.CanvasTexture(paperCanvas);
  paperTex.colorSpace = THREE.SRGBColorSpace;
  const paperMat = new THREE.MeshStandardMaterial({
    map: paperTex,
    side: THREE.DoubleSide,
    roughness: 1,
  });
  const paper = new THREE.Group();
  paper.position.set(0, 1.2, 0.58);
  paper.rotation.y = Math.PI;
  paper.rotation.x = 0.65;
  g.add(paper);
  const leftPage = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.58, 12, 1), paperMat),
    rightPage = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.58, 12, 1), paperMat);
  for (const [page, offset] of [
    [leftPage, 0],
    [rightPage, 0.5],
  ]) {
    const uv = page.geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * 0.5 + offset);
  }
  leftPage.position.x = -0.22;
  rightPage.position.x = 0.22;
  leftPage.rotation.y = -0.12;
  rightPage.rotation.y = 0.12;
  paper.add(leftPage, rightPage);
  // A separate sheet turns around the spine; the open newspaper stays supported.
  const turningPage = new THREE.Mesh(rightPage.geometry.clone(), paperMat);
  turningPage.geometry.translate(0.22, 0, 0);
  turningPage.position.z = 0.018;
  paper.add(turningPage);
  const pageBase = turningPage.geometry.attributes.position.array.slice();
  paperMat.side = THREE.FrontSide;
  const backTex = paperTex.clone();
  backTex.repeat.x = -1;
  backTex.offset.x = 1;
  backTex.needsUpdate = true;
  const backMat = new THREE.MeshStandardMaterial({
    map: backTex,
    side: THREE.BackSide,
    roughness: 1,
  });
  for (const page of [leftPage, rightPage, turningPage])
    page.add(new THREE.Mesh(page.geometry, backMat));

  const elbowsRound = [
    ell(g, cloth, 0, 0, 0, 0.09, 0.09, 0.09),
    ell(g, cloth, 0, 0, 0, 0.09, 0.09, 0.09),
  ];
  ell(g, cloth, -0.31, 1.45, -0.02, 0.105, 0.13, 0.105);
  ell(g, cloth, 0.31, 1.45, -0.02, 0.105, 0.13, 0.105);
  const limbs = [];
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.075, 1, 16), cloth);
    g.add(m);
    m.castShadow = true;
    limbs.push(m);
  }
  const hands = [
    ell(g, skin, 0, 0, 0, 0.095, 0.065, 0.11),
    ell(g, skin, 0, 0, 0, 0.095, 0.065, 0.11),
  ];
  const axis = new THREE.Vector3(0, 1, 0);
  function between(m, a, b) {
    m.position.copy(a).add(b).multiplyScalar(0.5);
    const d = b.clone().sub(a);
    m.scale.y = d.length();
    m.quaternion.setFromUnitVectors(axis, d.normalize());
  }
  function update(t, reduced = false) {
    const sec = t / 1000,
      breath = reduced ? 0 : Math.sin(sec * 1.5) * 0.006;
    torso.position.y = breath;
    head.rotation.x = 0.12 + (reduced ? 0 : Math.sin(sec * 0.5) * 0.018);
    head.rotation.y = -0.08 + (reduced ? 0 : Math.sin(sec * 0.3) * 0.055);
    head.rotation.z = 0;
    paper.position.y = 1.2 + breath;
    paper.rotation.y = Math.PI;
    paper.rotation.x = 0.65 + (reduced ? 0 : Math.sin(sec * 0.7) * 0.012);
    rightPage.rotation.y = 0.12;
    const phase = sec % 12,
      progress = Math.max(0, Math.min(1, (phase - 7) / 2.4)),
      turn = progress * progress * (3 - 2 * progress),
      active = !reduced && phase >= 7 && phase < 9.4;
    turningPage.visible = active;
    turningPage.rotation.y = -Math.PI * turn;
    const verts = turningPage.geometry.attributes.position;
    for (let i = 0; i < verts.count; i++) {
      const x = pageBase[i * 3];
      verts.setZ(
        i,
        pageBase[i * 3 + 2] + Math.sin((x / 0.44) * Math.PI) * Math.sin(turn * Math.PI) * 0.1,
      );
    }
    verts.needsUpdate = true;
    paper.rotation.z = active ? Math.sin(turn * Math.PI) * 0.035 : 0;

    paper.updateWorldMatrix(true, false);
    function paperPoint(x, y, z) {
      return g.worldToLocal(paper.localToWorld(new THREE.Vector3(x, y, z)));
    }
    const right = paperPoint(-0.55, -0.08, 0.16),
      left = paperPoint(0.6, -0.08, 0.16);
    // Flick the page, release early and return on the same side. The sheet finishes by itself.
    if (active) {
      const grip = Math.min(turn, 0.13),
        angle = grip * Math.PI;
      let x = 0.6 * Math.cos(angle),
        z = 0.16 + 0.6 * Math.sin(angle);
      if (turn > 0.13) {
        const u = Math.min(1, (turn - 0.13) / 0.35),
          e = u * u * (3 - 2 * u);
        x += (0.6 - x) * e;
        z += (0.16 - z) * e;
      }
      left.copy(paperPoint(x, -0.08, z));
    }
    const shoulders = [new THREE.Vector3(-0.31, 1.45, -0.02), new THREE.Vector3(0.31, 1.45, -0.02)];
    const elbows = [new THREE.Vector3(-0.48, 1.07, 0.18), new THREE.Vector3(0.49, 1.07, 0.3)];
    [left, right].forEach((hand, i) => {
      between(limbs[i * 2], shoulders[i], elbows[i]);
      between(limbs[i * 2 + 1], elbows[i], hand);
      hands[i].position.copy(hand);
      elbowsRound[i].position.copy(elbows[i]);
    });
  }
  update(0, true);
  return { update, ready };
}
