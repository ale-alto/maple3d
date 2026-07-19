import * as THREE from 'three';

// Procedural 4-point throwing star (classic Subi silhouette). Tiny and
// fast-moving, so crisp geometry beats a downloaded model here.

let cachedGeo = null;

function starGeometry() {
  if (cachedGeo) return cachedGeo;
  const shape = new THREE.Shape();
  const points = 4;
  const outer = 1;
  const inner = 0.28;
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (points * 2)) * Math.PI * 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const hole = new THREE.Path();
  hole.absarc(0, 0, 0.12, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  cachedGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false });
  cachedGeo.center();
  return cachedGeo;
}

export function makeShuriken(radius = 0.2, color = 0xb8c4d4) {
  const mesh = new THREE.Mesh(
    starGeometry(),
    new THREE.MeshLambertMaterial({ color, transparent: true }),
  );
  mesh.scale.setScalar(radius);
  return mesh;
}
