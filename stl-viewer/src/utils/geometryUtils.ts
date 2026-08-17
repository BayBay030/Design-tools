import * as THREE from 'three';
import { ModelStats } from '../types';

/**
 * Calculates physical statistics of any ThreeJS BufferGeometry
 */
export function calculateGeometryStats(
  geometry: THREE.BufferGeometry,
  fileName: string,
  fileSize: number
): ModelStats {
  // Ensure we have position attribute
  const positionAttribute = geometry.getAttribute('position');
  if (!positionAttribute) {
    return {
      name: fileName,
      size: fileSize,
      triangles: 0,
      width: 0,
      height: 0,
      depth: 0,
      volume: 0,
      surfaceArea: 0,
    };
  }

  // Calculate bounding box
  geometry.computeBoundingBox();
  const box = geometry.boundingBox || new THREE.Box3();
  const sizeVector = new THREE.Vector3();
  box.getSize(sizeVector);

  let trianglesCount = positionAttribute.count / 3;
  let totalArea = 0;
  let totalVolume = 0;

  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();

  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const cross = new THREE.Vector3();

  // If there's an index, compute indexed triangles; otherwise sequential
  const indexAttribute = geometry.getIndex();

  if (indexAttribute) {
    trianglesCount = indexAttribute.count / 3;
    for (let i = 0; i < indexAttribute.count; i += 3) {
      const idx0 = indexAttribute.getX(i);
      const idx1 = indexAttribute.getY(i);
      const idx2 = indexAttribute.getZ(i);

      vA.fromBufferAttribute(positionAttribute, idx0);
      vB.fromBufferAttribute(positionAttribute, idx1);
      vC.fromBufferAttribute(positionAttribute, idx2);

      // 1. Surface Area calculation
      ab.subVectors(vB, vA);
      ac.subVectors(vC, vA);
      cross.crossVectors(ab, ac);
      totalArea += cross.length() * 0.5;

      // 2. Signed Tetrahedron Volume calculation
      // Volume = (A . (B x C)) / 6
      // In coordinates: (Ax * (ByCz - BzCy) + Ay * (BzCx - BxCz) + Az * (BxCy - ByCx)) / 6
      const crossBCx = vB.y * vC.z - vB.z * vC.y;
      const crossBCy = vB.z * vC.x - vB.x * vC.z;
      const crossBCz = vB.x * vC.y - vB.y * vC.x;
      const tVol = (vA.x * crossBCx + vA.y * crossBCy + vA.z * crossBCz) / 6.0;
      totalVolume += tVol;
    }
  } else {
    for (let i = 0; i < positionAttribute.count; i += 3) {
      vA.fromBufferAttribute(positionAttribute, i);
      vB.fromBufferAttribute(positionAttribute, i + 1);
      vC.fromBufferAttribute(positionAttribute, i + 2);

      // 1. Surface Area
      ab.subVectors(vB, vA);
      ac.subVectors(vC, vA);
      cross.crossVectors(ab, ac);
      totalArea += cross.length() * 0.5;

      // 2. Volume
      const crossBCx = vB.y * vC.z - vB.z * vC.y;
      const crossBCy = vB.z * vC.x - vB.x * vC.z;
      const crossBCz = vB.x * vC.y - vB.y * vC.x;
      const tVol = (vA.x * crossBCx + vA.y * crossBCy + vA.z * crossBCz) / 6.0;
      totalVolume += tVol;
    }
  }

  // Volume might be negative depending on face orientations, take absolute value
  const absVolume = Math.abs(totalVolume);

  return {
    name: fileName,
    size: fileSize,
    triangles: Math.round(trianglesCount),
    width: Number(sizeVector.x.toFixed(2)),
    height: Number(sizeVector.y.toFixed(2)),
    depth: Number(sizeVector.z.toFixed(2)),
    volume: Number(absVolume.toFixed(2)),
    surfaceArea: Number(totalArea.toFixed(2)),
  };
}

/**
 * Creates built-in demo geometries directly to avoid requiring network assets.
 */
export function createDemoGeometry(type: string): THREE.BufferGeometry {
  switch (type) {
    case 'torusKnot':
      return new THREE.TorusKnotGeometry(10, 3, 120, 16, 2, 3);
    case 'box':
      return new THREE.BoxGeometry(14, 14, 14, 10, 10, 10);
    case 'cone':
      return new THREE.ConeGeometry(8, 20, 5, 10);
    case 'customHeart':
      return createHeartGeometry();
    default:
      return new THREE.TorusKnotGeometry(10, 3, 120, 16, 2, 3);
  }
}

/**
 * Procedurally draw a heart shape and extrude it into 3D!
 */
function createHeartGeometry(): THREE.BufferGeometry {
  const x = 0, y = 0;
  const heartShape = new THREE.Shape();
  
  // Custom drawn heart SVG-like path
  heartShape.moveTo( x + 5, y + 5 );
  heartShape.bezierCurveTo( x + 5, y + 5, x + 4, y + 9, x, y + 9 );
  heartShape.bezierCurveTo( x - 6, y + 9, x - 6, y + 3, x - 6, y + 3 );
  heartShape.bezierCurveTo( x - 6, y - 1, x - 3, y - 5.4, x + 5, y - 11 );
  heartShape.bezierCurveTo( x + 13, y - 5.4, x + 16, y - 1, x + 16, y + 3 );
  heartShape.bezierCurveTo( x + 16, y + 3, x + 16, y + 9, x + 10, y + 9 );
  heartShape.bezierCurveTo( x + 7, y + 9, x + 5, y + 5, x + 5, y + 5 );

  const extrudeSettings = {
    depth: 5,
    bevelEnabled: true,
    bevelSegments: 5,
    steps: 1,
    bevelSize: 1,
    bevelThickness: 1.5
  };

  const geometry = new THREE.ExtrudeGeometry(heartShape, extrudeSettings);
  // Center it neatly
  geometry.center();
  // Rotate slightly to sit beautifully in coordinates
  geometry.rotateX(Math.PI);
  return geometry;
}

/**
 * An export function that converts a THREE.BufferGeometry to an ASCII STL string.
 * This allows downloading any uploaded or demo geometry directly as an STL standard file!
 */
export function exportToStlAscii(geometry: THREE.BufferGeometry, name: string = 'model'): string {
  // The viewer works in three.js Y-up space, but STL files must be written Z-up so slicers
  // (CURA / PRUSA) open them standing upright. Rotate a copy so the on-screen model is untouched.
  const exportGeometry = geometry.clone();
  exportGeometry.rotateX(Math.PI / 2);

  const positionAttribute = exportGeometry.getAttribute('position');
  if (!positionAttribute) return '';

  let output = `solid ${name.replace(/\s+/g, '_')}\n`;

  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
  const normal = new THREE.Vector3();

  const cb = new THREE.Vector3();
  const ab = new THREE.Vector3();

  const indexAttribute = exportGeometry.getIndex();

  if (indexAttribute) {
    for (let i = 0; i < indexAttribute.count; i += 3) {
      const idx0 = indexAttribute.getX(i);
      const idx1 = indexAttribute.getY(i);
      const idx2 = indexAttribute.getZ(i);

      vA.fromBufferAttribute(positionAttribute, idx0);
      vB.fromBufferAttribute(positionAttribute, idx1);
      vC.fromBufferAttribute(positionAttribute, idx2);

      // Compute normal
      cb.subVectors(vC, vB);
      ab.subVectors(vA, vB);
      cb.cross(ab).normalize();

      output += `  facet normal ${cb.x} ${cb.y} ${cb.z}\n`;
      output += `    outer loop\n`;
      output += `      vertex ${vA.x} ${vA.y} ${vA.z}\n`;
      output += `      vertex ${vB.x} ${vB.y} ${vB.z}\n`;
      output += `      vertex ${vC.x} ${vC.y} ${vC.z}\n`;
      output += `    endloop\n`;
      output += `  endfacet\n`;
    }
  } else {
    for (let i = 0; i < positionAttribute.count; i += 3) {
      vA.fromBufferAttribute(positionAttribute, i);
      vB.fromBufferAttribute(positionAttribute, i + 1);
      vC.fromBufferAttribute(positionAttribute, i + 2);

      // Compute normal
      cb.subVectors(vC, vB);
      ab.subVectors(vA, vB);
      cb.cross(ab).normalize();

      output += `  facet normal ${cb.x} ${cb.y} ${cb.z}\n`;
      output += `    outer loop\n`;
      output += `      vertex ${vA.x} ${vA.y} ${vA.z}\n`;
      output += `      vertex ${vB.x} ${vB.y} ${vB.z}\n`;
      output += `      vertex ${vC.x} ${vC.y} ${vC.z}\n`;
      output += `    endloop\n`;
      output += `  endfacet\n`;
    }
  }

  output += `endsolid ${name.replace(/\s+/g, '_')}\n`;
  return output;
}
