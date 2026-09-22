import * as THREE from '../../vendor/three.module.min.js';
const palette = ['#e3b958', '#bd8acb', '#e87965', '#67b4cf', '#73b49d', '#efe0ad', '#b7c4dc'];
const stone = new THREE.MeshStandardMaterial({ color: '#f5e7ca', roughness: 0.65 });
const trim = new THREE.MeshStandardMaterial({ color: '#e5c072', metalness: 0.35, roughness: 0.4 });
const pavement = new THREE.MeshStandardMaterial({ color: '#bcac91', roughness: 0.8 });
const glass = new THREE.MeshStandardMaterial({ color: '#5b98ae', metalness: 0.3, roughness: 0.3 });
const cube = new THREE.BoxGeometry(1, 1, 1);
function block(p, x, y, z, w, h, d, mat) {
  const m = new THREE.Mesh(cube, mat);
  m.position.set(x, y, z);
  m.scale.set(w, h, d);
  m.castShadow = true;
  m.receiveShadow = true;
  p.add(m);
  return m;
}
function texture(paint, w = 256, h = 512) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const facade = texture((c, w, h) => {
  c.fillStyle = '#f5eddb';
  c.fillRect(0, 0, w, h);
  for (let y = 18; y < h - 10; y += 38)
    for (let x = 15; x < w - 8; x += 37) {
      c.fillStyle = '#b7a48c';
      c.fillRect(x - 2, y - 2, 24, 30);
      const g = c.createLinearGradient(x, y, x + 20, y + 27);
      g.addColorStop(0, '#38667e');
      g.addColorStop(0.5, '#82b7c7');
      g.addColorStop(1, '#365b78');
      c.fillStyle = g;
      c.fillRect(x, y, 20, 25);
      c.fillStyle = '#dfdccb';
      c.fillRect(x + 9, y, 2, 25);
    }
});
const facades = palette.map(
  (color) =>
    new THREE.MeshStandardMaterial({ color, map: facade, roughness: 0.55, metalness: 0.08 }),
);
export function building(parent, x, z, height, index, scale = 1) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.scale.setScalar(scale);
  parent.add(g);
  const mat = facades[index % facades.length],
    w = 1.05 + (index % 3) * 0.2,
    d = 1.0 + (index % 2) * 0.25;
  block(g, 0, 0.13, 0, w + 0.4, 0.26, d + 0.4, pavement);
  block(g, 0, 0.65, 0, w + 0.16, 1.05, d + 0.16, mat);
  block(g, 0, 0.96, 0, w + 0.24, 0.1, d + 0.24, trim);
  const type = index % 4;
  if (type === 0) {
    for (let i = 0; i < 3; i++) {
      const k = 1 - i * 0.18,
        h = height * (0.5 - i * 0.08);
      const y = 1 + height * (i === 0 ? 0 : i === 1 ? 0.5 : 0.82) + h / 2;
      block(g, 0, y, 0, w * k, h, d * k, mat);
      block(g, 0, y + h / 2, 0, w * k + 0.1, 0.09, d * k + 0.1, trim);
    }
    block(g, 0, 1 + height * 1.04, 0, 0.055, 0.65, 0.055, trim);
  } else if (type === 1) {
    block(g, 0, 1 + height / 2, 0, w, height, d, mat);
    for (const side of [-1, 1]) {
      block(g, side * (w / 2 + 0.025), 1 + height / 2, 0.0, 0.085, height + 0.2, d + 0.08, trim);
      for (const bay of [-0.32, 0, 0.32])
        block(g, bay * w, 1 + height / 2, side * (d / 2 + 0.025), 0.045, height + 0.2, 0.065, trim);
    }
    block(g, 0, 1 + height + 0.13, 0, w * 0.75, 0.26, d * 0.75, stone);
    block(g, 0, 1 + height + 0.4, 0, w * 0.45, 0.28, d * 0.45, trim);
  } else if (type === 2) {
    block(g, 0, 1 + height / 2, 0, w, height, d, mat);
    for (let i = 1; i <= 3; i++)
      block(g, 0, 1 + (height * i) / 3, 0, w + 0.12, 0.06, d + 0.12, stone);
    block(g, 0, 1 + height + 0.12, 0, w + 0.2, 0.18, d + 0.2, trim);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(w * 0.37, 16, 10), trim);
    dome.position.set(0, 1 + height + 0.22, 0);
    dome.scale.y = 0.55;
    g.add(dome);
  } else {
    block(g, 0, 1 + height / 2, 0, w, height, d, mat);
    block(g, 0, 1 + height + 0.11, 0, w + 0.13, 0.15, d + 0.13, stone);
    for (const side of [-1, 1])
      block(g, side * w * 0.43, 1 + height / 2, d * 0.52, 0.09, height + 0.25, 0.1, stone);
    block(g, 0, 1 + height + 0.4, 0, 0.3, 0.55, 0.3, trim);
  }
  // Recessed storefronts, pilasters and cornices add depth rather than flat colored slabs.
  for (const side of [-1, 1]) {
    block(g, side * w * 0.34, 0.5, d / 2 + 0.12, w * 0.22, 0.52, 0.06, glass);
    block(g, side * w * 0.47, 0.54, d / 2 + 0.15, 0.045, 0.74, 0.11, stone);
  }
  if (index % 3 === 0) {
    for (let level = 0; level < 3; level++) {
      const y = 1.35 + level * height * 0.22;
      block(g, 0, y, d * 0.55, w * 0.72, 0.055, 0.23, stone);
      block(g, 0, y + 0.13, d * 0.65, w * 0.72, 0.035, 0.025, trim);
    }
  }
  if (index % 4 === 3) {
    block(
      g,
      0,
      1 + height + 0.24,
      0,
      w * 0.8,
      0.12,
      d * 0.75,
      new THREE.MeshStandardMaterial({ color: '#588653', roughness: 1 }),
    );
  }
  block(g, 0, 0.5, d / 2 + 0.12, 0.32, 0.65, 0.05, glass);
  for (const side of [-1, 1]) block(g, side * 0.32, 0.47, d / 2 + 0.15, 0.075, 0.8, 0.08, stone);
  block(g, 0, 0.93, d / 2 + 0.22, 0.87, 0.1, 0.3, trim);
  g.traverse((o) => {
    if (o.isMesh) {
      o.receiveShadow = false;
    }
  });
  return g;
}
export function createSkyDetails(parent) {
  const balloonGroups = [];
  for (let i = 0; i < 5; i++) {
    const g = new THREE.Group();
    g.position.set(-14 + i * 7, 11 + (i % 3) * 2, -20 - (i % 2) * 7);
    parent.add(g);
    const r = 0.8 + (i % 2) * 0.3;
    for (let stripe = 0; stripe < 10; stripe++) {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(r, 8, 14, (stripe * Math.PI) / 5, Math.PI / 5),
        new THREE.MeshStandardMaterial({
          color: stripe % 2 ? '#f7ce64' : ['#4d9cd4', '#d9886a', '#927db7'][i % 3],
          roughness: 0.75,
        }),
      );
      m.scale.y = 1.25;
      g.add(m);
    }
    block(g, 0, -r * 1.4, 0, 0.35, 0.24, 0.28, trim);
    for (const x of [-0.14, 0.14]) block(g, x, -r * 1.15, 0, 0.015, 0.48, 0.015, stone);
    balloonGroups.push(g);
  }
  return balloonGroups;
}
export function buildBonusCity(parent, tileValues) {
  block(
    parent,
    0,
    -0.31,
    0,
    43,
    0.4,
    43,
    new THREE.MeshStandardMaterial({ color: '#a9b4ab', roughness: 0.9 }),
  );
  block(
    parent,
    0,
    -0.06,
    0,
    15,
    0.1,
    15,
    new THREE.MeshStandardMaterial({ color: '#716e69', roughness: 1 }),
  );
  block(parent, 0, 0.05, 0, 12.95, 0.3, 12.95, stone);
  block(parent, 0, 0.24, 0, 12.8, 0.1, 12.8, trim);
  const green = new THREE.MeshStandardMaterial({ color: '#70a74c', roughness: 1 }),
    leaf = new THREE.MeshStandardMaterial({ color: '#4f934c', roughness: 1 }),
    leafLight = new THREE.MeshStandardMaterial({ color: '#85b950', roughness: 1 }),
    bark = new THREE.MeshStandardMaterial({ color: '#987352', roughness: 1 });
  block(parent, 0, 0.31, 0, 10.2, 0.12, 10.2, green);
  // Four garden quarters, pale promenades, hedges, flowerbeds and a blue lagoon.
  for (const x of [-2.4, 2.4]) block(parent, x, 0.39, 0, 0.46, 0.05, 9.8, stone);
  for (const z of [-2.4, 2.4]) block(parent, 0, 0.39, z, 9.8, 0.05, 0.46, stone);
  const pond = new THREE.Mesh(
    new THREE.CircleGeometry(1.6, 64),
    new THREE.MeshStandardMaterial({ color: '#36b7d5', metalness: 0.35, roughness: 0.18 }),
  );
  pond.rotation.x = -Math.PI / 2;
  pond.scale.y = 0.68;
  pond.position.set(-1, 0.43, 2.8);
  parent.add(pond);
  const poolRim = new THREE.Mesh(new THREE.TorusGeometry(1.63, 0.065, 8, 64), stone);
  poolRim.rotation.x = -Math.PI / 2;
  poolRim.scale.y = 0.68;
  poolRim.position.copy(pond.position);
  parent.add(poolRim);
  const fountain = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.52, 0.2, 32), stone);
  fountain.position.set(-1, 0.56, 2.8);
  parent.add(fountain);
  const spray = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.014, 6, 24),
    new THREE.MeshStandardMaterial({
      color: '#ddfaff',
      emissive: '#9ddfeb',
      emissiveIntensity: 0.35,
    }),
  );
  spray.position.set(-1, 1.05, 2.8);
  spray.rotation.x = Math.PI / 2;
  parent.add(spray);
  block(parent, -1, 0.77, 2.8, 0.065, 0.5, 0.065, trim);
  const treeGeo = new THREE.IcosahedronGeometry(0.32, 1);
  for (let i = 0; i < 44; i++) {
    const side = i % 4,
      j = Math.floor(i / 4),
      v = -4 + j * 0.8;
    let x, z;
    if (side === 0) {
      x = v;
      z = -4.35;
    } else if (side === 1) {
      x = 4.35;
      z = v;
    } else if (side === 2) {
      x = v;
      z = 4.35;
    } else {
      x = -4.35;
      z = v;
    }
    block(parent, x, 0.63, z, 0.07, 0.5, 0.07, bark);
    const crown = new THREE.Mesh(treeGeo, i % 2 ? leaf : leafLight);
    crown.position.set(x, 1, z);
    crown.scale.set(1, 1.4, 1);
    crown.castShadow = true;
    parent.add(crown);
  }
  for (let i = 0; i < 18; i++) {
    const x = ((i % 6) - 2.5) * 1.3,
      z = i < 6 ? -3.5 : i < 12 ? 3.55 : 1.6;
    if (Math.abs(x + 1) < 1.6 && z > 2) continue;
    block(parent, x, 0.44, z, 0.75, 0.1, 0.28, stone);
    block(
      parent,
      x,
      0.52,
      z,
      0.64,
      0.12,
      0.2,
      new THREE.MeshStandardMaterial({
        color: ['#df78a9', '#f5c54c', '#e48855'][i % 3],
        roughness: 0.9,
      }),
    );
  }
  for (const x of [-3.35, 3.35])
    for (const z of [-1.6, 1.6]) {
      block(parent, x, 0.63, z, 0.75, 0.1, 0.3, bark);
      block(parent, x, 0.86, z - 0.15, 0.75, 0.34, 0.06, bark);
      for (const leg of [-0.27, 0.27]) block(parent, x + leg, 0.48, z, 0.05, 0.26, 0.25, trim);
    }
  // A low pavilion and the dedicated dice table keep the park's centre open.
  for (const x of [-0.9, 0.9])
    for (const z of [-0.75, 0.75]) block(parent, x, 0.82, z - 3.1, 0.07, 0.8, 0.07, stone);
  block(parent, 0, 1.26, -3.1, 2.2, 0.13, 1.8, trim);
  block(parent, 0, 1.37, -3.1, 1.8, 0.12, 1.4, stone);
  const felt = new THREE.MeshStandardMaterial({ color: '#2e7d79', roughness: 0.9 });
  block(parent, 0, 0.63, -0.35, 3.35, 0.35, 2.25, trim);
  block(parent, 0, 0.825, -0.35, 3.15, 0.05, 2.05, felt);
  // Frontage faces the board; tall silhouettes stand behind the colorful district buildings.
  for (let side = 0; side < 4; side++)
    for (let j = 0; j < 9; j++) {
      const along = (j - 4) * 1.8,
        edge = 8.0;
      const x = side === 0 ? along : side === 1 ? edge : side === 2 ? -along : -edge,
        z = side === 0 ? -edge : side === 1 ? along : side === 2 ? edge : -along;
      const g = building(parent, x, z, 1.2 + ((j * 7 + side) % 5) * 0.46, j + side * 9, 0.94);
      g.rotation.y = [0, -Math.PI / 2, Math.PI, Math.PI / 2][side];
    }
  for (let side = 0; side < 4; side++)
    for (let j = 0; j < 10; j++) {
      const along = (j - 4.5) * 2.4,
        edge = 13.5;
      const x = side % 2 === 0 ? along : side === 1 ? edge : -edge,
        z = side % 2 === 0 ? (side === 0 ? -edge : edge) : along;
      building(parent, x, z, 3 + ((j * 3 + side) % 7), j + side * 13, 0.95);
    }
  // Street markings, lamps and miniature cars.
  for (let i = -5; i <= 5; i++) {
    block(parent, i * 1.15, 0.02, 6.9, 0.5, 0.015, 0.045, stone);
    block(parent, i * 1.15, 0.02, -6.9, 0.5, 0.015, 0.045, stone);
  }
  for (let i = 0; i < 12; i++) {
    const x = -5.9 + (i % 6) * 2.35,
      z = i < 6 ? -6.4 : 6.4;
    block(parent, x, 0.72, z, 0.028, 1.35, 0.028, trim);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), stone);
    lamp.position.set(x, 1.42, z);
    parent.add(lamp);
  }
  for (let i = 0; i < 8; i++) {
    const car = new THREE.Group();
    car.position.set(((i % 4) - 1.5) * 3, 0, i < 4 ? -7.1 : 7.1);
    parent.add(car);
    block(car, 0, 0.19, 0, 0.7, 0.22, 0.32, facades[i % 7]);
    block(car, 0, 0.36, 0, 0.37, 0.17, 0.28, glass);
    for (const x of [-0.23, 0.23])
      for (const z of [-0.17, 0.17]) {
        const wheel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.09, 0.09, 0.06, 10),
          new THREE.MeshStandardMaterial({ color: '#34464b' }),
        );
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(x, 0.13, z);
        car.add(wheel);
      }
  }
  const tiles = [],
    tilePositions = [],
    labels = [];
  const districtColors = [
    '#65b5d5',
    '#af7acc',
    '#e67d77',
    '#e6b953',
    '#76b69b',
    '#68a3ce',
    '#ca93b5',
    '#edb86a',
  ];
  const boardNames = [
    'GO',
    'OLD KENT ROAD',
    'COMMUNITY CHEST',
    'WHITECHAPEL ROAD',
    'INCOME TAX',
    'KING’S CROSS STATION',
    'THE ANGEL ISLINGTON',
    'CHANCE',
    'EUSTON ROAD',
    'PENTONVILLE ROAD',
    'JAIL',
    'PALL MALL',
    'ELECTRIC COMPANY',
    'WHITEHALL',
    'NORTHUMBERLAND AVENUE',
    'MARYLEBONE STATION',
    'BOW STREET',
    'COMMUNITY CHEST',
    'MARLBOROUGH STREET',
    'VINE STREET',
    'FREE PARKING',
    'STRAND',
    'CHANCE',
    'FLEET STREET',
    'TRAFALGAR SQUARE',
    'FENCHURCH ST. STATION',
    'LEICESTER SQUARE',
    'COVENTRY STREET',
    'WATER WORKS',
    'PICCADILLY',
    'CHANCE',
    'REGENT STREET',
    'OXFORD STREET',
    'COMMUNITY CHEST',
    'BOND STREET',
    'LIVERPOOL ST. STATION',
    'CHANCE',
    'PARK LANE',
    'SUPER TAX',
    'MAYFAIR',
  ];
  for (let i = 0; i < 40; i++) {
    let x, z;
    if (i < 10) {
      x = 5.5 - i * 1.1;
      z = 5.5;
    } else if (i < 20) {
      x = -5.5;
      z = 5.5 - (i - 10) * 1.1;
    } else if (i < 30) {
      x = -5.5 + (i - 20) * 1.1;
      z = -5.5;
    } else {
      x = 5.5;
      z = -5.5 + (i - 30) * 1.1;
    }
    tilePositions.push(new THREE.Vector3(x, 0.49, z));
    const special = i % 10 === 0;
    const name = boardNames[i];
    const value =
      i === 0 ? '5×' : i === 10 ? 'JAIL' : i === 20 ? '20×' : i === 30 ? '?' : tileValues[i] + '×';
    const tex = texture(
      (c, w, h) => {
        c.fillStyle = special ? '#ffe4a2' : '#fffbed';
        c.fillRect(0, 0, w, h);
        c.strokeStyle = '#8c9e95';
        c.lineWidth = 5;
        c.strokeRect(6, 6, w - 12, h - 12);
        c.fillStyle = districtColors[Math.floor(i / 5)];
        c.fillRect(9, 9, w - 18, 68);
        c.fillStyle = '#24434a';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.font = 'bold 30px Arial';
        const words = name.split(' ');
        const lines = [];
        let line = '';
        for (const word of words) {
          const next = line ? line + ' ' + word : word;
          if (line && c.measureText(next).width > w - 36) {
            lines.push(line);
            line = word;
          } else line = next;
        }
        lines.push(line);
        lines.forEach((text, row) => c.fillText(text, w / 2, 104 + row * 34));
        c.font = '22px Arial';
        c.fillText(special ? 'FORTUNE CITY' : 'BONUS MULTIPLIER', w / 2, 333);
      },
      384,
      384,
    );
    const mat = new THREE.MeshStandardMaterial({ color: '#fff9e9', roughness: 0.6 });
    const tile = block(parent, x, 0.39, z, 1.04, 0.14, 1.04, mat);
    tile.userData.name = name;
    tile.userData.color = districtColors[Math.floor(i / 5)];
    tiles.push(tile);
    const top = new THREE.Mesh(
      new THREE.PlaneGeometry(1.035, 1.035),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.65 }),
    );
    top.rotation.x = -Math.PI / 2;
    top.rotation.z = i < 10 ? 0 : i < 20 ? -Math.PI / 2 : i < 30 ? Math.PI : Math.PI / 2;
    top.position.set(x, 0.477, z);
    parent.add(top);
    labels.push(top);
    const valueTex = texture(
      (c, w, h) => {
        c.fillStyle = '#24434a';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.font = 'bold ' + (value === 'JAIL' ? 70 : 110) + 'px Arial';
        c.fillText(value, w / 2, h / 2);
      },
      384,
      150,
    );
    const valueMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.88, 0.35),
      new THREE.MeshBasicMaterial({
        map: valueTex,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
    );
    valueMesh.position.set(0, -0.115, 0.008);
    top.add(valueMesh);
    top.userData.valueMesh = valueMesh;
  }
  createSkyDetails(parent);
  return { tiles, tilePositions, labels };
}
