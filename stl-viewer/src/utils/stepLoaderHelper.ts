import * as THREE from 'three';
// @ts-ignore
import occtimportjs from 'occt-import-js';

// Define structures matching occt-import-js return type
interface OccMesh {
  positions: number[];
  normals: number[];
  face_indices: number[];
  color?: number[];
  brep_face_id?: number;
}

interface OccResult {
  success: boolean;
  meshes: OccMesh[];
}

/**
 * Loads a STEP/STP file from an ArrayBuffer and converts it to a single ThreeJS BufferGeometry
 */
export function parseStepArrayBuffer(buffer: ArrayBuffer): Promise<THREE.BufferGeometry> {
  return new Promise((resolve, reject) => {
    // Vite / CommonJS fallback for occt-import-js
    let initFn = occtimportjs;
    if (typeof initFn !== 'function' && (initFn as any).default) {
      initFn = (initFn as any).default;
    }

    if (typeof initFn !== 'function') {
      reject(new Error('無法初始化 CAD 轉換器元件(occt-import-js)'));
      return;
    }

    // Initialize WebAssembly environment
    initFn({
      locateFile: (name: string) => `https://cdn.jsdelivr.net/npm/occt-import-js@0.0.23/dist/${name}`
    }).then((occt: any) => {
      try {
        const uint8Array = new Uint8Array(buffer);
        // occt has ReadStep(uint8Array) method
        const result: OccResult = occt.ReadStep(uint8Array);

        if (!result || !result.success) {
          reject(new Error('CAD 檔案結構解析失敗，請確認檔案格式是否正確。'));
          return;
        }

        if (!result.meshes || result.meshes.length === 0) {
          reject(new Error('CAD 檔案解析成功，但未發現任何有效的 3D 幾何實體。'));
          return;
        }

        // Merge all meshes into a single BufferGeometry
        const geometry = mergeOccMeshes(result.meshes);
        resolve(geometry);
      } catch (err) {
        reject(err instanceof Error ? err : new Error('解析 STEP 檔時發生未預期錯誤'));
      }
    }).catch((err: any) => {
      reject(new Error(`載入 CAD 解析模組 (WebGL/WASM) 失敗: ${err instanceof Error ? err.message : String(err)}`));
    });
  });
}

/**
 * Combines multiple meshes from step file into a single THREE.BufferGeometry
 */
export function mergeOccMeshes(meshes: OccMesh[]): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  
  const allPositions: number[] = [];
  const allNormals: number[] = [];
  const allIndices: number[] = [];
  
  let vertexOffset = 0;
  
  for (const occMesh of meshes) {
    const { positions, normals, face_indices } = occMesh;
    
    // Add positions
    for (let i = 0; i < positions.length; i++) {
      allPositions.push(positions[i]);
    }
    
    // Add normals
    if (normals && normals.length === positions.length) {
      for (let i = 0; i < normals.length; i++) {
        allNormals.push(normals[i]);
      }
    } else {
      for (let i = 0; i < positions.length; i++) {
        allNormals.push(0);
      }
    }
    
    // Add indices with offset
    for (let i = 0; i < face_indices.length; i++) {
      allIndices.push(face_indices[i] + vertexOffset);
    }
    
    vertexOffset += positions.length / 3;
  }
  
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(allPositions, 3));
  
  if (allNormals.some(n => n !== 0)) {
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(allNormals, 3));
  } else {
    geometry.computeVertexNormals();
  }
  
  geometry.setIndex(allIndices);
  geometry.center();
  // STEP/CAD data is Z-up just like STL; match the viewer's Y-up display space.
  geometry.rotateX(-Math.PI / 2);

  return geometry;
}

/**
 * Reads a File object and loads it as a BufferGeometry asynchronously
 */
export function loadStepFile(file: File): Promise<THREE.BufferGeometry> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        if (!buffer) {
          reject(new Error('無法讀取 CAD 檔案內容'));
          return;
        }
        
        const geometry = await parseStepArrayBuffer(buffer);
        resolve(geometry);
      } catch (err) {
        reject(err instanceof Error ? err : new Error('解析 STEP CAD 檔案時出錯'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('讀取 CAD 檔案時出錯'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}
