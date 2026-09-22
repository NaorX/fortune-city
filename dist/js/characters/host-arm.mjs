export function createHostArm({
  THREE,
  host,
  studio,
  sleeve,
  handMaterial,
  ivory,
  cyl,
  sphere,
  wheelRoot,
}) {
  const gestureArm = new THREE.Group();
  studio.add(gestureArm);
  gestureArm.visible = false;
  host.userData.arms[0].visible = true;

  const upperGesture = cyl(0.14, 0.125, 1, sleeve, gestureArm);
  const elbowCover = sphere(0.126, sleeve, gestureArm);
  const lowerGesture = cyl(0.115, 0.1, 1, sleeve, gestureArm);
  const gestureCuff = sphere(0.125, ivory, gestureArm);
  const gestureHand = sphere(0.155, handMaterial, gestureArm);
  gestureHand.scale.set(0.83, 1, 0.67);
  gestureCuff.scale.set(1, 0.6, 1);
  const upAxis = new THREE.Vector3(0, 1, 0);
  function armBetween(part, a, b) {
    part.position.copy(a).add(b).multiplyScalar(0.5);
    const delta = b.clone().sub(a);
    part.scale.y = delta.length();
    part.quaternion.setFromUnitVectors(upAxis, delta.normalize());
  }

  function restingPalm() {
    host.updateMatrixWorld(true);
    return host.userData.arms[0].children[2].getWorldPosition(new THREE.Vector3());
  }
  function aimHand(end, grip = 1) {
    host.updateMatrixWorld(true);
    const shoulder = host.localToWorld(new THREE.Vector3(-0.41, 1.52, 0)),
      delta = end.clone().sub(shoulder),
      distance = delta.length(),
      direction = delta.clone().normalize();
    // Fixed upper-arm and forearm lengths, with a downward anatomical elbow pole.
    const upper = THREE.MathUtils.lerp(0.405, 0.53, grip),
      lower = THREE.MathUtils.lerp(0.385, 0.49, grip),
      length = Math.min(upper + lower - 0.005, Math.max(0.05, distance));
    const along = (upper * upper - lower * lower + length * length) / (2 * length);
    const wheelPole = new THREE.Vector3(-0.35, -1, 0.25).transformDirection(host.matrixWorld);
    const bend = new THREE.Vector3(0, 0, 1)
      .transformDirection(host.userData.arms[0].matrixWorld)
      .lerp(wheelPole, grip);
    bend.addScaledVector(direction, -bend.dot(direction)).normalize();
    const elbow = shoulder
      .clone()
      .addScaledVector(direction, along)
      .addScaledVector(bend, Math.sqrt(Math.max(0, upper * upper - along * along)));
    const wrist = shoulder.clone().addScaledVector(direction, length);
    armBetween(upperGesture, shoulder, elbow);
    armBetween(lowerGesture, elbow, wrist);
    elbowCover.position.copy(elbow);
    gestureHand.position.copy(wrist);
    gestureCuff.position.copy(wrist).lerp(elbow, 0.15);
    gestureCuff.quaternion.setFromUnitVectors(upAxis, wrist.clone().sub(elbow).normalize());
    // The palm stays on the wheel plane instead of corkscrewing with the forearm.
    const relaxed = host.userData.arms[0].getWorldQuaternion(new THREE.Quaternion()),
      wheelPalm = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
          0,
          0,
          Math.atan2(wrist.y - wheelRoot.position.y, wrist.x - wheelRoot.position.x),
        ),
      );
    gestureHand.quaternion.copy(relaxed).slerp(wheelPalm, grip);
  }

  return { gestureArm, gestureHand, aimHand, restingPalm };
}
