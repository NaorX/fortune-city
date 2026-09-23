import { SETTINGS } from './game/settings.mjs';
import { initSocial } from './ui/social.mjs?v=volume-default';
import { createHost } from './characters/host.mjs';
import { addMakerMark } from './scenes/maker-mark.mjs?v=integrated';
import { initWallet } from './ui/wallet.mjs';
import { createHostArm } from './characters/host-arm.mjs';
import { createMusic } from './audio/music.mjs';
import * as THREE from '../vendor/three.module.min.js';
import { createFireworks } from './effects/fireworks.mjs';
import { buildStudio } from './scenes/studio.mjs';
import { createGuest } from './characters/guest.mjs';
import { building, createSkyDetails, buildBonusCity } from './scenes/city.mjs?v=street-names';
import {
  SEGMENTS,
  randomInt,
  pickWheelIndex,
  payout,
  bonusPayout,
  wheelTarget,
  BettingWindow,
} from './game/rules.mjs?v=unbiased';
const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const bettingWindow = new BettingWindow(SETTINGS.bettingSeconds * 1000);
let countdownTimer,
  chipPlacements = {},
  wheelCloseup = false;
function bettingOpen() {
  return state === 'idle' && bettingWindow.isOpen(performance.now());
}
function startBetting() {
  clearInterval(countdownTimer);
  state = 'idle';
  bettingWindow.start(performance.now());
  document.body.classList.remove('wheel-closeup', 'bets-locked', 'chance-play', 'chance-revealed');
  wheelCloseup = false;
  targets();
  status('PLACE YOUR BETS', 'Choose your results within 10 seconds');
  update();
  tickCountdown();
  countdownTimer = setInterval(tickCountdown, 50);
}
function tickCountdown() {
  if (state !== 'idle') return;
  const left = bettingWindow.remaining(performance.now());
  $('#countdown-value').textContent = Math.ceil(left / 1000);
  $('#round-clock').style.setProperty('--progress', left / bettingWindow.duration);
  $('#round-clock').classList.toggle('urgent', left <= 3000);
  if (left <= 0) {
    clearInterval(countdownTimer);
    spin();
  }
}
function chipLabel(value) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: value >= 10000 ? 0 : 1,
  }).format(value);
}
function chipsMarkup(key, total) {
  if (!total) return '';
  let rest = total,
    list = [];
  for (const value of [500, 100, 50, 25, 10, 5, 1]) {
    const count = Math.floor(rest / value);
    rest %= value;
    for (let i = 0; i < Math.min(count, 4); i++) list.push(value);
  }
  list = list.slice(0, 4).reverse();
  return list
    .map(
      (value, i) =>
        '<span class="placed-chip chip-' +
        value +
        '" style="--layer:' +
        i +
        '"><span>' +
        (i === list.length - 1 ? chipLabel(total) : '') +
        '</span></span>',
    )
    .join('');
}
function landChip(button) {
  button.classList.remove('chip-land');
  void button.offsetWidth;
  button.classList.add('chip-land');
  button.onanimationend = () => button.classList.remove('chip-land');
}
let balance = SETTINGS.startingCoins,
  selectedChip = 25,
  bets = {},
  previousBets = {},
  state = 'idle',
  round = 1,
  multiplier = 1,
  history = [],
  muted = true,
  audioCtx,
  audioOutput,
  music,
  toastTimer;
try {
  const saved = JSON.parse(localStorage.getItem('fortune-city-v1'));
  if (saved && Number.isFinite(saved.balance) && saved.balance >= 0) {
    balance = Math.min(saved.balance, 1e9);
    history = (saved.history || []).filter((x) => SEGMENTS.includes(x)).slice(0, 21);
    previousBets = Object.fromEntries(
      Object.entries(saved.previousBets || {}).filter(
        ([key, value]) =>
          ['1', '2', '5', '10', '2R', '4R'].includes(key) &&
          Number.isSafeInteger(value) &&
          value > 0 &&
          value <= 1e9,
      ),
    );
    round = Math.max(1, Number(saved.round) || 1);
  }
} catch {}
const save = () => {
  try {
    localStorage.setItem(
      'fortune-city-v1',
      JSON.stringify({ balance, history, round, previousBets }),
    );
  } catch {}
};
function tone(f = 440, d = 0.12, type = 'sine', v = 0.06) {
  if (muted) return;
  try {
    audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
    audioCtx.resume();
    const o = audioCtx.createOscillator(),
      g = audioCtx.createGain();
    o.type = type;
    o.frequency.value = f;
    g.gain.setValueAtTime(v, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + d);
    o.connect(g);
    g.connect(audioOutput || audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + d);
  } catch {}
}
function chime() {
  [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.6, 'sine', 0.09), i * 100));
}
function toast(s) {
  $('#toast').textContent = s;
  $('#toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 2700);
}
function status(title, sub, orb = '✦') {
  $('#status-title').textContent = title;
  $('#status-sub').textContent = sub;
  $('#status-orb').textContent = orb;
}
function update() {
  const total = Object.values(bets).reduce((a, b) => a + b, 0);
  $('#balance').textContent = '$' + balance.toLocaleString('en-US');
  if (state !== 'bonus') $('#stake').textContent = '$' + total.toLocaleString('en-US');
  $('#round-number').textContent = '#' + String(round).padStart(3, '0');
  $$('[data-bet]').forEach((b) => {
    const n = bets[b.dataset.bet] || 0;
    b.classList.toggle('has-bet', n > 0);
    const holder = b.querySelector('.bet-amount'),
      markup = chipsMarkup(b.dataset.bet, n);
    if (holder.innerHTML !== markup) holder.innerHTML = markup;
    b.setAttribute(
      'aria-label',
      b.dataset.bet.replace('R', ' ROLLS') + (n ? ' · ' + n + ' coins' : ''),
    );
    b.disabled = !bettingOpen();
  });
  $$('[data-chip]').forEach((b) => (b.disabled = !bettingOpen()));
  $('#clear').disabled = !bettingOpen() || !total;
  $('#clear').hidden = total === 0;
  const repeatTotal = Object.values(previousBets).reduce((sum, n) => sum + n, 0);
  $('#repeat-bet').hidden = total > 0;
  $('#repeat-bet').disabled = !bettingOpen() || !repeatTotal || balance < repeatTotal;
  $('#repeat-bet').title = repeatTotal
    ? 'Repeat bet: ' + money(repeatTotal) + (balance < repeatTotal ? ' - insufficient balance' : '')
    : 'Place a bet to use Repeat Bet next round';
  $('#refill').hidden = balance >= 25 || total > 0;
  $('#multiplier').hidden = multiplier === 1;
  $('#multiplier b').textContent = '×' + multiplier;
  $('#history').innerHTML = history.length
    ? history
        .map(
          (x) =>
            `<span class="history-bubble result-${x} ${x.includes('R') ? 'bonus' : ''}">${x === 'C' ? '?' : x}</span>`,
        )
        .join('')
    : '<span class="empty-history"></span>';
}
$$('[data-chip]').forEach(
  (b) =>
    (b.onclick = () => {
      if (!bettingOpen()) return;
      selectedChip = Number(b.dataset.chip);
      $$('[data-chip]').forEach((x) => x.classList.toggle('selected', x === b));
      tone(700);
    }),
);
$$('[data-bet]').forEach(
  (b) =>
    (b.onclick = () => {
      if (!bettingOpen()) {
        toast('Bets are closed. Next round soon.');
        return;
      }
      if (balance < selectedChip) {
        toast('Not enough coins for this chip.');
        return;
      }
      balance -= selectedChip;
      bets[b.dataset.bet] = (bets[b.dataset.bet] || 0) + selectedChip;
      (chipPlacements[b.dataset.bet] ??= []).push(selectedChip);
      landChip(b);
      tone(450 + randomInt(300), 0.09, 'triangle');
      update();
      save();
      status('BETS PLACED', 'Add chips before the countdown ends');
    }),
);
$('#repeat-bet').onclick = () => {
  const total = Object.values(previousBets).reduce((sum, n) => sum + n, 0);
  if (!bettingOpen() || Object.keys(bets).length || !total || balance < total) return;
  balance -= total;
  bets = { ...previousBets };
  chipPlacements = {};
  update();
  $$('[data-bet]')
    .filter((button) => bets[button.dataset.bet])
    .forEach(landChip);
  save();
  tone(660);
};
$('#clear').onclick = () => {
  if (!bettingOpen()) return;
  balance += Object.values(bets).reduce((a, b) => a + b, 0);
  bets = {};
  chipPlacements = {};
  update();
  save();
  status('MAKE YOUR PLAY', 'Select a chip, then choose a result');
};
$('#refill').onclick = () => {
  if (state === 'idle' && balance < 25) {
    balance += SETTINGS.refillCoins;
    save();
    update();
    toast(SETTINGS.refillCoins.toLocaleString('en-US') + ' fresh coins. Good luck!');
  }
};
$('#help').onclick = () => $('#help-dialog').showModal();
initWallet({
  getBalance: () => balance,
  credit: (amount) => {
    balance += amount;
    save();
    update();
  },
  onSuccess: chime,
});
$('.close-dialog').onclick = () => $('#help-dialog').close();
$('#help-dialog').onclick = (e) => {
  if (e.target === $('#help-dialog')) $('#help-dialog').close();
};
$('#fullscreen').onclick = async () => {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    else await document.exitFullscreen();
  } catch {
    toast('Full screen is unavailable in this browser');
  }
};
let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
} catch {
  $('#loading').innerHTML =
    '<h2>3D support required</h2><p>Open in a current browser with hardware acceleration enabled.</p>';
  throw Error('WebGL unavailable');
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
$('#scene').appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#91cfe9');
scene.fog = new THREE.Fog('#c4dfea', 28, 95);
const camera = new THREE.PerspectiveCamera(43, 1, 0.3, 140);
const studio = new THREE.Group(),
  boardWorld = new THREE.Group();
scene.add(studio, boardWorld);
boardWorld.visible = false;
const gold = new THREE.MeshStandardMaterial({ color: '#cda85d', metalness: 0.78, roughness: 0.25 });
const goldLight = new THREE.MeshStandardMaterial({
  color: '#f8d998',
  metalness: 0.65,
  roughness: 0.22,
});
const dark = new THREE.MeshStandardMaterial({ color: '#0a252b', metalness: 0.35, roughness: 0.35 });
const teal = new THREE.MeshStandardMaterial({ color: '#135253', metalness: 0.3, roughness: 0.4 });
const ivory = new THREE.MeshStandardMaterial({ color: '#fff1cf', roughness: 0.55 });
const warmGlow = new THREE.MeshStandardMaterial({
  color: '#ffde91',
  emissive: '#ffc966',
  emissiveIntensity: 2.3,
});
function mesh(geo, mat, parent = studio, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function box(w, h, d, mat, p, x = 0, y = 0, z = 0) {
  return mesh(new THREE.BoxGeometry(w, h, d), mat, p, x, y, z);
}
function sphere(r, mat, p, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const m = mesh(new THREE.SphereGeometry(r, 28, 18), mat, p, x, y, z);
  m.scale.set(sx, sy, sz);
  return m;
}
function cyl(rt, rb, h, mat, p, x = 0, y = 0, z = 0) {
  return mesh(new THREE.CylinderGeometry(rt, rb, h, 64), mat, p, x, y, z);
}
function torus(r, t, mat, p, x = 0, y = 0, z = 0) {
  return mesh(new THREE.TorusGeometry(r, t, 12, 120), mat, p, x, y, z);
}
function canvasTexture(w, h, paint) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function textPlane(text, w, h, fg, bg, p, x, y, z) {
  const t = canvasTexture(512, 128, (c, W, H) => {
    if (bg) {
      c.fillStyle = bg;
      c.fillRect(0, 0, W, H);
    }
    c.fillStyle = fg;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = 'bold ' + Math.min(108, Math.floor(720 / Math.max(text.length, 1))) + 'px Georgia';
    c.fillText(text, W / 2, H / 2);
  });
  const m = mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: t, transparent: !bg, side: THREE.DoubleSide }),
    p,
    x,
    y,
    z,
  );
  return m;
}
scene.add(new THREE.HemisphereLight('#e8f6ff', '#b6aba0', 1.25));
const key = new THREE.DirectionalLight('#fff2d5', 2.1);
key.position.set(-5, 12, 10);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -17, right: 17, top: 17, bottom: -17, near: 1, far: 60 });
key.shadow.bias = -0.0001;
key.shadow.normalBias = 0.035;
scene.add(key);
const rim = new THREE.DirectionalLight('#d1edff', 1.2);
rim.position.set(8, 7, -6);
scene.add(rim);
const front = new THREE.PointLight('#ffe3a5', 80, 22, 2);
front.position.set(0, 7, 6);
scene.add(front);
// In-world architecture and actual 3D furniture.
const floorTex = canvasTexture(1024, 1024, (c, w, h) => {
  c.fillStyle = '#d6c9af';
  c.fillRect(0, 0, w, h);
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) {
      c.fillStyle = (x + y) % 2 ? '#dfd2b9' : '#cbbda5';
      c.fillRect(x * 128, y * 128, 128, 128);
      c.strokeStyle = '#a8997133';
      c.strokeRect(x * 128, y * 128, 128, 128);
    }
  for (let i = 0; i < 80; i++) {
    c.strokeStyle = '#d2ddcd08';
    c.beginPath();
    c.moveTo(Math.random() * w, 0);
    c.lineTo(Math.random() * w, h);
    c.stroke();
  }
});
floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
floorTex.repeat.set(3, 3);
const floorMat = new THREE.MeshPhysicalMaterial({
  map: floorTex,
  roughness: 0.23,
  metalness: 0.18,
  clearcoat: 1,
  clearcoatRoughness: 0.12,
});
const floor = mesh(new THREE.PlaneGeometry(70, 70), floorMat, studio);
floor.rotation.x = -Math.PI / 2;
for (const r of [5.5, 5.6, 8.3, 8.4]) {
  const ring = torus(r, 0.022, gold, studio, 0, 0.018, 0);
  ring.rotation.x = -Math.PI / 2;
}
const stage = cyl(
  4.9,
  5.05,
  0.18,
  new THREE.MeshStandardMaterial({ color: '#c4b18d', roughness: 0.38, metalness: 0.18 }),
  studio,
  0,
  0.1,
  0,
);
const sr = torus(4.95, 0.035, goldLight, studio, 0, 0.2, 0);
sr.rotation.x = -Math.PI / 2;
const inlay = canvasTexture(1024, 1024, (c, w, h) => {
  c.fillStyle = '#e1d2b8';
  c.fillRect(0, 0, w, h);
  c.translate(w / 2, h / 2);
  for (let i = 0; i < 24; i++) {
    c.rotate(Math.PI / 12);
    c.strokeStyle = '#ab967633';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(512, 0);
    c.stroke();
  }
  for (const [r, t, color] of [
    [473, 35, '#7c634e'],
    [448, 3, '#e8ce94'],
    [492, 3, '#ccb486'],
    [160, 2, '#b39d79'],
  ]) {
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.lineWidth = t;
    c.strokeStyle = color;
    c.stroke();
  }
});
const inlayFace = mesh(
  new THREE.CircleGeometry(4.88, 128),
  new THREE.MeshPhysicalMaterial({
    map: inlay,
    roughness: 0.23,
    metalness: 0.12,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
  }),
  studio,
  0,
  0.196,
  0,
);
inlayFace.rotation.x = -Math.PI / 2;
for (let i = 0; i < 42; i++) {
  const x = ((i % 21) - 10) * 2.15,
    z = -13 - Math.floor(i / 21) * 7;
  building(studio, x, z, 2 + ((i * 7) % 9), i, 1.05);
}
const studioBalloons = createSkyDetails(studio).map((group, index) => ({
  group,
  baseHeight: group.position.y,
  amplitude: 0.35 + (index % 3) * 0.08,
  speed: 0.4 + index * 0.035,
  phase: index * 1.3,
}));
// A soft sky reflection lights the bevels of the brass and glass.
const skyEnvironment = canvasTexture(512, 256, (c, w, h) => {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#6ab9e4');
  g.addColorStop(0.48, '#e6f2fa');
  g.addColorStop(0.55, '#fff4d8');
  g.addColorStop(1, '#b8ad92');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  const sun = c.createRadialGradient(130, 70, 2, 130, 70, 60);
  sun.addColorStop(0, '#ffffff');
  sun.addColorStop(1, '#ffffff00');
  c.fillStyle = sun;
  c.fillRect(0, 0, w, h);
});
skyEnvironment.mapping = THREE.EquirectangularReflectionMapping;
scene.environment = skyEnvironment;
scene.environmentIntensity = 0.45;
buildStudio(studio);
// The wheel: independently rotating face, gold frame, pegs, bulbs and flapper.
const wheelRoot = new THREE.Group();
wheelRoot.position.set(-0.25, 4.25, 0);
studio.add(wheelRoot);
const wheel = new THREE.Group();
wheelRoot.add(wheel);
const radius = 3.05;
const segmentColors = {
  1: '#f0e1bd',
  2: '#8eaf8b',
  5: '#b87883',
  10: '#54a9af',
  '2R': '#343d4c',
  '4R': '#c39945',
  C: '#edba5f',
};
const faceTexture = canvasTexture(2048, 2048, (c, w, h) => {
  const mid = w / 2,
    R = w * 0.485;
  c.translate(mid, mid);
  for (let i = 0; i < SEGMENTS.length; i++) {
    const a = (i * 2 * Math.PI) / SEGMENTS.length,
      b = ((i + 1) * 2 * Math.PI) / SEGMENTS.length;
    const v = SEGMENTS[i];
    c.beginPath();
    c.moveTo(0, 0);
    c.arc(0, 0, R, -b, -a);
    c.closePath();
    c.fillStyle = segmentColors[v];
    c.fill();
    c.lineWidth = 3;
    c.strokeStyle = '#f8e8baaa';
    c.stroke();
    c.save();
    c.rotate(-(a + b) / 2);
    c.translate(R * 0.88, 0);
    if (!v.includes('R') && v !== 'C') {
      c.beginPath();
      c.ellipse(0, 0, 38, 40, 0, 0, Math.PI * 2);
      c.fillStyle = '#253336';
      c.fill();
      c.rotate(Math.PI / 2);
      c.font = 'bold 59px Arial';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillStyle = '#ffedce';
      c.fillText(v, 0, 1);
    } else {
      c.rotate(Math.PI);
      c.font = 'bold 40px Arial';
      c.textAlign = 'left';
      c.textBaseline = 'middle';
      c.fillStyle = v === '2R' ? '#fff4d9' : '#433821';
      c.fillText(v === 'C' ? '? CHANCE' : v[0] + ' ROLLS', -28, 0);
    }
    c.restore();
  }
});
const wheelBody = cyl(radius, radius, 0.22, gold, wheel);
wheelBody.rotation.x = Math.PI / 2;
const face = mesh(
  new THREE.CircleGeometry(radius - 0.04, 160),
  new THREE.MeshStandardMaterial({ map: faceTexture, roughness: 0.55, metalness: 0.08 }),
  wheel,
  0,
  0,
  0.125,
);
torus(radius, 0.095, goldLight, wheelRoot, 0, 0, 0.08);
torus(radius + 0.16, 0.048, gold, wheelRoot, 0, 0, 0.045);
torus(radius - 0.08, 0.026, goldLight, wheelRoot, 0, 0, 0.18);
for (let i = 0; i < 54; i++) {
  const a = (i * Math.PI * 2) / 54;
  sphere(
    0.033,
    goldLight,
    wheel,
    Math.cos(a) * (radius - 0.01),
    Math.sin(a) * (radius - 0.01),
    0.23,
  );
  sphere(
    0.036,
    warmGlow,
    wheelRoot,
    Math.cos(a) * (radius + 0.16),
    Math.sin(a) * (radius + 0.16),
    0.065,
  );
}
const hub = cyl(0.94, 0.94, 0.31, dark, wheelRoot, 0, 0, 0.3);
hub.rotation.x = Math.PI / 2;
torus(0.94, 0.045, goldLight, wheelRoot, 0, 0, 0.47);
torus(0.86, 0.012, gold, wheelRoot, 0, 0, 0.478);
const emblem = new THREE.Shape();
emblem.moveTo(-0.34, -0.43);
emblem.lineTo(-0.1, -0.43);
emblem.lineTo(-0.1, -0.04);
emblem.lineTo(0.29, -0.04);
emblem.lineTo(0.29, 0.17);
emblem.lineTo(-0.1, 0.17);
emblem.lineTo(-0.1, 0.37);
emblem.lineTo(0.4, 0.37);
emblem.lineTo(0.4, 0.59);
emblem.lineTo(-0.34, 0.59);
emblem.closePath();
mesh(
  new THREE.ExtrudeGeometry(emblem, {
    depth: 0.08,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.022,
    bevelSegments: 3,
    steps: 1,
  }),
  goldLight,
  wheelRoot,
  -0.03,
  -0.08,
  0.48,
);

for (let i = 0; i < 32; i++) {
  const angle = (i * Math.PI * 2) / 32;
  const etch = box(
    0.012,
    0.04,
    0.009,
    gold,
    wheelRoot,
    Math.cos(angle) * 0.9,
    Math.sin(angle) * 0.9,
    0.48,
  );
  etch.rotation.z = angle - Math.PI / 2;
}
const pointer = mesh(
  new THREE.ConeGeometry(0.2, 0.55, 3),
  goldLight,
  wheelRoot,
  0,
  radius + 0.11,
  0.35,
);
pointer.rotation.z = Math.PI;
pointer.rotation.y = Math.PI / 2;
const pointerPivot = new THREE.Group();
wheelRoot.add(pointerPivot);

cyl(0.8, 1.12, 0.22, gold, studio, -0.25, 0.24, -0.2);
addMakerMark({ THREE, parent: studio, gold, canvasTexture });
// Host and bonus token share the same character model.
const host = createHost({ sphere, box, cyl, ivory, gold });
host.position.set(3.65, 0.15, 1.1);
host.rotation.y = -0.3;
host.scale.setScalar(1.23);
studio.add(host);
// The host stands directly on the level studio stage.

// Velvet chair and lamps in the studio.
const chair = new THREE.Group();
chair.position.set(-4.8, 0.35, 0.45);
chair.rotation.y = 0.35;
studio.add(chair);
box(1.55, 0.45, 1.2, teal, chair, 0, 0.55, 0);
box(1.6, 1.45, 0.35, teal, chair, 0, 1.25, -0.5);
for (const x of [-0.83, 0.83]) {
  box(0.32, 0.75, 1.2, teal, chair, x, 0.8, 0);
  for (const z of [-0.42, 0.42]) cyl(0.05, 0.045, 0.4, gold, chair, x, 0.15, z);
}
for (let i = -2; i <= 2; i++) sphere(0.045, gold, chair, i * 0.27, 1.3, -0.3);
cyl(0.65, 0.7, 0.1, gold, studio, -3.6, 0.8, 1.2);
cyl(0.05, 0.1, 0.7, gold, studio, -3.6, 0.4, 1.2);
for (const x of [-6.4, 6.7]) {
  cyl(0.04, 0.08, 3.9, gold, studio, x, 2, 0);
  cyl(
    0.6,
    0.36,
    0.55,
    new THREE.MeshStandardMaterial({
      color: '#e9cc93',
      emissive: '#e5ae50',
      emissiveIntensity: 0.4,
    }),
    studio,
    x,
    4,
    0,
  );
  cyl(0.4, 0.45, 0.1, gold, studio, x, 0.08, 0);
  const p = new THREE.PointLight('#ffc46b', 12, 6);
  p.position.set(x, 3.7, 0);
  studio.add(p);
}
const guest = createGuest(chair);
const tileValues = Array.from({ length: 40 }, (_, i) => [2, 3, 5, 4, 8, 6, 10, 7, 12, 15][i % 10]);
const { tiles, tilePositions, labels } = buildBonusCity(boardWorld, tileValues);
const token = createHost({ sphere, box, cyl, ivory, gold });
token.scale.setScalar(0.46);
token.position.copy(tilePositions[0]);
boardWorld.add(token);
function makeDie() {
  const g = new THREE.Group();
  const base = box(0.62, 0.62, 0.62, ivory, g);
  const pipMat = new THREE.MeshStandardMaterial({ color: '#183840', roughness: 0.55 });
  const points = {
    1: [[0, 0]],
    2: [
      [-1, 1],
      [1, -1],
    ],
    3: [
      [-1, 1],
      [0, 0],
      [1, -1],
    ],
    4: [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ],
    5: [
      [-1, -1],
      [-1, 1],
      [0, 0],
      [1, -1],
      [1, 1],
    ],
    6: [
      [-1, -1],
      [-1, 0],
      [-1, 1],
      [1, -1],
      [1, 0],
      [1, 1],
    ],
  };
  const faces = [
    { n: 1, r: [0, 0, 0], p: [0, 0, 0.313] },
    { n: 6, r: [0, Math.PI, 0], p: [0, 0, -0.313] },
    { n: 2, r: [0, Math.PI / 2, 0], p: [0.313, 0, 0] },
    { n: 5, r: [0, -Math.PI / 2, 0], p: [-0.313, 0, 0] },
    { n: 3, r: [-Math.PI / 2, 0, 0], p: [0, 0.313, 0] },
    { n: 4, r: [Math.PI / 2, 0, 0], p: [0, -0.313, 0] },
  ];
  for (const f of faces) {
    const fg = new THREE.Group();
    fg.position.set(...f.p);
    fg.rotation.set(...f.r);
    g.add(fg);
    for (const [x, y] of points[f.n])
      mesh(new THREE.CircleGeometry(0.041, 16), pipMat, fg, x * 0.155, y * 0.155, 0);
  }
  return g;
}
const dice = [makeDie(), makeDie()];
dice.forEach((d, i) => {
  d.position.set(i ? 1 : -1, 4, 3);
  d.visible = false;
  boardWorld.add(d);
});
// Floating dust catches the light without covering the game.
const dustGeo = new THREE.BufferGeometry();
const dustPos = new Float32Array(150 * 3);
for (let i = 0; i < 150; i++) {
  dustPos[i * 3] = (Math.random() - 0.5) * 28;
  dustPos[i * 3 + 1] = Math.random() * 12;
  dustPos[i * 3 + 2] = (Math.random() - 0.5) * 20;
}
dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
const dust = new THREE.Points(
  dustGeo,
  new THREE.PointsMaterial({
    color: '#f7d99d',
    size: 0.028,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  }),
);
scene.add(dust);
scene.traverse((o) => {
  for (const m of Array.isArray(o.material) ? o.material : [o.material])
    if (m?.map) {
      m.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
      m.map.needsUpdate = true;
    }
});
const fireworks = createFireworks(scene);
let bonusView = false,
  walking = false,
  spinning = false,
  lastT = 0,
  hostActing = false,
  cinematicActive = false,
  following = false,
  touring = false,
  landingView = false;
let camPos = new THREE.Vector3(),
  camLook = new THREE.Vector3(),
  currentLook = new THREE.Vector3(0, 3, 0);
let pointerTick = 0;
function targets() {
  if (cinematicActive) return;
  const mobile = innerWidth < 700;
  if (bonusView) {
    camPos.set(mobile ? 22 : 12, mobile ? 29 : 16, mobile ? 29 : 17);
    camLook.set(0, 1, 0);
  } else if (hostActing && !wheelCloseup) {
    const distance = Math.max(
      20.3,
      9.4 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect),
    );
    camPos.set(0.65, 6.6, distance);
    camLook.set(0.65, 3.3, 0);
  } else if (wheelCloseup) {
    const distance = Math.max(
      11.9,
      7.3 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect),
    );
    camPos.set(-0.25, 4.65, distance);
    camLook.set(-0.25, 4.15, 0);
  } else {
    // Fit both seated guest and host inside narrow portrait screens.
    const studioDistance = mobile
      ? Math.max(26.8, 11.4 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect))
      : 20.3;
    camPos.set(0, mobile ? 7.1 : 6.6, studioDistance);
    camLook.set(0, mobile ? 3.45 : 2.7, 0);
  }
}
function resize() {
  const el = $('#game');
  renderer.setSize(el.clientWidth, el.clientHeight);
  camera.aspect = el.clientWidth / el.clientHeight;
  camera.updateProjectionMatrix();
  targets();
  positionStudioAward();
}
resize();
camera.position.copy(camPos);
currentLook.copy(camLook);
camera.lookAt(currentLook);
addEventListener('resize', resize);
let idleCue = 0,
  idleSince = 0,
  idleUntil = 0;
function idleHost(t, dt) {
  if (t > idleUntil) {
    idleCue = randomInt(4);
    idleSince = t;
    idleUntil = t + 2200 + randomInt(1200);
  }
  const p = Math.min(1, (t - idleSince) / (idleUntil - idleSince)),
    gesture = Math.pow(Math.sin(p * Math.PI), 2),
    blend = 1 - Math.exp(-dt * 7),
    arms = host.userData.arms;
  const left = idleCue === 0 ? -1.05 * gesture : idleCue === 2 ? -0.85 * gesture : 0,
    right = idleCue === 1 ? -1.12 * gesture : idleCue === 2 ? -0.85 * gesture : 0;
  arms[0].rotation.x = THREE.MathUtils.lerp(arms[0].rotation.x, left, blend);
  arms[1].rotation.x = THREE.MathUtils.lerp(arms[1].rotation.x, right, blend);
  arms[0].rotation.z = -0.25 - (idleCue === 2 ? 0.65 : 0.22) * gesture;
  arms[1].rotation.z = 0.2 + (idleCue === 1 ? 0.5 : 0.22) * gesture;
  host.rotation.y = THREE.MathUtils.lerp(
    host.rotation.y,
    -0.3 + Math.sin(t * 0.00065) * 0.09 + (idleCue === 3 ? 0.16 * gesture : 0),
    blend,
  );
  host.rotation.z = THREE.MathUtils.lerp(host.rotation.z, Math.sin(t * 0.0008) * 0.015, blend);
  host.position.y = 0.15 + Math.sin(t * 0.0015) * 0.006;
}
function animate(t) {
  requestAnimationFrame(animate);
  const dt = Math.min((t - lastT) / 1000, 1);
  lastT = t;
  guest.update(t, reduced);
  fireworks.update(dt);
  for (const label of labels) {
    const angle = Math.atan2(
      camera.position.x - (touring ? label.position.x : token.position.x),
      camera.position.z - (touring ? label.position.z : token.position.z),
    );
    label.userData.valueMesh.rotation.z =
      following || landingView || touring ? angle - label.rotation.z : 0;
  }
  camera.position.lerp(camPos, 1 - Math.exp(-dt * (following ? 10 : 5)));
  currentLook.lerp(camLook, 1 - Math.exp(-dt * (following ? 10 : 5)));
  camera.lookAt(currentLook);
  if (!reduced) {
    for (const balloon of studioBalloons) {
      balloon.group.position.y =
        balloon.baseHeight +
        balloon.amplitude * Math.sin(t * 0.001 * balloon.speed + balloon.phase);
    }
    if (!hostActing) {
      idleHost(t, dt);
    }
    dust.rotation.y = t * 0.000012;
    if (walking) {
      token.userData.legs[0].rotation.x = Math.sin(t * 0.018) * 0.48;
      token.userData.legs[1].rotation.x = -Math.sin(t * 0.018) * 0.48;
      token.userData.arms[0].rotation.x = -Math.sin(t * 0.018) * 0.25;
      token.userData.arms[1].rotation.x = Math.sin(t * 0.018) * 0.25;
    } else {
      token.userData.legs.forEach((l) => (l.rotation.x = 0));
    }
  }
  pointer.rotation.z = Math.PI + (spinning ? Math.sin(t * 0.045) * 0.12 : 0);
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);
renderer.domElement.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  toast('3D rendering stopped. Refresh to return to the game.');
});
function tween(duration, fn) {
  return new Promise((resolve) => {
    let start;
    function tick(now) {
      start ??= now;
      const p = Math.min(1, (now - start) / duration);
      fn(p);
      if (p < 1) requestAnimationFrame(tick);
      else resolve();
    }
    requestAnimationFrame(tick);
  });
}
function addHistory(result) {
  history.unshift(result);
  history = history.slice(0, 21);
  update();
  save();
}
function clearRoundBets() {
  bets = {};
  chipPlacements = {};
  $$('.chip-land').forEach((e) => e.classList.remove('chip-land'));
  update();
}
async function finish(amount, detail, celebrated = false, result = '') {
  clearRoundBets();
  spinning = false;
  clearChanceUi();
  if (amount > 0) {
    balance += amount;
    save();
    chime();
    if (!celebrated) {
      await showAward(amount, false, result);
    }
  } else if (!celebrated) {
    status('NEXT TIME', 'A new round is coming');
    await sleep(1800);
  }
  wheelCloseup = false;
  document.body.classList.remove('wheel-closeup');
  targets();
  bets = {};
  chipPlacements = {};
  multiplier = 1;
  state = 'idle';
  round++;
  $$('.winner').forEach((e) => e.classList.remove('winner'));
  update();
  save();
  $('#clock-label').textContent = 'PLACE YOUR BETS';
  startBetting();
}

// A two-joint arm keeps the palm on the rotating rim through the push.
let grippingWheel = false;
const { gestureArm, gestureHand, aimHand, restingPalm } = createHostArm({
  THREE,
  host,
  studio,
  sleeve: host.userData.arms[0].children[0].material,
  handMaterial: host.userData.arms[0].children[2].material,
  ivory,
  cyl,
  sphere,
  wheelRoot,
});
function rimPoint(angle) {
  return new THREE.Vector3(
    wheelRoot.position.x + Math.cos(angle) * 3.04,
    wheelRoot.position.y + Math.sin(angle) * 3.04,
    0.46,
  );
}
function easeMove(p) {
  return p * p * (3 - 2 * p);
}
async function moveHost(to, duration) {
  const from = host.position.clone();
  await tween(duration, (p) => {
    const e = easeMove(p);
    host.position.lerpVectors(from, to, e);
    host.position.y = from.y + (to.y - from.y) * e + Math.sin(p * Math.PI * 6) * 0.025;
    host.userData.legs.forEach(
      (leg, i) =>
        (leg.rotation.x = Math.sin(p * Math.PI * 6 + i * Math.PI) * 0.32 * Math.sin(p * Math.PI)),
    );
    host.userData.arms[1].rotation.x = -Math.sin(p * Math.PI * 6) * 0.2;
  });
  host.position.copy(to);
  host.userData.legs.forEach((l) => (l.rotation.x = 0));
  host.userData.arms[1].rotation.x = 0;
}
async function approachWheel() {
  hostActing = true;
  wheelCloseup = false;
  document.body.classList.remove('wheel-closeup');
  document.body.classList.add('host-action');
  targets();
  await tween(220, (p) => {
    host.userData.arms.forEach((a) => (a.rotation.x *= 1 - p));
    host.rotation.z *= 1 - p;
  });
  $('#clock-label').textContent = 'HERE WE GO';
  status('BETS CLOSED', 'The host is approaching the wheel', '◆');
  host.rotation.y = -0.65;
  await moveHost(new THREE.Vector3(2.6, 0.15, 0.45), 850);
  host.rotation.y = -0.65;
  host.updateMatrixWorld(true);
  const restingHand = restingPalm();
  grippingWheel = true;
  host.userData.arms[0].visible = false;
  gestureArm.visible = true;
  const contact = rimPoint(-1.0);
  await tween(420, (p) => aimHand(restingHand.clone().lerp(contact, easeMove(p)), easeMove(p)));
  await sleep(100);
}
async function returnHost() {
  const contact = gestureHand.position.clone();
  host.updateMatrixWorld(true);
  const rest = restingPalm();
  await tween(280, (p) => aimHand(contact.clone().lerp(rest, easeMove(p)), 1 - easeMove(p)));
  grippingWheel = false;
  gestureArm.visible = false;
  host.userData.arms[0].visible = true;
  host.rotation.y = 0.7;
  await moveHost(new THREE.Vector3(3.65, 0.15, 1.1), 900);
  host.rotation.y = -0.3;
  host.userData.arms[0].rotation.set(0, 0, -0.25);
  hostActing = false;
  document.body.classList.remove('host-action');
}

async function spin() {
  if (state !== 'idle') return;
  if (Object.values(bets).some((value) => value > 0)) {
    previousBets = { ...bets };
    save();
  }
  bettingWindow.close();
  clearInterval(countdownTimer);
  state = 'spin';
  document.body.classList.add('bets-locked');
  $('#countdown-value').textContent = '0';
  $('#clock-label').textContent = 'BETS CLOSED';
  update();
  status('BETS CLOSED', 'The wheel is about to spin', '◆');
  await sleep(250);
  await runSpin();
}
// Small grip-and-pull gestures build anticipation before the final accelerating push.
async function primeWheel() {
  const pulls = [0, 1, 2, 3][randomInt(4)];
  let speed = 0;
  spinning = true;
  for (let i = 0; i < pulls; i++) {
    const start = wheel.rotation.z,
      initial = speed,
      next = 0.8 + i * 0.32 + randomInt(10) * 0.015,
      seconds = Math.min(0.36 + randomInt(12) * 0.01, 0.7 / (initial + next));
    await tween(seconds * 1000, (p) => {
      const t = p * seconds,
        angle = initial * t + ((next - initial) * t * t) / (2 * seconds);
      wheel.rotation.z = start + angle;
      host.rotation.z = -0.035 * Math.sin(p * Math.PI);
      host.userData.arms[1].rotation.x = -0.2 * Math.sin(p * Math.PI);
      aimHand(rimPoint(-1.0 + angle));
    });
    const from = gestureHand.position.clone(),
      back = rimPoint(-1.0),
      release = wheel.rotation.z,
      coast = 0.24 + randomInt(10) * 0.01,
      drag = 0.55;
    await tween(coast * 1000, (p) => {
      wheel.rotation.z = release + (next * (1 - Math.exp(-drag * p * coast))) / drag;
      const hand = from.clone().lerp(back, easeMove(p));
      hand.z += 0.28 * Math.sin(p * Math.PI);
      aimHand(hand);
    });
    speed = next * Math.exp(-drag * coast);
  }
  host.rotation.z = 0;
  host.userData.arms[1].rotation.x = 0;
  return speed;
}
async function runSpin() {
  const index = pickWheelIndex(bets),
    result = SEGMENTS[index];
  let returnMotion = Promise.resolve(),
    initialSpeed = 0;
  if (!reduced) {
    await approachWheel();
    initialSpeed = await primeWheel();
  }
  const pushAngle = 0.35,
    releaseFrom = wheel.rotation.z + (reduced ? 0 : pushAngle),
    to = wheelTarget(releaseFrom, index) - Math.PI * 2 * 4,
    duration = reduced ? 1300 : 8000;
  if (!reduced) {
    const start = wheel.rotation.z,
      releaseSpeed = (3 * (to - releaseFrom)) / (duration / 1000),
      pushMs = ((2 * pushAngle) / (initialSpeed + releaseSpeed)) * 1000;
    await tween(pushMs, (p) => {
      const t = (p * pushMs) / 1000,
        angle = initialSpeed * t + ((releaseSpeed - initialSpeed) * t * p) / 2;
      wheel.rotation.z = start + angle;
      host.rotation.z = -0.05 * Math.sin(p * Math.PI);
      host.userData.arms[1].rotation.x = -0.3 * Math.sin(p * Math.PI);
      aimHand(rimPoint(-1.0 + angle));
    });
    host.rotation.z = 0;
    host.userData.arms[1].rotation.x = 0;
    returnMotion = returnHost();
  }
  spinning = true;
  $('#clock-label').textContent = 'SPINNING';
  status('SPINNING…', 'Watch the pointer', '↻');
  let last = -1,
    zoomed = false;
  await tween(duration, (p) => {
    if (!zoomed && p >= (reduced ? 0 : 0.07)) {
      zoomed = true;
      wheelCloseup = true;
      document.body.classList.add('wheel-closeup');
      targets();
    }
    const eased = 1 - Math.pow(1 - p, 3);
    wheel.rotation.z = releaseFrom + (to - releaseFrom) * eased;
    const tick = Math.floor(wheel.rotation.z / ((2 * Math.PI) / 54));
    if (tick !== last) {
      last = tick;
      tone(300 + (tick % 3) * 90, 0.035, 'triangle', 0.055);
    }
  });
  await returnMotion;
  wheel.rotation.z = to % (Math.PI * 2);
  spinning = false;
  tone(880, 0.25);
  addHistory(result);
  const b = $(`[data-bet="${result}"]`);
  if (b) b.classList.add('winner');
  status(
    result === 'C' ? 'CHANCE' : result.includes('R') ? result[0] + ' ROLLS' : 'RESULT: ' + result,
    result === 'C'
      ? 'A twist of fate'
      : result.includes('R')
        ? 'The city awaits'
        : 'The result is in',
    result === 'C' ? '?' : result.replace('R', ''),
  );
  $('#clock-label').textContent =
    'RESULT: ' + (result === 'C' ? 'CHANCE' : result.replace('R', ' ROLLS'));
  await sleep(1800);
  if (result === 'C') {
    await chance();
    return;
  }
  if (result.includes('R')) {
    const stake = bets[result] || 0;
    await runBonus(Number(result[0]), stake, false);
    return;
  }
  await finish(
    payout(bets, result, multiplier),
    'Coins, including your winning stake',
    false,
    result,
  );
}
function clearChanceUi() {
  const overlay = $('#chance-overlay');
  overlay.hidden = true;
  overlay.classList.remove('is-multiplier');
  $('.chance-flip').classList.remove('is-revealed');
  document.body.classList.remove('chance-play', 'chance-revealed');
  $$('[data-bet]').forEach((b) => {
    delete b.dataset.chance;
    b.classList.remove('chance-mystery');
  });
}
async function chance() {
  state = 'chance';
  const isMultiplier =
    randomInt(10000) < Math.round(SETTINGS.chanceMultiplierPercent * 100) && multiplier < 64;
  const value = isMultiplier
    ? SETTINGS.chanceMultipliers[randomInt(SETTINGS.chanceMultipliers.length)]
    : SETTINGS.chanceGifts[randomInt(SETTINGS.chanceGifts.length)];
  const hasBets = Object.values(bets).some((v) => v > 0);
  if (!hasBets) {
    await sleep(reduced ? 200 : 900);
    await finish(0, 'Chance · no bets', true);
    return;
  }
  const overlay = $('#chance-overlay');
  const flip = $('.chance-flip');
  const label = isMultiplier
    ? value + 'x Multiplier. Spin wheel again!'
    : (value * multiplier).toLocaleString('en-US') + ' coins for taking part.';
  flip.classList.remove('is-revealed');
  overlay.classList.toggle('is-multiplier', isMultiplier);
  $('#chance-title').textContent = label;
  $('#chance-continue').textContent = isMultiplier ? 'SPIN AGAIN' : 'COLLECT';
  overlay.setAttribute('aria-label', 'Chance');
  $$('[data-bet]').forEach((b) => {
    b.dataset.chance = isMultiplier ? value + '×' : '+' + value * multiplier;
    b.classList.add('chance-mystery');
  });
  document.body.classList.add('chance-play');
  overlay.hidden = false;
  await sleep(reduced ? 350 : 3000);
  flip.classList.add('is-revealed');
  document.body.classList.add('chance-revealed');
  overlay.setAttribute('aria-label', 'Chance. ' + label);
  chime();
  await sleep(reduced ? 900 : 3800);
  clearChanceUi();
  if (isMultiplier) {
    multiplier *= value;
    state = 'spin';
    update();
    status('MULTIPLIER ×' + multiplier + ' ACTIVE', 'Your bets remain. Spinning again.');
    await runSpin();
  } else
    await finish(
      Object.values(bets).some((v) => v > 0) ? value * multiplier : 0,
      'Chance gift · round complete',
      true,
    );
}
let tileIndex = 0,
  jailAttempts = 0;
async function shot(position, look, duration = 900) {
  cinematicActive = true;
  const from = camera.position.clone(),
    fromLook = currentLook.clone();
  await tween(reduced ? 80 : duration, (p) => {
    const e = easeMove(p);
    camPos.lerpVectors(from, position, e);
    camLook.lerpVectors(fromLook, look, e);
  });
  await sleep(reduced ? 40 : 180);
}
function overviewPosition() {
  return innerWidth < 700 ? new THREE.Vector3(20, 27, 26) : new THREE.Vector3(11, 14, 16);
}
async function cityOverview(duration = 1000) {
  landingView = false;
  await shot(overviewPosition(), new THREE.Vector3(0, 0.7, 0), duration);
}
async function enterBonusCity() {
  document.body.classList.add('bonus-transition');
  hostActing = true;
  cinematicActive = true;
  fireworks.start('studio', 3.5);
  camPos.set(3.1, 4.7, 13);
  camLook.set(3.6, 2.3, 1);
  await sleep(reduced ? 100 : 650);
  const home = host.position.clone();
  if (!reduced) {
    await tween(280, (p) => {
      host.scale.y = 1.23 * (1 - 0.12 * easeMove(p));
      host.userData.legs.forEach((l) => (l.rotation.x = -0.22 * easeMove(p)));
    });
    await tween(1000, (p) => {
      const angle = -Math.PI * 2 * easeMove(p),
        jump = 1.8 * 4 * p * (1 - p);
      host.rotation.x = angle;
      host.position.set(
        home.x,
        home.y + jump + 1.72 * (1 - Math.cos(angle)),
        home.z - 1.72 * Math.sin(angle),
      );
      host.scale.y = 1.23;
      host.userData.legs.forEach((l) => (l.rotation.x = -0.45 * Math.sin(p * Math.PI)));
      host.userData.arms.forEach((a) => (a.rotation.x = -0.35 * Math.sin(p * Math.PI)));
    });
    host.rotation.x = 0;
    host.position.copy(home);
    host.userData.legs.forEach((l) => (l.rotation.x = 0));
    host.userData.arms.forEach((a) => (a.rotation.x = 0));
    await tween(240, (p) => {
      host.scale.y = 1.23 * (1 - 0.1 * Math.sin(p * Math.PI));
    });
    await sleep(160);
  }

  $('#scene-curtain').classList.add('visible');
  await sleep(reduced ? 100 : 220);
  bonusView = true;
  studio.visible = false;
  boardWorld.visible = true;
  document.body.classList.add('bonus');
  host.position.copy(home);
  host.rotation.set(0, -0.3, 0);
  host.scale.setScalar(1.23);
  host.userData.legs.forEach((l) => (l.rotation.x = 0));
  host.userData.arms.forEach((a) => (a.rotation.x = 0));
  hostActing = false;
  const start = tilePositions[0];
  token.visible = true;
  token.position.copy(start).add(new THREE.Vector3(0, 1.7, 0));
  token.rotation.x = 0;
  camPos.set(3.5, 4.8, 7.2);
  camLook.copy(start).add(new THREE.Vector3(0, 0.9, 0));
  camera.position.copy(camPos);
  currentLook.copy(camLook);
  await sleep(130);
  $('#scene-curtain').classList.remove('visible');
  document.body.classList.remove('bonus-transition');
  $('#bonus-hud').hidden = false;
  await tween(reduced ? 100 : 650, (p) => {
    token.position.y = start.y + 1.7 * (1 - p * p);
    token.userData.arms.forEach((a) => (a.rotation.x = -0.32 * (1 - p)));
  });
  token.position.copy(start);
  if (!reduced) {
    await tween(180, (p) => {
      token.scale.y = 0.46 * (1 - 0.16 * Math.sin((p * Math.PI) / 2));
    });
    await tween(460, (p) => {
      token.scale.y = 0.46 * (0.84 + 0.16 * easeMove(Math.min(1, p * 3)));
      token.position.y = start.y + 0.28 * Math.sin(p * Math.PI);
    });
  }
  token.position.copy(start);
  token.scale.setScalar(0.46);
  token.userData.arms.forEach((a) => (a.rotation.x = 0));
  chime();
  await sleep(350);
  await cityOverview(1000);
  if (!reduced) {
    const mobile = innerWidth < 700,
      r = mobile ? 27 : 15.5,
      height = mobile ? 24 : 13;
    const names = ['SOUTH PROMENADE', 'WEST QUARTER', 'NORTH GARDENS', 'EAST AVENUE'];
    for (let side = 0; side < 4; side++) {
      const angle = 0.62 - (side * Math.PI) / 2;
      $('#bonus-message').textContent = 'DISCOVER YOUR MULTIPLIERS';
      $('#district-preview').hidden = true;
      $('#district-name').textContent = names[side];
      $('#district-values').innerHTML = Array.from({ length: 10 }, (_, j) => {
        const i = side * 10 + j;
        const v =
          i === 0
            ? 'START +5×'
            : i === 10
              ? 'JAIL'
              : i === 20
                ? 'PARK +20×'
                : i === 30
                  ? 'CHANCE ?'
                  : tileValues[i] + '×';
        return '<span>' + v + '</span>';
      }).join('');
      await shot(
        new THREE.Vector3(Math.sin(angle) * r, height, Math.cos(angle) * r),
        new THREE.Vector3(0, 0.5, 0),
        1350,
      );
      await sleep(750);
    }
    $('#district-preview').hidden = true;
  }

  await tourMultipliers();
}
async function tourMultipliers() {
  if (reduced) return cityOverview(650);
  touring = true;
  const route = new THREE.CatmullRomCurve3(
    tilePositions.map((p) => p.clone()),
    true,
    'centripetal',
  );
  const frame = (progress) => {
    const point = route.getPointAt(progress % 1);
    const ahead = route.getPointAt((progress + 0.047) % 1);
    const inward = new THREE.Vector3(-point.x, 0, -point.z).normalize();
    return {
      position: point
        .clone()
        .addScaledVector(inward, 1.25)
        .add(new THREE.Vector3(0, innerWidth < 700 ? 3.1 : 2.5, 0)),
      look: ahead.clone().add(new THREE.Vector3(0, 0.08, 0)),
    };
  };
  const start = frame(0);
  await shot(start.position, start.look, 1300);
  await tween(SETTINGS.cityTourSeconds * 1000, (p) => {
    const view = frame(easeMove(p));
    camPos.copy(view.position);
    camLook.copy(view.look);
  });
  const point = tilePositions[0];
  await shot(
    point.clone().add(new THREE.Vector3(-2.8, 3.2, -2.8)),
    point.clone().add(new THREE.Vector3(0, 0.7, 0)),
    1200,
  );
  await sleep(850);
  touring = false;
}
async function walk(steps) {
  landingView = false;
  document.body.classList.add('camera-close', 'follow-view');
  $('#bonus-message').textContent = 'ON THE MOVE';
  token.visible = true;
  const heading = tilePositions[(tileIndex + 1) % 40].clone().sub(token.position);
  heading.y = 0;
  heading.normalize();
  const follow = () => {
    camPos
      .copy(token.position)
      .addScaledVector(heading, -2.25)
      .add(new THREE.Vector3(heading.z * 0.35, 1.95, -heading.x * 0.35));
    camLook
      .copy(token.position)
      .add(new THREE.Vector3(0, 0.73, 0))
      .addScaledVector(heading, 0.65);
  };
  if (!reduced) {
    follow();
    await shot(camPos.clone(), camLook.clone(), 850);
  }
  walking = true;
  following = !reduced;
  for (let i = 0; i < steps; i++) {
    const from = token.position.clone();
    tileIndex = (tileIndex + 1) % 40;
    const to = tilePositions[tileIndex].clone(),
      direction = to.clone().sub(from);
    direction.y = 0;
    direction.normalize();
    const oldHeading = heading.clone();
    await tween(reduced ? 100 : 570, (p) => {
      token.position.lerpVectors(from, to, p);
      heading.lerpVectors(oldHeading, direction, easeMove(Math.min(1, p * 2))).normalize();
      token.rotation.y = Math.atan2(heading.x, heading.z);
      if (!reduced) follow();
    });
    tone(380 + tileIndex * 9, 0.035, 'sine', 0.025);
  }
  walking = false;
  following = false;
  landingView = true;
  document.body.classList.remove('camera-close', 'follow-view');
  const tileCenter = tilePositions[tileIndex].clone(),
    outside = new THREE.Vector3(tileCenter.x, 0, tileCenter.z).normalize(),
    from = token.position.clone();
  await tween(reduced ? 80 : 250, (p) =>
    token.position.lerpVectors(
      from,
      tileCenter.clone().addScaledVector(outside, 0.38),
      easeMove(p),
    ),
  );
  token.rotation.y = Math.atan2(-outside.x, -outside.z);
  const cameraOffset = outside
    .clone()
    .multiplyScalar(-2.7)
    .add(new THREE.Vector3(0.35, 3.15, 0.2));
  const landingLook = tileCenter.clone().add(new THREE.Vector3(0, 0.15, 0));
  if (innerWidth < 700) {
    cameraOffset.multiplyScalar(1.3);
    const right = new THREE.Vector3(cameraOffset.z, 0, -cameraOffset.x).normalize();
    landingLook.addScaledVector(right, 0.28);
  }
  await shot(tileCenter.clone().add(cameraOffset), landingLook, 850);
}
const dieNormals = {
  1: [0, 0, 1],
  2: [1, 0, 0],
  3: [0, 1, 0],
  4: [0, -1, 0],
  5: [-1, 0, 0],
  6: [0, 0, -1],
};
async function throwDice(a, b) {
  document.body.classList.add('camera-close');
  $('#bonus-message').textContent = 'LET THE DICE DECIDE';
  await shot(new THREE.Vector3(0, 4.9, 2.65), new THREE.Vector3(0, 0.88, -0.35), 1000);
  dice.forEach((d) => (d.visible = true));
  tone(180, 0.3, 'triangle', 0.08);
  const faces = [a, b].map((n) =>
    new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(...dieNormals[n]),
      new THREE.Vector3(0, 1, 0),
    ),
  );
  await tween(reduced ? 250 : 1300, (p) => {
    dice.forEach((d, i) => {
      d.position.set(
        i ? 0.72 : -0.72,
        1.165 + Math.abs(Math.cos(p * Math.PI * 3.5)) * (1 - p) * 1.9,
        -0.35 + (i ? 0.12 : -0.12),
      );
      d.rotation.set(p * 16 + i, p * 21, p * 14);
      if (p > 0.72) d.quaternion.slerp(faces[i], easeMove((p - 0.72) / 0.28));
    });
  });
  dice.forEach((d, i) => {
    d.quaternion.copy(faces[i]);
    d.position.y = 1.165;
  });
  $('#bonus-message').textContent = a === b ? 'DOUBLES · EXTRA ROLL' : 'YOUR ROUTE IS SET';
  await sleep(reduced ? 700 : 1700);
  await cityOverview(1000);
  dice.forEach((d) => (d.visible = false));
  document.body.classList.remove('camera-close');
  await sleep(350);
}
async function runBonus(rollCount, stake, demo) {
  clearInterval(countdownTimer);
  bettingWindow.close();
  wheelCloseup = false;
  document.body.classList.remove('wheel-closeup');
  state = 'bonus';
  update();
  tileIndex = 0;
  jailAttempts = 0;
  token.position.copy(tilePositions[0]);
  token.rotation.y = -Math.PI / 2;
  let left = rollCount,
    total = 0,
    inJail = false;
  countMoney($('#bonus-total'), 0, 0);
  $('.stake small').textContent = 'BONUS BET';
  $('#stake').textContent = money(stake);
  $('#rolls-left').textContent = left;
  $('#bonus-message').textContent = demo
    ? 'CITY PREVIEW'
    : stake
      ? 'Collect your city multipliers'
      : 'WATCHING THE CITY BONUS';
  await enterBonusCity();
  while (left > 0) {
    $('#rolls-left').textContent = left;
    const a = randomInt(6) + 1,
      b = randomInt(6) + 1;
    await throwDice(a, b);
    left--;
    let moved = true;
    const wasJailed = inJail;
    if (inJail) {
      jailAttempts++;
      if (a === b || jailAttempts >= 3) {
        inJail = false;
        jailAttempts = 0;
        $('#bonus-message').textContent = 'BACK IN THE CITY';
      } else {
        moved = false;
        $('#bonus-message').textContent = 'IN JAIL · ROLL DOUBLES';
      }
    }
    if (a === b && !wasJailed) {
      left++;
      $('#bonus-message').textContent = 'DOUBLES · EXTRA ROLL';
      chime();
    }
    $('#rolls-left').textContent = left;
    if (moved) {
      await walk(a + b);
      let gain = 0;
      if (tileIndex === 10) {
        inJail = true;
        jailAttempts = 0;
        $('#bonus-message').textContent = 'JAIL · TRY FOR DOUBLES';
      } else if (tileIndex === 0) {
        gain = 5;
        $('#bonus-message').textContent = 'START · +5×';
      } else if (tileIndex === 20) {
        gain = 20;
        $('#bonus-message').textContent = 'PARK · +20×';
      } else if (tileIndex === 30) {
        gain = [5, 10, 15, 25][randomInt(4)];
        $('#bonus-message').textContent = 'CITY CHANCE · +' + gain + '×';
      } else {
        gain = tileValues[tileIndex];
        $('#bonus-message').textContent = 'PROPERTY · +' + gain + '×';
      }
      total += gain * multiplier;
      const tile = tiles[tileIndex];
      tile.material.emissive.set('#d3a447');
      tile.material.emissiveIntensity = 0.9;
      countMoney($('#bonus-total'), stake * total);
      $('#rolls-left').textContent = left;
      tone(660, 0.3);
      await showProperty(tile, gain * multiplier, stake);
      tile.material.emissiveIntensity = 0;
    } else {
      await walk(0);
      await showProperty(tiles[tileIndex], 0, stake);
    }
    $('#rolls-left').textContent = left;
    await sleep(500);
  }
  await cityOverview(950);
  await bonusCelebration(bonusPayout(stake, total), total, demo);
  clearRoundBets();
  $('#scene-curtain').classList.add('visible');
  await sleep(500);
  cinematicActive = false;
  bonusView = false;
  boardWorld.visible = false;
  studio.visible = true;
  document.body.classList.remove('bonus');
  $('.stake small').textContent = 'TOTAL BET';
  $('#bonus-hud').hidden = true;
  targets();
  camera.position.copy(camPos);
  currentLook.copy(camLook);
  $('#scene-curtain').classList.remove('visible');
  await sleep(600);
  if (demo) {
    $('#clock-label').textContent = 'PLACE YOUR BETS';
    startBetting();
    return;
  }
  await finish(
    bonusPayout(stake, total),
    stake ? 'City bonus, including your winning stake' : 'Spectator',
    true,
  );
}
async function bonusCelebration(amount, total, demo) {
  countMoney($('#bonus-total'), amount);
  fireworks.start('city', 7);
  chime();
  try {
    await showAward(amount, true);
  } finally {
    fireworks.stop();
  }
}

const moneyAnimations = new WeakMap();
function countMoney(element, target, from = Number(element.dataset.amount || 0), duration = 1100) {
  cancelAnimationFrame(moneyAnimations.get(element));
  const start = performance.now();
  const paint = (value) => {
    element.dataset.amount = String(value);
    element.textContent = money(value);
  };
  if (reduced || from === target) {
    paint(target);
    return;
  }
  paint(from);
  const frame = (now) => {
    const progress = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    paint(progress === 1 ? target : Math.round(from + (target - from) * eased));
    if (progress < 1) moneyAnimations.set(element, requestAnimationFrame(frame));
    else moneyAnimations.delete(element);
  };
  moneyAnimations.set(element, requestAnimationFrame(frame));
}
function money(value) {
  return '$' + value.toLocaleString('en-US', { maximumFractionDigits: 2 });
}
async function showProperty(tile, value, stake) {
  const card = $('#property-card');
  $('#property-name').textContent = tile.userData.name;
  card.style.setProperty('--property-color', tile.userData.color);
  $('#property-multiplier').textContent = value + '×';
  $('#property-chip').textContent = chipLabel(stake);
  $('#property-chip').title = money(stake);
  $('#property-chip').style.backgroundColor =
    stake >= 500 ? '#765392' : stake >= 100 ? '#343c43' : stake >= 50 ? '#447ca3' : '#15914e';
  countMoney($('#property-amount'), stake * value, 0);
  card.hidden = false;
  await sleep(SETTINGS.propertyCardSeconds * 1000);
  card.hidden = true;
}
async function showAward(amount, bonus, result = '') {
  const award = $('#award');
  award.classList.toggle('city-award', bonus);
  award.style.removeProperty('--award-bottom');
  award.dataset.result = result;
  $('#award-result').textContent = result;
  $('#award-title').textContent = bonus ? 'BONUS WIN' : 'YOU WIN';
  countMoney($('#award-amount'), amount, 0, 1800);
  award.hidden = false;
  positionStudioAward();
  await sleep(SETTINGS.winDisplaySeconds * 1000);
  award.hidden = true;
}
function positionStudioAward() {
  const award = $('#award');
  if (award.hidden || award.classList.contains('city-award')) return;
  const table = $('.bet-row').getBoundingClientRect();
  const game = $('#game').getBoundingClientRect();
  award.style.setProperty('--award-bottom', `${game.bottom - table.top + 12}px`);
}

initSocial({
  setVolume(value) {
    muted = value === 0;
    if (!audioCtx && muted) return;
    try {
      audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
      if (!audioOutput) {
        audioOutput = audioCtx.createGain();
        audioOutput.gain.value = 0;
        audioOutput.connect(audioCtx.destination);
      }
      if (!muted) audioCtx.resume().catch(() => {});
      audioOutput.gain.setTargetAtTime(value, audioCtx.currentTime, 0.04);
      music ??= createMusic(audioCtx, () => bonusView, audioOutput);
      music.setEnabled(!muted);
    } catch {
      toast('Sound is unavailable in this browser.');
    }
  },
});
// Browsers may wait for a user gesture before allowing audio playback.
function resumeGameAudio() {
  if (!muted && audioCtx && audioCtx.state !== 'running') {
    audioCtx.resume().catch(() => {});
  }
}
document.addEventListener('pointerdown', resumeGameAudio, { passive: true });
document.addEventListener('keydown', resumeGameAudio);

$('#refill').textContent = 'REFILL ' + SETTINGS.refillCoins.toLocaleString('en-US');
$$('[data-betting-seconds]').forEach((el) => (el.textContent = SETTINGS.bettingSeconds));
update();
guest.ready
  .then(() =>
    setTimeout(() => {
      $('#loading').style.opacity = 0;
      setTimeout(() => {
        $('#loading').remove();
        startBetting();
      }, 650);
    }, 550),
  )
  .catch(() => {
    $('#loading').innerHTML =
      '<h2>Unable to start the studio</h2><p>Please refresh to try again.</p>';
  });
