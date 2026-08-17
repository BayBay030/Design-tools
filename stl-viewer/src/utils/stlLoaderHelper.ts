import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

/**
 * Loads an STL file from an ArrayBuffer and converts it to a standard ThreeJS BufferGeometry
 */
export function parseStlArrayBuffer(buffer: ArrayBuffer): THREE.BufferGeometry {
  const loader = new STLLoader();
  const geometry = loader.parse(buffer);
  // STL files are authored Z-up (the CAD / slicer convention) while three.js renders Y-up.
  // Converting once here makes the model stand upright on screen and lets the bounding box
  // report width / height / depth the same way a slicer would.
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

/**
 * Reads a File object and loads it as a BufferGeometry asynchronously
 */
export function loadStlFile(file: File): Promise<THREE.BufferGeometry> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        if (!buffer) {
          reject(new Error('無法讀取檔案內容'));
          return;
        }
        
        const geometry = parseStlArrayBuffer(buffer);
        resolve(geometry);
      } catch (err) {
        reject(err instanceof Error ? err : new Error('解析 STL-3D 檔案時出錯，請確認格式是否正確'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('讀取檔案時出錯'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}
