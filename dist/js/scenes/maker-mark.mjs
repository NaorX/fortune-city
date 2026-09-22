export function addMakerMark({ THREE, parent, gold, canvasTexture }) {
  const lettering = (context, width, height, color, offset = 0) => {
    context.font = '600 150px Arial, Helvetica, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = color;
    context.fillText('NaorX', width / 2, height * 0.75 + offset);
  };
  const finish = canvasTexture(1024, 1024, (context, width, height) => {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    lettering(context, width, height, '#fff4d9', 2);
    lettering(context, width, height, '#807052');
  });
  const recess = canvasTexture(1024, 1024, (context, width, height) => {
    context.fillStyle = '#fff';
    context.fillRect(0, 0, width, height);
    lettering(context, width, height, '#666');
  });
  recess.colorSpace = THREE.NoColorSpace;
  finish.anisotropy = recess.anisotropy = 4;
  const face = gold.clone();
  face.map = finish;
  face.bumpMap = recess;
  face.bumpScale = 0.003;
  face.roughness = 0.48;
  const edge = gold.clone();
  edge.roughness = 0.48;

  // One continuous support: the engraving belongs to its surface, not a second panel.
  const profile = new THREE.Shape();
  profile.moveTo(-0.64, 0.34);
  profile.lineTo(0.64, 0.34);
  profile.bezierCurveTo(0.52, 0.6, 0.18, 0.96, 0.18, 1.34);
  profile.lineTo(0.18, 1.88);
  profile.lineTo(-0.18, 1.88);
  profile.lineTo(-0.18, 1.34);
  profile.bezierCurveTo(-0.18, 0.96, -0.52, 0.6, -0.64, 0.34);
  profile.closePath();
  const geometry = new THREE.ExtrudeGeometry(profile, {
    depth: 0.4,
    steps: 1,
    curveSegments: 24,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.025,
    bevelSegments: 3,
    material: 0,
    extrudeMaterial: 1,
    UVGenerator: {
      generateTopUV: (_geometry, vertices, a, b, c) =>
        [a, b, c].map(
          (i) =>
            new THREE.Vector2((vertices[i * 3] + 0.7) / 1.4, (vertices[i * 3 + 1] - 0.3) / 1.6),
        ),
      generateSideWallUV: () => [
        new THREE.Vector2(),
        new THREE.Vector2(),
        new THREE.Vector2(),
        new THREE.Vector2(),
      ],
    },
  });
  const support = new THREE.Mesh(geometry, [face, edge]);
  support.name = 'Engraved wheel support';
  support.position.set(-0.25, 0, -0.44);
  support.castShadow = true;
  support.receiveShadow = true;
  parent.add(support);
}
