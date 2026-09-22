import * as THREE from '../../vendor/three.module.min.js';
export function createHost({ sphere, box, cyl, ivory, gold }) {
  const g = new THREE.Group(),
    skin = new THREE.MeshStandardMaterial({ color: '#e9b98b', roughness: 0.7 }),
    suit = new THREE.MeshStandardMaterial({ color: '#15373c', roughness: 0.65 }),
    black = new THREE.MeshStandardMaterial({ color: '#111f23', roughness: 0.38 });
  sphere(0.48, suit, g, 0, 1.12, 0, 1, 1.3, 0.7);
  sphere(0.36, ivory, g, 0, 1.3, 0.17, 0.65, 1, 0.4);
  const lapel1 = box(0.17, 0.57, 0.1, suit, g, -0.16, 1.35, 0.32);
  lapel1.rotation.z = 0.28;
  const lapel2 = box(0.17, 0.57, 0.1, suit, g, 0.16, 1.35, 0.32);
  lapel2.rotation.z = -0.28;
  for (let i = 0; i < 3; i++) sphere(0.033, gold, g, 0, 1.02 + i * 0.16, 0.36);
  sphere(0.41, skin, g, 0, 1.99, 0.01, 1, 1.06, 0.9);
  sphere(0.12, skin, g, 0, 1.98, 0.39, 1, 0.8, 1);
  for (const x of [-0.16, 0.16]) {
    sphere(0.067, ivory, g, x, 2.1, 0.32);
    sphere(0.03, black, g, x, 2.1, 0.375);
    sphere(0.065, skin, g, x * 2.7, 2, 0.0, 0.6, 1, 1);
    const brow = box(0.15, 0.035, 0.025, ivory, g, x, 2.23, 0.325);
    brow.rotation.z = x > 0 ? -0.1 : 0.1;
    const mo = sphere(0.17, ivory, g, x * 0.66, 1.88, 0.365, 1, 0.42, 0.65);
    mo.rotation.z = x > 0 ? 0.23 : -0.23;
  }
  const hat = cyl(0.38, 0.35, 0.55, black, g, 0, 2.64, 0);
  cyl(0.55, 0.55, 0.075, black, g, 0, 2.38, 0);
  cyl(0.36, 0.36, 0.1, gold, g, 0, 2.43, 0);
  const arms = [];
  for (const s of [-1, 1]) {
    const a = new THREE.Group();
    a.position.set(s * 0.41, 1.52, 0);
    g.add(a);
    sphere(0.15, suit, a, 0, -0.22, 0, 1, 2.1, 1);
    sphere(0.105, ivory, a, 0, -0.51, 0);
    sphere(0.14, skin, a, 0, -0.63, 0.015);
    a.rotation.z = s * 0.2;
    arms.push(a);
  }
  const legs = [];
  for (const s of [-1, 1]) {
    const l = new THREE.Group();
    l.position.set(s * 0.2, 0.7, 0);
    g.add(l);
    cyl(0.14, 0.12, 0.49, black, l, 0, -0.24, 0);
    sphere(0.17, black, l, 0, -0.55, 0.08, 1, 0.65, 1.6);
    legs.push(l);
  }
  g.userData = { arms, legs };
  return g;
}
