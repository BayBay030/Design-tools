import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RenderMode, MaterialColor, LightingPreset, MATERIAL_COLORS } from '../types';
import { Axis3d } from 'lucide-react';

interface ThreeViewerProps {
  geometry: THREE.BufferGeometry | null;
  renderMode: RenderMode;
  materialColor: MaterialColor | string;
  autoRotate: boolean;
  rotationSpeed: number;
  gridVisible: boolean;
  axesVisible: boolean;
  lightingPreset: LightingPreset;
  cameraAngle: 'front' | 'top' | 'side' | 'isometric' | null;
  onCameraAngleReset: () => void;
  canvasBg: 'dark' | 'blueprint' | 'light' | 'greenscreen';
  isRecording?: boolean;
  onRecordingComplete?: (blob: Blob) => void;
  onRecordingProgress?: (progress: number) => void;
  recordingProgress?: number;
  axisXOffset: number;
  axisYOffset: number;
  axisZOffset: number;
}

const BG_COLORS = {
  dark: 0x0f172a,      // Slate 900
  blueprint: 0x0b1329, // Dark blue navy
  light: 0xf8fafc,     // Slate 50
  greenscreen: 0x00ff00, // Chroma key green screen
};

export const ThreeViewer: React.FC<ThreeViewerProps> = ({
  geometry,
  renderMode,
  materialColor,
  autoRotate,
  rotationSpeed,
  gridVisible,
  axesVisible,
  lightingPreset,
  cameraAngle,
  onCameraAngleReset,
  canvasBg,
  isRecording = false,
  onRecordingComplete,
  onRecordingProgress,
  recordingProgress = 0,
  axisXOffset = 0,
  axisYOffset = 0,
  axisZOffset = 0,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Keep refs of Threejs objects so we can update them inside hook updates
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const pointsRef = useRef<THREE.Points | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const axesHelperRef = useRef<THREE.AxesHelper | null>(null);
  
  // Lighting WebGL elements
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const dirLight1Ref = useRef<THREE.DirectionalLight | null>(null);
  const dirLight2Ref = useRef<THREE.DirectionalLight | null>(null);
  const pointLightRef = useRef<THREE.PointLight | null>(null);

  // MediaRecorder references
  const isRecordingRef = useRef(isRecording);
  const recordStartTimeRef = useRef(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const lastProgressRef = useRef(-1);

  // Sync props to refs to avoid closure stale state in requestAnimationFrame loop
  const autoRotateRef = useRef(autoRotate);
  const rotationSpeedRef = useRef(rotationSpeed);
  const onRecordingProgressRef = useRef(onRecordingProgress);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    rotationSpeedRef.current = rotationSpeed;
  }, [rotationSpeed]);

  useEffect(() => {
    onRecordingProgressRef.current = onRecordingProgress;
  }, [onRecordingProgress]);

  // Lock or unlock controls when recording starts/stops
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.enabled = !isRecording;
    }
  }, [isRecording]);

  // Initialize scene
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 500;
    const height = containerRef.current.clientHeight || 400;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BG_COLORS[canvasBg]);
    sceneRef.current = scene;

    // Create a model group container to isolate automated turntable spinning from local model alignments
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);
    modelGroupRef.current = modelGroup;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(25, 20, 25);
    cameraRef.current = camera;

    // 3. Renderer with high-visual quality
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true, // Needed for video frame stream capture
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    rendererRef.current = renderer;

    // 4. Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 150;
    controls.minDistance = 2;
    controlsRef.current = controls;

    // 5. Grid Helper (Default initial grid)
    const gridHelper = new THREE.GridHelper(80, 80, 0x475569, 0x334155);
    gridHelper.position.y = -0.01; // Slightly offsets to prevent Z-fighting shadow-clash
    scene.add(gridHelper);
    gridHelperRef.current = gridHelper;

    // 6. Axes Helper
    // Coloured by what the user sees rather than by three.js internals: the vertical line is
    // the print height (Z, blue) and the line running into the screen is depth (Y, green),
    // which is the CAD / slicer convention.
    const axesHelper = new THREE.AxesHelper(15);
    axesHelper.setColors(
      new THREE.Color(0xff3b30), // three.js X   -> X 寬
      new THREE.Color(0x0055ff), // three.js Y(上) -> Z 高
      new THREE.Color(0x00c853), // three.js Z   -> Y 深
    );
    scene.add(axesHelper);
    axesHelperRef.current = axesHelper;

    // 7. Initialize Base Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight1.position.set(20, 40, 20);
    scene.add(dirLight1);
    dirLight1Ref.current = dirLight1;

    const dirLight2 = new THREE.DirectionalLight(0xa5b4fc, 0.4); // Subtle indigo tint
    dirLight2.position.set(-20, -10, -20);
    scene.add(dirLight2);
    dirLight2Ref.current = dirLight2;

    const pointLight = new THREE.PointLight(0xffffff, 0.5, 100);
    pointLight.position.set(0, 15, 0);
    scene.add(pointLight);
    pointLightRef.current = pointLight;

    // 8. Resize handle
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (!containerRef.current || !rendererRef.current || !cameraRef.current) continue;
        const w = entry.contentRect.width || containerRef.current.clientWidth;
        const h = entry.contentRect.height || containerRef.current.clientHeight;
        
        cameraRef.current.aspect = w / h;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(w, h);
      }
    });
    resizeObserver.observe(containerRef.current);

    // 9. Simple animation loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Orbit controls update
      if (controlsRef.current && controlsRef.current.enabled) {
        controlsRef.current.update();
      }

      // Check recording or regular spin
      const now = performance.now();
      if (isRecordingRef.current) {
        if (recordStartTimeRef.current === 0) {
          recordStartTimeRef.current = now;
        }
        const elapsed = now - recordStartTimeRef.current;
        const RECORD_DURATION = 4000; // Exact 4-sec video recording duration
        const progress = Math.min(elapsed / RECORD_DURATION, 1);
        
        const progressPercent = Math.round(progress * 100);
        if (progressPercent !== lastProgressRef.current) {
          lastProgressRef.current = progressPercent;
          if (onRecordingProgressRef.current) {
            onRecordingProgressRef.current(progressPercent);
          }
        }

        // Programmatic perfectly computed 360-degree rotation spin
        const angle = progress * Math.PI * 2;
        if (modelGroupRef.current) {
          modelGroupRef.current.rotation.y = angle;
        }

        if (elapsed >= RECORD_DURATION) {
          isRecordingRef.current = false;
          recordStartTimeRef.current = 0;
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
          }
        }
      } else {
        // Regular auto rotation using prop reference
        if (autoRotateRef.current) {
          const speedMultiplier = rotationSpeedRef.current * 0.005;
          if (modelGroupRef.current) {
            modelGroupRef.current.rotation.y += speedMultiplier;
          }
        }
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // Cleanups
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  // Update background color
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(BG_COLORS[canvasBg]);
      
      // Fine-tune grid helper color to fit the background beautifully
      if (gridHelperRef.current) {
        sceneRef.current.remove(gridHelperRef.current);
        let gridColor1 = canvasBg === 'light' ? 0x94a3b8 : 0x475569;
        let gridColor2 = canvasBg === 'light' ? 0xe2e8f0 : 0x1e293b;
        if (canvasBg === 'greenscreen') {
          gridColor1 = 0x00b300; // Slightly darker green lines to be clear but visible
          gridColor2 = 0x008000;
        }
        const gridHelper = new THREE.GridHelper(80, 80, gridColor1, gridColor2);
        // Put grid back at correct elevation
        if (meshRef.current) {
          meshRef.current.geometry.computeBoundingBox();
          const box = meshRef.current.geometry.boundingBox;
          if (box) {
            gridHelper.position.y = box.min.y - 0.02;
          } else {
            gridHelper.position.y = -0.01;
          }
        } else {
          gridHelper.position.y = -0.01;
        }
        // Carry over the current toggle state, or the rebuilt grid pops back visible
        gridHelper.visible = gridVisible;
        sceneRef.current.add(gridHelper);
        gridHelperRef.current = gridHelper;
      }
    }
  }, [canvasBg]);

  // Handle media recording start / stop triggers
  useEffect(() => {
    if (isRecording && canvasRef.current) {
      isRecordingRef.current = true;
      recordStartTimeRef.current = 0;
      lastProgressRef.current = -1;

      const canvas = canvasRef.current;
      // Capture standard video stream from the WebGL canvas at 30 FPS
      const stream = (canvas as any).captureStream ? (canvas as any).captureStream(30) : (canvas as any).canvas?.captureStream?.(30);

      if (!stream) {
        console.error('Canvas captureStream not supported in this browser environment');
        isRecordingRef.current = false;
        if (onRecordingComplete) onRecordingComplete(new Blob());
        return;
      }

      // Detect supported container type & codecs
      let mimeType = 'video/webm';
      if (MediaRecorder.isTypeSupported('video/mp4;codecs=h264')) {
        mimeType = 'video/mp4;codecs=h264';
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
        mimeType = 'video/webm;codecs=h264';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
        mimeType = 'video/webm;codecs=vp9';
      }

      const chunks: Blob[] = [];
      try {
        const mediaRecorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 3000000 });
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          const finalBlob = new Blob(chunks, { type: mimeType });
          if (onRecordingComplete) {
            onRecordingComplete(finalBlob);
          }
        };

        mediaRecorder.start();
      } catch (err) {
        console.warn('MediaRecorder with options failed, falling back to default', err);
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          const finalBlob = new Blob(chunks, { type: 'video/webm' });
          if (onRecordingComplete) {
            onRecordingComplete(finalBlob);
          }
        };

        mediaRecorder.start();
      }
    } else {
      if (isRecordingRef.current) {
        isRecordingRef.current = false;
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      }
    }
  }, [isRecording]);

  // Adjust materials when props update (renderMode / materialColor)
  const applyMaterialSettings = () => {
    const scene = sceneRef.current;
    if (!scene || !geometry || !modelGroupRef.current) return;

    // Remove existing meshes/points first from modelGroupRef.current
    if (meshRef.current) {
      modelGroupRef.current.remove(meshRef.current);
      meshRef.current = null;
    }
    if (pointsRef.current) {
      modelGroupRef.current.remove(pointsRef.current);
      pointsRef.current = null;
    }

    const isCustomColor = !MATERIAL_COLORS[materialColor as any];
    const colorHex = isCustomColor ? (materialColor as string) : MATERIAL_COLORS[materialColor as any].hex;
    const roughness = isCustomColor ? 0.25 : MATERIAL_COLORS[materialColor as any].roughness;
    const metalness = isCustomColor ? 0.6 : MATERIAL_COLORS[materialColor as any].metalness;
    const isWireframe = renderMode === 'wireframe';

    const xRad = THREE.MathUtils.degToRad(axisXOffset);
    const yRad = THREE.MathUtils.degToRad(axisYOffset);
    const zRad = THREE.MathUtils.degToRad(axisZOffset);

    if (renderMode === 'points') {
      // 1. Particle Cloud render mode with dynamic point sampling for higher density
      let denseGeometry = geometry;
      const positionAttribute = geometry.getAttribute('position');

      if (positionAttribute) {
        const indexAttribute = geometry.getIndex();
        const positions: number[] = [];
        const count = positionAttribute.count;
        const triangleCount = indexAttribute ? indexAttribute.count / 3 : count / 3;

        // Determine sampling density dynamically depending on model size to prevent UI freeze
        let samplesPerTriangle = 4;
        if (triangleCount < 1500) {
          samplesPerTriangle = 10; // Extra dense for small/simple objects
        } else if (triangleCount < 6000) {
          samplesPerTriangle = 6;
        } else if (triangleCount < 15000) {
          samplesPerTriangle = 3;
        } else if (triangleCount < 40000) {
          samplesPerTriangle = 1;
        } else {
          samplesPerTriangle = 0; // Already very dense
        }

        // Add original points
        for (let i = 0; i < count; i++) {
          positions.push(
            positionAttribute.getX(i),
            positionAttribute.getY(i),
            positionAttribute.getZ(i)
          );
        }

        // Add sampled points on surfaces
        if (samplesPerTriangle > 0) {
          const vA = new THREE.Vector3();
          const vB = new THREE.Vector3();
          const vC = new THREE.Vector3();

          const addSampledPoint = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => {
            const r1 = Math.random();
            const r2 = Math.random();
            const sqrtR1 = Math.sqrt(r1);

            const x = (1 - sqrtR1) * a.x + (sqrtR1 * (1 - r2)) * b.x + (r2 * sqrtR1) * c.x;
            const y = (1 - sqrtR1) * a.y + (sqrtR1 * (1 - r2)) * b.y + (r2 * sqrtR1) * c.y;
            const z = (1 - sqrtR1) * a.z + (sqrtR1 * (1 - r2)) * b.z + (r2 * sqrtR1) * c.z;
            positions.push(x, y, z);
          };

          if (indexAttribute) {
            for (let i = 0; i < indexAttribute.count; i += 3) {
              const idx0 = indexAttribute.getX(i);
              const idx1 = indexAttribute.getY(i);
              const idx2 = indexAttribute.getZ(i);

              vA.fromBufferAttribute(positionAttribute, idx0);
              vB.fromBufferAttribute(positionAttribute, idx1);
              vC.fromBufferAttribute(positionAttribute, idx2);

              for (let j = 0; j < samplesPerTriangle; j++) {
                addSampledPoint(vA, vB, vC);
              }
            }
          } else {
            for (let i = 0; i < count; i += 3) {
              if (i + 2 < count) {
                vA.fromBufferAttribute(positionAttribute, i);
                vB.fromBufferAttribute(positionAttribute, i + 1);
                vC.fromBufferAttribute(positionAttribute, i + 2);

                for (let j = 0; j < samplesPerTriangle; j++) {
                  addSampledPoint(vA, vB, vC);
                }
              }
            }
          }
        }

        denseGeometry = new THREE.BufferGeometry();
        denseGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      }

      // Adjusted size (0.45 as requested)
      const pointsMat = new THREE.PointsMaterial({
        color: new THREE.Color(colorHex),
        size: 0.45,
        sizeAttenuation: true,
      });
      const points = new THREE.Points(denseGeometry, pointsMat);
      points.rotation.set(xRad, yRad, zRad);
      modelGroupRef.current.add(points);
      pointsRef.current = points;
    } else {
      // 2. Solid/Metal/Wireframe mesh render modes
      let material: THREE.Material;

      if (renderMode === 'metal') {
        material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(colorHex),
          roughness: roughness,
          metalness: metalness,
          side: THREE.DoubleSide,
        });
      } else {
        // 'solid' and 'wireframe' standard
        material = new THREE.MeshPhongMaterial({
          color: new THREE.Color(colorHex),
          specular: 0x111111,
          shininess: 30,
          side: THREE.DoubleSide,
          wireframe: isWireframe,
        });
      }

      const mesh = new THREE.Mesh(geometry, material);
      // Ensure normal vectors are computed
      geometry.computeVertexNormals();
      mesh.rotation.set(xRad, yRad, zRad);
      modelGroupRef.current.add(mesh);
      meshRef.current = mesh;
    }
  };

  // Triggered when geometry, renderMode, or materialColor changes
  useEffect(() => {
    applyMaterialSettings();
  }, [geometry, renderMode, materialColor]);

  // Apply manual offsets rotation smoothly on the active sub-mesh without rebuilding dense point geometries
  useEffect(() => {
    const xRad = THREE.MathUtils.degToRad(axisXOffset);
    const yRad = THREE.MathUtils.degToRad(axisYOffset);
    const zRad = THREE.MathUtils.degToRad(axisZOffset);

    if (meshRef.current) {
      meshRef.current.rotation.set(xRad, yRad, zRad);
    }
    if (pointsRef.current) {
      pointsRef.current.rotation.set(xRad, yRad, zRad);
    }

    // Recalculate grid elevation matching the exact rotated bounding box
    if (gridHelperRef.current) {
      const targetObj = meshRef.current || pointsRef.current;
      if (targetObj) {
        const box = new THREE.Box3().setFromObject(targetObj);
        if (!box.isEmpty() && box.min.y !== Infinity && box.min.y !== -Infinity) {
          gridHelperRef.current.position.y = box.min.y - 0.05;
        }
      }
    }
  }, [axisXOffset, axisYOffset, axisZOffset]);

  // Handle Dynamic Grid Elevation matching the object's bottom side initially
  useEffect(() => {
    if (!sceneRef.current || !geometry || !gridHelperRef.current) return;
    
    let floorY = -0.05;
    const targetObj = meshRef.current || pointsRef.current;
    if (targetObj) {
      const box = new THREE.Box3().setFromObject(targetObj);
      if (!box.isEmpty() && box.min.y !== Infinity && box.min.y !== -Infinity) {
        floorY = box.min.y - 0.05;
      }
    } else {
      geometry.computeBoundingBox();
      const box = geometry.boundingBox || new THREE.Box3();
      floorY = box.min.y - 0.05;
    }
    
    gridHelperRef.current.position.y = floorY;
  }, [geometry]);

  // Handle visibility states
  useEffect(() => {
    if (gridHelperRef.current) {
      gridHelperRef.current.visible = gridVisible;
    }
  }, [gridVisible]);

  useEffect(() => {
    if (axesHelperRef.current) {
      axesHelperRef.current.visible = axesVisible;
    }
  }, [axesVisible]);

  // Adjust lighting preset
  useEffect(() => {
    if (!ambientLightRef.current || !dirLight1Ref.current || !dirLight2Ref.current || !pointLightRef.current) return;

    if (lightingPreset === 'studio') {
      ambientLightRef.current.intensity = 0.55;
      dirLight1Ref.current.intensity = 0.9;
      dirLight1Ref.current.position.set(20, 40, 20);
      dirLight2Ref.current.intensity = 0.4;
      pointLightRef.current.intensity = 0.3;
    } else if (lightingPreset === 'dramatic') {
      ambientLightRef.current.intensity = 0.15;
      dirLight1Ref.current.intensity = 1.3;
      dirLight1Ref.current.position.set(10, 50, 10);
      dirLight2Ref.current.intensity = 0.1;
      pointLightRef.current.intensity = 1.2;
      pointLightRef.current.position.set(0, 18, 5);
    } else {
      // ambient clean representation
      ambientLightRef.current.intensity = 0.95;
      dirLight1Ref.current.intensity = 0.25;
      dirLight2Ref.current.intensity = 0.15;
      pointLightRef.current.intensity = 0.0;
    }
  }, [lightingPreset]);

  // Auto zoom camera to fit geometry beautifully in view frame when a new model is loaded
  useEffect(() => {
    if (!geometry || !cameraRef.current || !controlsRef.current) return;

    // Rendered positions: let's center geometry to (0,0,0) first
    geometry.center();

    // Compute bounding sphere
    geometry.computeBoundingSphere();
    const sphere = geometry.boundingSphere || new THREE.Sphere(new THREE.Vector3(), 15);
    const radius = sphere.radius;

    // Best camera distance for framing standard field of view (45 deg)
    // Distance = Radius / sin(fov/2)
    const fovRad = (cameraRef.current.fov * Math.PI) / 180;
    let cameraDistance = radius / Math.sin(fovRad / 2);

    // Apply lower and upper caps to ensure sizing is perfect
    cameraDistance = Math.min(Math.max(cameraDistance * 1.3, 10), 120);

    // Update camera position
    cameraRef.current.position.set(cameraDistance, cameraDistance * 0.75, cameraDistance);
    cameraRef.current.lookAt(0, 0, 0);

    // Reset OrbitControls targets
    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.update();

    // Reset rotation of meshes/groups to correct home positions
    if (modelGroupRef.current) {
      modelGroupRef.current.rotation.set(0, 0, 0);
    }
    const xRad = THREE.MathUtils.degToRad(axisXOffset);
    const yRad = THREE.MathUtils.degToRad(axisYOffset);
    const zRad = THREE.MathUtils.degToRad(axisZOffset);
    if (meshRef.current) {
      meshRef.current.rotation.set(xRad, yRad, zRad);
    }
    if (pointsRef.current) {
      pointsRef.current.rotation.set(xRad, yRad, zRad);
    }
  }, [geometry]);

  // Manage camera preset angle triggers
  useEffect(() => {
    if (!cameraAngle || !cameraRef.current || !controlsRef.current || !geometry) return;

    geometry.computeBoundingSphere();
    const sphere = geometry.boundingSphere || new THREE.Sphere(new THREE.Vector3(), 15);
    const radius = sphere.radius;
    const dist = Math.min(Math.max(radius * 2.2, 12), 100);

    switch (cameraAngle) {
      case 'front':
        cameraRef.current.position.set(0, 0, dist);
        break;
      case 'top':
        cameraRef.current.position.set(0, dist, 0);
        break;
      case 'side':
        cameraRef.current.position.set(dist, 0, 0);
        break;
      case 'isometric':
        const isoCoord = dist * 0.707; // Cosine 45 deg
        cameraRef.current.position.set(isoCoord, isoCoord, isoCoord);
        break;
    }

    cameraRef.current.lookAt(0, 0, 0);
    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.update();

    // Clear angle trigger to allow manual orbit rotations after presets
    onCameraAngleReset();
  }, [cameraAngle, geometry]);

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full rounded-none overflow-hidden flex items-center justify-center bg-zinc-950 border-4 border-black brutalist-shadow-lg"
      id="threejs-container"
    >
      <canvas 
        ref={canvasRef} 
        className="w-full h-full cursor-grab active:cursor-grabbing block"
        id="stl-canvas"
      />
      
      {isRecording && (
        <div className="absolute inset-0 bg-black/60 z-20 pointer-events-none flex flex-col items-center justify-center border-4 border-red-500 animate-[pulse_2s_infinite]">
          <div className="bg-red-600 text-white border-4 border-black font-mono font-black py-4 px-8 shadow-[6px_6px_0px_#000000] text-sm flex flex-col items-center gap-2 pointer-events-auto">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 bg-white rounded-full inline-block animate-ping"></span>
              <span className="uppercase tracking-widest text-[#CAFF04]">SYSTEM_RECORDING_SPIN</span>
            </div>
            <div className="text-2xl font-black text-center text-white tracking-widest">
              {recordingProgress}%
            </div>
            <div className="text-[9px] text-[#CAFF04] font-black uppercase text-center mt-1 tracking-wider border-t border-red-400 pt-1.5 w-full">
              AUTO ROTATING 360° • CAMERA IS LOCKED WORKSPACE
            </div>
          </div>
        </div>
      )}

      {/* Tiny corner axes or overlay details or mouse commands in modern white minimal cards */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-1.5 pointer-events-none p-3.5 rounded-none bg-black border-2 border-[#CAFF04] shadow-[4px_4px_0px_#000000] select-none text-left z-10">
        <div className="text-[9px] font-mono font-black text-[#CAFF04] tracking-wider border-b border-[#CAFF04]/30 pb-1 mb-1 uppercase flex items-center gap-1">
          <Axis3d className="w-3 h-3 shrink-0" />
          3D_AXIS_DETECTOR
        </div>
        <div className="flex items-center gap-2 text-xs font-black text-white">
          <span className="w-2.5 h-2.5 bg-[#ff3b30] inline-block border border-black"></span> X: 寬 (3D_WIDTH)
        </div>
        <div className="flex items-center gap-2 text-xs font-black text-white">
          <span className="w-2.5 h-2.5 bg-[#00c853] inline-block border border-black"></span> Y: 深 (3D_DEPTH)
        </div>
        <div className="flex items-center gap-2 text-xs font-black text-white">
          <span className="w-2.5 h-2.5 bg-[#0055ff] inline-block border border-black"></span> Z: 高 (3D_HEIGHT)
        </div>
      </div>

      <div className="absolute top-4 right-4 text-[10px] font-mono font-black text-black pointer-events-none bg-[#CAFF04] px-3 py-2 border-2 border-black shadow-[3px_3px_0px_#000000] rounded-none">
        滑鼠拖曳: 旋轉 (3D_ROT) / 滾輪: 縮放 (3D_ZOOM) / 右鍵: 平移 (3D_PAN)
      </div>
    </div>
  );
};
