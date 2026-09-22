import * as THREE from '../../vendor/three.module.min.js';
export function createFireworks(scene) {
  const count = 640,
    positions = new Float32Array(count * 3),
    colors = new Float32Array(count * 3),
    velocity = new Float32Array(count * 3),
    life = new Float32Array(count);
  positions.fill(-1000);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const ctx = c.getContext('2d'),
    gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradient.addColorStop(0, '#fff');
  gradient.addColorStop(0.18, '#fff');
  gradient.addColorStop(1, '#ffffff00');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 32, 32);
  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      map: new THREE.CanvasTexture(c),
      size: 0.19,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  points.frustumCulled = false;
  points.visible = false;
  scene.add(points);
  let remaining = 0,
    next = 0,
    cursor = 0,
    mode = 'studio';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function burst() {
    const x = (Math.random() < 0.5 ? -1 : 1) * (mode === 'city' ? 7 : 5),
      y = mode === 'city' ? 6 + Math.random() * 3 : 5 + Math.random() * 3,
      z = mode === 'city' ? -3 : -5;
    const tint = new THREE.Color(
      ['#ffd67d', '#fff3cf', '#7edcf4', '#ee9fa9'][Math.floor(Math.random() * 4)],
    );
    for (let i = 0; i < 80; i++) {
      const j = cursor++ % count,
        k = j * 3,
        az = Math.random() * Math.PI * 2,
        el = Math.acos(2 * Math.random() - 1),
        speed = 1.4 + Math.random() * 2.5;
      positions[k] = x;
      positions[k + 1] = y;
      positions[k + 2] = z;
      velocity[k] = Math.sin(el) * Math.cos(az) * speed;
      velocity[k + 1] = Math.cos(el) * speed;
      velocity[k + 2] = Math.sin(el) * Math.sin(az) * speed;
      life[j] = 1.4 + Math.random() * 0.8;
      colors[k] = tint.r;
      colors[k + 1] = tint.g;
      colors[k + 2] = tint.b;
    }
  }
  return {
    start(where, seconds = 4) {
      if (reduced) return;
      mode = where;
      remaining = seconds;
      next = 0;
      points.visible = true;
    },
    stop() {
      remaining = 0;
    },
    update(dt) {
      if (!points.visible) return;
      remaining = Math.max(0, remaining - dt);
      next -= dt;
      if (remaining > 0 && next <= 0) {
        burst();
        next = 0.42 + Math.random() * 0.3;
      }
      let alive = false;
      for (let j = 0; j < count; j++) {
        if (life[j] <= 0) continue;
        life[j] -= dt;
        const k = j * 3;
        if (life[j] <= 0) {
          positions[k + 1] = -1000;
          continue;
        }
        alive = true;
        velocity[k + 1] -= 1.2 * dt;
        for (let a = 0; a < 3; a++) {
          positions[k + a] += velocity[k + a] * dt;
          colors[k + a] *= Math.exp(-dt * 0.65);
        }
      }
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
      if (!alive && remaining <= 0) points.visible = false;
    },
  };
}
