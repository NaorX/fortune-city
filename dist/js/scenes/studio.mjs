import * as T from '../../vendor/three.module.min.js';
export function buildStudio(parent) {
  const brass = new T.MeshStandardMaterial({ color: '#b58a45', metalness: 0.72, roughness: 0.3 }),
    edge = new T.MeshStandardMaterial({ color: '#ebc987', metalness: 0.58, roughness: 0.27 }),
    stone = new T.MeshStandardMaterial({ color: '#c4ae8e', roughness: 0.42 }),
    dark = new T.MeshStandardMaterial({ color: '#584835', roughness: 0.5 }),
    light = new T.MeshStandardMaterial({
      color: '#fff1c4',
      emissive: '#ffe6a3',
      emissiveIntensity: 0.65,
      roughness: 0.5,
    });
  const boxGeo = new T.BoxGeometry(1, 1, 1);
  function box(p, x, y, z, w, h, d, m) {
    const o = new T.Mesh(boxGeo, m);
    o.position.set(x, y, z);
    o.scale.set(w, h, d);
    o.castShadow = true;
    o.receiveShadow = true;
    p.add(o);
    return o;
  }
  function beam(a, b, r, m) {
    const d = b.clone().sub(a),
      o = new T.Mesh(new T.CylinderGeometry(r, r, d.length(), 12), m);
    o.position.copy(a).add(b).multiplyScalar(0.5);
    o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
    parent.add(o);
    return o;
  }
  // A faceted conservatory wraps both sides, closing the view with an architectural shell.
  const radius = 11.5,
    span = Math.PI * 1.35,
    parts = 12;
  for (let i = 0; i < parts; i++) {
    const a = -span / 2 + (i * span) / parts,
      b = a + span / parts,
      m = (a + b) / 2,
      w = 2 * radius * Math.sin((b - a) / 2),
      g = new T.Group();
    g.position.set(Math.sin(m) * radius, 0, 3 - Math.cos(m) * radius);
    g.rotation.y = -m;
    parent.add(g);
    box(g, 0, 0.52, 0, w + 0.08, 1.04, 0.3, dark);
    box(g, 0, 0.99, 0.16, w + 0.1, 0.1, 0.12, edge);
    box(g, 0, 0.18, 0.17, w + 0.1, 0.14, 0.13, brass);
    for (let j = 0; j < 7; j++) box(g, ((j - 3) * w) / 7, 0.53, 0.17, 0.1, 0.67, 0.1, brass);
    box(g, 0, 8.15, 0, w + 0.09, 0.45, 0.38, brass);
    box(g, 0, 7.9, 0.17, w + 0.1, 0.07, 0.07, light);
    box(g, 0, 8.41, 0.06, w + 0.1, 0.09, 0.38, edge);
    for (let j = 0; j < 12; j++) box(g, ((j - 5.5) * w) / 12, 8.15, 0.22, 0.1, 0.16, 0.045, light);
    for (const y of [1.2, 3.1, 6.9]) box(g, 0, y, 0, w, 0.045, 0.055, brass);
    for (const x of [-w / 2, w / 2]) {
      box(g, x, 4.6, 0, 0.13, 7, 0.18, brass);
      box(g, x + 0.09, 4.6, 0.09, 0.025, 7, 0.035, edge);
    }
    const tip = new T.Vector3(Math.sin(a) * radius, 8.42, 3 - Math.cos(a) * radius);
    beam(tip, new T.Vector3(Math.sin(a) * 4.7, 11.8, 3 - Math.cos(a) * 4.7), 0.065, brass);
  }
  // Broad illuminated Art Deco pylons frame the wheel rather than leaving empty sides.
  for (const x of [-7.3, 7.3]) {
    const g = new T.Group();
    g.position.set(x, 0, -2.3);
    g.rotation.y = x < 0 ? 0.22 : -0.22;
    parent.add(g);
    box(g, 0, 4.1, 0, 1.05, 8.2, 0.56, brass);
    box(g, 0, 4.8, 0.34, 0.71, 5.3, 0.06, light);
    box(g, 0, 0.24, 0, 1.35, 0.48, 0.95, stone);
    box(g, 0, 1.15, 0.32, 0.88, 1.5, 0.1, dark);
    for (const side of [-1, 1]) box(g, side * 0.48, 4.2, 0.35, 0.075, 7.6, 0.09, edge);
    for (let j = 0; j < 7; j++) {
      const o = box(g, (j - 3) * 0.095, 4.8, 0.4, 0.025, 4.6, 0.025, brass);
      o.rotation.z = (j - 3) * 0.09;
    }
    const emblem = new T.Mesh(new T.TorusGeometry(0.24, 0.026, 8, 32), brass);
    emblem.position.set(0, 4.9, 0.44);
    g.add(emblem);
    const lamp = new T.PointLight('#ffe1a7', 15, 7, 2);
    lamp.position.set(x, 3.7, 0.8);
    parent.add(lamp);
  }
  // Side walls close the studio beyond the glass bays.
  for (const side of [-1, 1]) {
    box(parent, side * 13, 4.7, 5, 1, 9.4, 22, dark);
    for (let z = -5; z < 15; z += 2.2) {
      box(parent, side * 12.45, 4.6, z, 0.12, 8.4, 0.12, brass);
      box(parent, side * 12.35, 4.6, z, 0.035, 7.8, 0.035, light);
    }
  }
}
