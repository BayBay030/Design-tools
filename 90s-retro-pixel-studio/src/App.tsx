/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import { 
  Upload, 
  RefreshCw, 
  X, 
  Monitor,
  Save,
  Maximize2,
  Layout,
  Zap,
  Dice5,
  Palette,
  Cpu,
  FileDown,
  Layers,
  Eye,
  Home,
  Star,
  Mouse
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type ColorDepth = "1bit" | "2bit" | "4bit" | "full";
type DitherType = "ordered" | "floyd" | "none";
type GlitchType = "none" | "tear" | "rgb_split" | "byte_corrupt" | "scanline_drop" | "chaos";
type PaletteType = "default" | "matrix_green" | "amber_bios" | "cga_cyber" | "gameboy" | "plasma_vhs";
type ExportSizeMode = "original" | "native_low" | "2x" | "4x";
type ZoomMode = "fit" | "100" | "200" | "400" | "800";
type ViewLayout = "split" | "output_full";

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Dimensions
  const [sourceDimensions, setSourceDimensions] = useState<{ width: number; height: number } | null>(null);
  const [renderDimensions, setRenderDimensions] = useState<{ width: number; height: number } | null>(null);
  const [lowResDimensions, setLowResDimensions] = useState<{ width: number; height: number } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const outputViewportRef = useRef<HTMLDivElement>(null);

  // Retro Bitmap Engine Controls
  const [colorDepth, setColorDepth] = useState<ColorDepth>("1bit");
  const [ditherType, setDitherType] = useState<DitherType>("ordered");
  const [contrast, setContrast] = useState(1.6);
  const [pixelScale, setPixelScale] = useState(0.25); // Scale factor (0.05 to 1.0)
  
  // ========================================================
  // 2-STAGE GLITCH ENGINE CONTROLS (Pass 1 & Pass 2 疊加)
  // ========================================================
  // Glitch Pass 1 (初級故障 / Layer 1)
  const [glitch1Type, setGlitch1Type] = useState<GlitchType>("tear");
  const [glitch1Intensity, setGlitch1Intensity] = useState(45); // 0 to 100%
  const [glitch1Seed, setGlitch1Seed] = useState(42);

  // Glitch Pass 2 (次級疊加 / Layer 2)
  const [glitch2Type, setGlitch2Type] = useState<GlitchType>("byte_corrupt");
  const [glitch2Intensity, setGlitch2Intensity] = useState(35); // 0 to 100%
  const [glitch2Seed, setGlitch2Seed] = useState(88);

  const [paletteMode, setPaletteMode] = useState<PaletteType>("default");
  
  // Export & Viewport Inspection Controls
  const [exportFormat, setExportFormat] = useState<"png" | "jpeg">("png");
  const [exportSizeMode, setExportSizeMode] = useState<ExportSizeMode>("original");
  const [showScanlinesOverlay, setShowScanlinesOverlay] = useState(false);
  
  // 1:1 Actual Scale & Pan/Zoom Controls
  const [zoomMode, setZoomMode] = useState<ZoomMode>("100"); // Default 100% (1:1 actual pixels)
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [viewLayout, setViewLayout] = useState<ViewLayout>("split");
  const [isHoldingOriginal, setIsHoldingOriginal] = useState(false);

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview);
    if (processedUrl) URL.revokeObjectURL(processedUrl);
    setFile(null);
    setPreview(null);
    setProcessedUrl(null);
    setError(null);
    setSourceDimensions(null);
    setRenderDimensions(null);
    setLowResDimensions(null);
    setPanOffset({ x: 0, y: 0 });
  };

  const processSelectedFile = (selected: File) => {
    if (!selected.type.startsWith('image/')) {
      setError('Invalid File Type. Please upload an image file (PNG, JPG, WEBP).');
      return;
    }
    setError(null);
    setFile(selected);
    const url = URL.createObjectURL(selected);
    setPreview(url);
    setProcessedUrl(null);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      processSelectedFile(selected);
    }
  };

  // Pseudo-random generator using seed for reproducible glitch patterns
  const createSeededRandom = (seed: number) => {
    let s = seed;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  };

  // Execute a single isolated Glitch Pass on target pixel buffer
  const executeGlitchPass = (
    data: Uint8ClampedArray,
    targetW: number,
    targetH: number,
    type: GlitchType,
    intensityVal: number,
    seed: number
  ) => {
    if (type === "none" || intensityVal <= 0) return;
    const intensity = intensityVal / 100;
    const random = createSeededRandom(seed);

    // 1. Horizontal VRAM Tear / Slice displacement
    if (type === "tear" || type === "chaos") {
      const numSlices = Math.floor(1 + intensity * 8 * random() + intensity * 5);
      for (let s = 0; s < numSlices; s++) {
        const sliceY = Math.floor(random() * targetH);
        const sliceHeight = Math.max(1, Math.floor((1 + random() * 5) * (1 + intensity * 3)));
        const maxShift = Math.floor(targetW * (0.05 + intensity * 0.25));
        const shiftX = Math.floor((random() - 0.5) * 2 * maxShift);

        if (shiftX !== 0) {
          for (let y = sliceY; y < Math.min(targetH, sliceY + sliceHeight); y++) {
            const rowBuffer = new Uint8ClampedArray(targetW * 4);
            const rowOffset = y * targetW * 4;
            for (let i = 0; i < targetW * 4; i++) {
              rowBuffer[i] = data[rowOffset + i];
            }
            for (let x = 0; x < targetW; x++) {
              const srcX = (x - shiftX + targetW) % targetW;
              const destIdx = rowOffset + x * 4;
              const srcIdx = srcX * 4;
              data[destIdx] = rowBuffer[srcIdx];
              data[destIdx + 1] = rowBuffer[srcIdx + 1];
              data[destIdx + 2] = rowBuffer[srcIdx + 2];
              data[destIdx + 3] = rowBuffer[srcIdx + 3];
            }
          }
        }
      }
    }

    // 2. RGB Channel Split / Chromatic Displacement
    if (type === "rgb_split" || type === "chaos") {
      const splitAmount = Math.max(1, Math.floor(1 + intensity * targetW * 0.08));
      const redShift = Math.floor((random() > 0.5 ? 1 : -1) * splitAmount);
      const blueShift = -redShift;

      const snapshot = new Uint8ClampedArray(data);
      for (let y = 0; y < targetH; y++) {
        for (let x = 0; x < targetW; x++) {
          const idx = (y * targetW + x) * 4;
          
          // Shift Red
          const rX = Math.min(Math.max(x + redShift, 0), targetW - 1);
          const rIdx = (y * targetW + rX) * 4;
          data[idx] = snapshot[rIdx];

          // Shift Blue
          const bX = Math.min(Math.max(x + blueShift, 0), targetW - 1);
          const bIdx = (y * targetW + bX) * 4;
          data[idx + 2] = snapshot[bIdx + 2];
        }
      }
    }

    // 3. Bit/Byte Corruptions & Inversion Blocks (0&1 破圖/記憶體區塊翻轉)
    if (type === "byte_corrupt" || type === "chaos") {
      const numBlocks = Math.floor(2 + intensity * 12);
      for (let b = 0; b < numBlocks; b++) {
        const bx = Math.floor(random() * (targetW - 4));
        const by = Math.floor(random() * (targetH - 4));
        const bw = Math.min(targetW - bx, Math.floor(2 + random() * targetW * (0.1 + intensity * 0.2)));
        const bh = Math.min(targetH - by, Math.floor(1 + random() * targetH * (0.05 + intensity * 0.1)));
        const mode = random();

        for (let py = by; py < by + bh; py++) {
          for (let px = bx; px < bx + bw; px++) {
            const idx = (py * targetW + px) * 4;
            if (mode < 0.4) {
              // Invert bytes
              data[idx] = 255 - data[idx];
              data[idx + 1] = 255 - data[idx + 1];
              data[idx + 2] = 255 - data[idx + 2];
            } else if (mode < 0.7) {
              // High contrast noise
              const noise = random() > 0.5 ? 255 : 0;
              data[idx] = noise;
              data[idx + 1] = noise;
              data[idx + 2] = noise;
            } else {
              // Bit striping
              const stripe = (px + py) % 2 === 0 ? 255 : 0;
              data[idx] = stripe;
              data[idx + 1] = stripe;
              data[idx + 2] = stripe;
            }
          }
        }
      }
    }

    // 4. Signal Dropout Lines & Dead Scanlines (信號遺失黑/亮線)
    if (type === "scanline_drop" || type === "chaos") {
      const numDeadLines = Math.floor(1 + intensity * 8);
      for (let l = 0; l < numDeadLines; l++) {
        const lineY = Math.floor(random() * targetH);
        const isWhite = random() > 0.6;
        const lineOffset = lineY * targetW * 4;
        for (let x = 0; x < targetW; x++) {
          const idx = lineOffset + x * 4;
          const val = isWhite ? 255 : 0;
          data[idx] = val;
          data[idx + 1] = val;
          data[idx + 2] = val;
        }
      }
    }
  };

  // Core 90s Bitmap & 2-Pass Glitch Render Engine
  const applyRetroEffect = useCallback(async () => {
    if (!preview) return;
    setIsProcessing(true);
    setError(null);
    
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = preview;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('Failed to load image buffer into memory.'));
      });

      setSourceDimensions({ width: img.width, height: img.height });

      // Target downscale resolution based on pixelScale (0.05 to 1.0)
      const targetW = Math.max(8, Math.floor(img.width * pixelScale));
      const targetH = Math.max(8, Math.floor(img.height * pixelScale));
      setLowResDimensions({ width: targetW, height: targetH });

      // Final output dimension based on exportSizeMode
      let finalOutW = img.width;
      let finalOutH = img.height;
      if (exportSizeMode === "native_low") {
        finalOutW = targetW;
        finalOutH = targetH;
      } else if (exportSizeMode === "2x") {
        finalOutW = targetW * 2;
        finalOutH = targetH * 2;
      } else if (exportSizeMode === "4x") {
        finalOutW = targetW * 4;
        finalOutH = targetH * 4;
      }

      setRenderDimensions({ width: finalOutW, height: finalOutH });

      const canvas = document.createElement('canvas');
      canvas.width = finalOutW;
      canvas.height = finalOutH;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Canvas context initialization failed');

      // 1. Pre-process on intermediate downscaled canvas
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = targetW;
      tempCanvas.height = targetH;
      const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
      if (!tempCtx) throw new Error('Temp Canvas initialization failed');
      
      // Draw and apply contrast
      tempCtx.filter = `contrast(${contrast})`;
      tempCtx.drawImage(img, 0, 0, targetW, targetH);
      const imageData = tempCtx.getImageData(0, 0, targetW, targetH);
      const data = imageData.data;

      // ========================================================
      // GLITCH PASS 1: 初級故障特效 (Primary Distortion)
      // ========================================================
      executeGlitchPass(data, targetW, targetH, glitch1Type, glitch1Intensity, glitch1Seed);

      // ========================================================
      // STAGE 2: Quantization & Dithering Algorithms
      // ========================================================
      const bayer8x8 = [
        [ 0, 48, 12, 60,  3, 51, 15, 63],
        [32, 16, 44, 28, 35, 19, 47, 31],
        [ 8, 56,  4, 52, 11, 59,  7, 55],
        [40, 24, 36, 20, 43, 27, 39, 23],
        [ 2, 50, 14, 62,  1, 49, 13, 61],
        [34, 18, 46, 30, 33, 17, 45, 29],
        [10, 58,  6, 54,  9, 57,  5, 53],
        [42, 26, 38, 22, 41, 25, 37, 21]
      ].map(row => row.map(v => v / 64));

      const levels = {
        "1bit": 2,
        "2bit": 4,
        "4bit": 16,
        "full": 256
      }[colorDepth];

      if (ditherType === "ordered" && colorDepth !== "full") {
        for (let y = 0; y < targetH; y++) {
          for (let x = 0; x < targetW; x++) {
            const i = (y * targetW + x) * 4;
            const threshold = bayer8x8[y % 8][x % 8] - 0.5;
            for (let channel = 0; channel < 3; channel++) {
              const oldVal = data[i + channel];
              const dither = threshold * (255 / (levels - 1));
              data[i + channel] = Math.max(0, Math.min(255, Math.round((oldVal + dither) / (255 / (levels - 1))) * (255 / (levels - 1))));
            }
          }
        }
      } else if (ditherType === "floyd" && colorDepth !== "full") {
        const errData = new Float32Array(data.length);
        for (let i = 0; i < data.length; i++) errData[i] = data[i];

        for (let y = 0; y < targetH; y++) {
          for (let x = 0; x < targetW; x++) {
            const i = (y * targetW + x) * 4;
            for (let channel = 0; channel < 3; channel++) {
              const oldVal = errData[i + channel];
              const newVal = Math.max(0, Math.min(255, Math.round(oldVal / (255 / (levels - 1))) * (255 / (levels - 1))));
              const error = oldVal - newVal;
              
              data[i + channel] = newVal;
              
              // Error diffusion to neighbors
              const distribute = (dx: number, dy: number, factor: number) => {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < targetW && ny >= 0 && ny < targetH) {
                  const ni = (ny * targetW + nx) * 4 + channel;
                  errData[ni] += error * factor;
                }
              };
              distribute(1, 0, 7/16);
              distribute(-1, 1, 3/16);
              distribute(0, 1, 5/16);
              distribute(1, 1, 1/16);
            }
          }
        }
      } else if (colorDepth !== "full") {
        for (let i = 0; i < data.length; i += 4) {
          for (let c = 0; c < 3; c++) {
            data[i + c] = Math.max(0, Math.min(255, Math.round(data[i + c] / (255 / (levels - 1))) * (255 / (levels - 1))));
          }
        }
      }

      // ========================================================
      // GLITCH PASS 2: 次級故障特效疊加 (Secondary Stacked Distortion)
      // ========================================================
      executeGlitchPass(data, targetW, targetH, glitch2Type, glitch2Intensity, glitch2Seed);

      // ========================================================
      // STAGE 4: CRT Phosphor / Retro Palette Mapping
      // ========================================================
      if (paletteMode !== "default") {
        for (let i = 0; i < data.length; i += 4) {
          const lum = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
          
          if (paletteMode === "matrix_green") {
            data[i] = Math.floor(lum * 20);
            data[i + 1] = Math.floor(lum * 255);
            data[i + 2] = Math.floor(lum * 60);
          } else if (paletteMode === "amber_bios") {
            data[i] = Math.floor(lum * 255);
            data[i + 1] = Math.floor(lum * 170);
            data[i + 2] = Math.floor(lum * 10);
          } else if (paletteMode === "cga_cyber") {
            if (lum < 0.25) {
              data[i] = 0; data[i + 1] = 0; data[i + 2] = 0;
            } else if (lum < 0.55) {
              data[i] = 0; data[i + 1] = 220; data[i + 2] = 220;
            } else if (lum < 0.85) {
              data[i] = 230; data[i + 1] = 0; data[i + 2] = 230;
            } else {
              data[i] = 255; data[i + 1] = 255; data[i + 2] = 255;
            }
          } else if (paletteMode === "gameboy") {
            if (lum < 0.25) {
              data[i] = 15; data[i + 1] = 56; data[i + 2] = 15;
            } else if (lum < 0.5) {
              data[i] = 48; data[i + 1] = 98; data[i + 2] = 48;
            } else if (lum < 0.75) {
              data[i] = 139; data[i + 1] = 172; data[i + 2] = 15;
            } else {
              data[i] = 155; data[i + 1] = 188; data[i + 2] = 15;
            }
          } else if (paletteMode === "plasma_vhs") {
            data[i] = Math.floor(lum * 240);
            data[i + 1] = Math.floor((1 - lum) * 120 + lum * 60);
            data[i + 2] = Math.floor(255 - lum * 80);
          }
        }
      }

      tempCtx.putImageData(imageData, 0, 0);
      
      // Upscale precisely with crisp nearest-neighbor (zero blur)
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(tempCanvas, 0, 0, targetW, targetH, 0, 0, canvas.width, canvas.height);
      
      const mimeType = exportFormat === "jpeg" ? "image/jpeg" : "image/png";
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, mimeType, 0.95));
      if (!blob) throw new Error('Blob generation failed');
      
      const url = URL.createObjectURL(blob);
      setProcessedUrl(url);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'System Failure in VRAM processing.');
    } finally {
      setIsProcessing(false);
    }
  }, [
    preview, 
    pixelScale, 
    contrast, 
    colorDepth, 
    ditherType, 
    glitch1Type, 
    glitch1Intensity, 
    glitch1Seed, 
    glitch2Type, 
    glitch2Intensity, 
    glitch2Seed, 
    paletteMode, 
    exportFormat, 
    exportSizeMode
  ]);

  // Auto trigger render on parameter change
  useEffect(() => {
    if (preview) {
      const timer = setTimeout(() => {
        applyRetroEffect();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [
    preview, 
    pixelScale, 
    contrast, 
    colorDepth, 
    ditherType, 
    glitch1Type, 
    glitch1Intensity, 
    glitch1Seed, 
    glitch2Type, 
    glitch2Intensity, 
    glitch2Seed, 
    paletteMode, 
    exportFormat, 
    exportSizeMode, 
    applyRetroEffect
  ]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) processSelectedFile(dropped);
  };

  const randomizePass1 = () => {
    setGlitch1Seed(Math.floor(Math.random() * 100000));
  };

  const randomizePass2 = () => {
    setGlitch2Seed(Math.floor(Math.random() * 100000));
  };

  const randomizeBothSeeds = () => {
    setGlitch1Seed(Math.floor(Math.random() * 100000));
    setGlitch2Seed(Math.floor(Math.random() * 100000));
  };

  // Zoom scale helper
  const getDisplayZoom = () => {
    if (zoomMode === "fit") return 1.0;
    if (zoomMode === "100") return 1.0;
    if (zoomMode === "200") return 2.0;
    if (zoomMode === "400") return 4.0;
    if (zoomMode === "800") return 8.0;
    return 1.0;
  };

  // Drag & Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomMode === "fit") return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoomMode !== "fit") {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel zoom handler on the preview viewport
  const handleWheel = (e: React.WheelEvent) => {
    if (!processedUrl) return;
    e.preventDefault();
    if (e.deltaY < 0) {
      // Zoom in
      if (zoomMode === "fit") setZoomMode("100");
      else if (zoomMode === "100") setZoomMode("200");
      else if (zoomMode === "200") setZoomMode("400");
      else if (zoomMode === "400") setZoomMode("800");
    } else {
      // Zoom out
      if (zoomMode === "800") setZoomMode("400");
      else if (zoomMode === "400") setZoomMode("200");
      else if (zoomMode === "200") setZoomMode("100");
      else if (zoomMode === "100") setZoomMode("fit");
    }
  };

  const resetPan = () => {
    setPanOffset({ x: 0, y: 0 });
  };

  return (
    <div className="min-h-screen bg-win-teal font-win selection:bg-win-blue selection:text-white flex flex-col items-center justify-center p-1 pb-14 sm:p-3 sm:pb-16">
      
      {/* Main OS Window */}
      <div className="w-full max-w-[1400px] bg-win-bg win-outset flex flex-col shadow-2xl">
        
        {/* Title Bar */}
        <div className="win-titlebar select-none">
          <Cpu size={16} className="text-yellow-300" />
          <span className="text-sm font-bold mr-auto tracking-wide flex items-center gap-1.5">
            RetroPixel Studio 95 // DUAL-PASS GLITCH STACK & 1:1 PIXEL SUITE
          </span>
          <div className="flex gap-1">
            <button 
              onClick={() => setViewLayout(viewLayout === "split" ? "output_full" : "split")} 
              title="Toggle Fullscreen Output View"
              className="w-6 h-6 bg-win-bg win-outset flex items-center justify-center hover:bg-gray-200 active:win-inset"
            >
              <Maximize2 size={12} className="text-black" />
            </button>
            <button onClick={reset} className="w-6 h-6 bg-win-bg win-outset flex items-center justify-center hover:bg-red-500 hover:text-white active:win-inset">
              <X size={12} className="text-black" />
            </button>
          </div>
        </div>

        {/* Menu Bar */}
        <div className="flex px-2 py-1 border-b border-win-border-dark text-[13px] min-h-8 items-center gap-x-3 gap-y-1 bg-win-bg select-none flex-wrap">
          <button className="px-1 hover:bg-win-blue hover:text-white" onClick={() => fileInputRef.current?.click()}>File(F)</button>
          <button className="px-1 hover:bg-win-blue hover:text-white" onClick={applyRetroEffect}>Render(R)</button>
          <button className="px-1 hover:bg-win-blue hover:text-white font-bold" onClick={randomizeBothSeeds}>Reroll_Both_Glitches(G)</button>
          <button className="px-1 hover:bg-win-blue hover:text-white font-bold" onClick={() => setZoomMode(zoomMode === "100" ? "fit" : "100")}>
            Zoom[{zoomMode === "100" ? "1:1 ACTUAL" : zoomMode.toUpperCase()}]
          </button>
          <button className="px-1 hover:bg-win-blue hover:text-white" onClick={() => setShowScanlinesOverlay(!showScanlinesOverlay)}>
            Scanlines[{showScanlinesOverlay ? 'ON' : 'OFF'}]
          </button>
          <button className="px-1 hover:bg-win-blue hover:text-white" onClick={reset}>Clear(C)</button>
          
          <div className="ml-auto text-[11px] text-gray-700 hidden sm:flex items-center gap-2">
            <span className="font-bold text-win-blue flex items-center gap-1"><Layers size={13} /> 2-STAGE FX STACK</span>
            <span>|</span>
            <span>1:1 RAW VRAM</span>
          </div>
        </div>

        {/* Primary Controls Toolbar */}
        <div className="p-2 border-b border-win-border-dark flex flex-col gap-2 bg-win-bg text-[13px]">
          
          {/* Row 1: File Actions + Quantization & Dither Params + CRT Phosphor */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="win-inset p-1 bg-gray-100 flex items-center gap-1.5 flex-wrap">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 win-outset flex items-center gap-1 text-[12px] bg-win-bg active:win-inset font-bold hover:bg-gray-50"
              >
                <Save size={14} /> Load_Image
              </button>
              
              <button 
                onClick={applyRetroEffect}
                disabled={!file || isProcessing}
                className="px-3 py-1 win-outset flex items-center gap-1.5 text-[12px] bg-win-blue text-white active:win-inset disabled:opacity-50 font-bold shadow-sm"
              >
                <RefreshCw size={13} className={isProcessing ? "animate-spin" : ""} /> 
                {isProcessing ? "Rendering..." : "RENDER_BIOS"}
              </button>
            </div>

            <div className="win-inset p-1 bg-gray-100 flex items-center gap-2 flex-wrap">
              {/* Bit Depth */}
              <div className="flex items-center gap-1">
                <span className="text-[11px] uppercase font-bold text-win-blue">BitDepth:</span>
                <select 
                  value={colorDepth} 
                  onChange={(e) => setColorDepth(e.target.value as ColorDepth)}
                  className="text-[12px] bg-white win-inset px-1 py-0.5 outline-none font-bold"
                >
                  <option value="1bit">1-bit (B&W 0/1 極致點陣)</option>
                  <option value="2bit">2-bit (CGA 4-Tone)</option>
                  <option value="4bit">4-bit (EGA 16-Tone)</option>
                  <option value="full">High_Color (24-bit)</option>
                </select>
              </div>

              {/* Dither Mode */}
              <div className="flex items-center gap-1">
                <span className="text-[11px] uppercase font-bold text-win-blue">Dither:</span>
                <select 
                  value={ditherType} 
                  onChange={(e) => setDitherType(e.target.value as DitherType)}
                  className="text-[12px] bg-white win-inset px-1 py-0.5 outline-none font-bold"
                >
                  <option value="ordered">Ordered (Bayer 8x8 終端機網點)</option>
                  <option value="floyd">Floyd-Steinberg (誤差擴散)</option>
                  <option value="none">Solid Quant (純色階無網點)</option>
                </select>
              </div>

              {/* Phosphor Theme */}
              <div className="flex items-center gap-1">
                <Palette size={14} className="text-gray-600" />
                <span className="text-[11px] uppercase font-bold text-win-blue">CRT_Color:</span>
                <select 
                  value={paletteMode} 
                  onChange={(e) => setPaletteMode(e.target.value as PaletteType)}
                  className="text-[12px] bg-white win-inset px-1 py-0.5 outline-none font-bold"
                >
                  <option value="default">Raw / Grayscale (黑白/原色)</option>
                  <option value="amber_bios">Amber CRT (經典琥珀橙)</option>
                  <option value="matrix_green">Matrix P1 (駭客終端綠)</option>
                  <option value="cga_cyber">CGA Cyber (青桃粉高對比)</option>
                  <option value="gameboy">DMG-01 LCD (灰綠復古掌機)</option>
                  <option value="plasma_vhs">VHS Plasma (霓虹紫藍)</option>
                </select>
              </div>
            </div>

            {/* Layout switch */}
            <div className="win-inset p-1 bg-gray-100 flex items-center gap-1 ml-auto">
              <span className="text-[11px] uppercase font-bold text-gray-600">Layout:</span>
              <button 
                onClick={() => setViewLayout("split")}
                className={`px-2 py-0.5 win-outset text-[12px] font-bold ${viewLayout === 'split' ? 'bg-win-blue text-white' : 'bg-win-bg text-black'}`}
              >
                Split 左右
              </button>
              <button 
                onClick={() => setViewLayout("output_full")}
                className={`px-2 py-0.5 win-outset text-[12px] font-bold ${viewLayout === 'output_full' ? 'bg-win-blue text-white' : 'bg-win-bg text-black'}`}
              >
                1:1 滿版放大
              </button>
            </div>
          </div>

          {/* Row 2: DUAL-PASS GLITCH STACK (Pass 1 & Pass 2 疊加特效) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            
            {/* GLITCH PASS 1 (第 1 道故障) */}
            <div className="win-inset p-1.5 bg-amber-50/60 flex items-center gap-1.5 flex-wrap border border-amber-300/60">
              <div className="flex items-center gap-1 px-1 bg-red-800 text-white text-[11px] font-bold py-0.5 rounded-sm">
                <Zap size={12} className="fill-yellow-300 text-yellow-300" />
                <span>GLITCH_PASS 1 [第1道]</span>
              </div>
              
              <select 
                value={glitch1Type} 
                onChange={(e) => setGlitch1Type(e.target.value as GlitchType)}
                className="text-[12px] bg-white win-inset px-1 py-0.5 outline-none font-bold text-red-900 flex-1 min-w-[130px]"
              >
                <option value="none">[OFF] 無特效</option>
                <option value="tear">VRAM Tear (水平切片撕裂)</option>
                <option value="rgb_split">RGB Split (色散分離位移)</option>
                <option value="byte_corrupt">Byte Invert (0&1 破圖區塊)</option>
                <option value="scanline_drop">Sync Loss (信號丟失掃描線)</option>
                <option value="chaos">★ FULL CHAOS (複合崩潰)</option>
              </select>

              <div className="flex items-center gap-1 pl-1">
                <span className="text-[11px] font-bold text-gray-700">強度:</span>
                <input 
                  type="range" 
                  min="5" 
                  max="100" 
                  step="5"
                  value={glitch1Intensity} 
                  disabled={glitch1Type === "none"}
                  onChange={(e) => setGlitch1Intensity(Number(e.target.value))}
                  className="w-14 sm:w-16 h-3"
                />
                <span className="text-[11px] w-6 text-right font-mono font-bold text-red-700">{glitch1Intensity}%</span>
              </div>

              <button 
                onClick={randomizePass1}
                title="Randomize Pass 1 seed"
                disabled={glitch1Type === "none"}
                className="px-1.5 py-0.5 win-outset flex items-center gap-0.5 text-[11px] bg-win-bg active:win-inset font-bold hover:bg-gray-100 text-gray-800 disabled:opacity-40"
              >
                <Dice5 size={13} className="text-red-700" /> #{glitch1Seed % 1000}
              </button>
            </div>

            {/* GLITCH PASS 2 (第 2 道故障疊加) */}
            <div className="win-inset p-1.5 bg-blue-50/60 flex items-center gap-1.5 flex-wrap border border-blue-300/60">
              <div className="flex items-center gap-1 px-1 bg-blue-800 text-white text-[11px] font-bold py-0.5 rounded-sm">
                <Layers size={12} className="text-cyan-300" />
                <span>GLITCH_PASS 2 [第2道疊加]</span>
              </div>
              
              <select 
                value={glitch2Type} 
                onChange={(e) => setGlitch2Type(e.target.value as GlitchType)}
                className="text-[12px] bg-white win-inset px-1 py-0.5 outline-none font-bold text-blue-900 flex-1 min-w-[130px]"
              >
                <option value="none">[OFF] 無特效 (不疊加)</option>
                <option value="byte_corrupt">Byte Invert (0&1 破圖區塊)</option>
                <option value="tear">VRAM Tear (水平切片撕裂)</option>
                <option value="rgb_split">RGB Split (色散分離位移)</option>
                <option value="scanline_drop">Sync Loss (信號丟失掃描線)</option>
                <option value="chaos">★ FULL CHAOS (複合崩潰)</option>
              </select>

              <div className="flex items-center gap-1 pl-1">
                <span className="text-[11px] font-bold text-gray-700">強度:</span>
                <input 
                  type="range" 
                  min="5" 
                  max="100" 
                  step="5"
                  value={glitch2Intensity} 
                  disabled={glitch2Type === "none"}
                  onChange={(e) => setGlitch2Intensity(Number(e.target.value))}
                  className="w-14 sm:w-16 h-3"
                />
                <span className="text-[11px] w-6 text-right font-mono font-bold text-blue-700">{glitch2Intensity}%</span>
              </div>

              <button 
                onClick={randomizePass2}
                title="Randomize Pass 2 seed"
                disabled={glitch2Type === "none"}
                className="px-1.5 py-0.5 win-outset flex items-center gap-0.5 text-[11px] bg-win-bg active:win-inset font-bold hover:bg-gray-100 text-gray-800 disabled:opacity-40"
              >
                <Dice5 size={13} className="text-blue-700" /> #{glitch2Seed % 1000}
              </button>
            </div>

          </div>

          {/* Row 3: Resolution, Contrast & Export Configs */}
          <div className="win-inset p-1 bg-gray-100 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] uppercase font-bold text-win-blue">Resolution:</span>
                <input 
                  type="range" 
                  min="0.05" 
                  max="1.0" 
                  step="0.05"
                  value={pixelScale} 
                  onChange={(e) => setPixelScale(Number(e.target.value))}
                  className="w-16 sm:w-20 h-3"
                />
                <span className="text-[12px] w-8 text-right font-mono font-bold text-gray-800">{(pixelScale * 100).toFixed(0)}%</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] uppercase font-bold text-win-blue">Contrast:</span>
                <input 
                  type="range" 
                  min="0.5" 
                  max="3.0" 
                  step="0.1"
                  value={contrast} 
                  onChange={(e) => setContrast(Number(e.target.value))}
                  className="w-14 sm:w-16 h-3"
                />
                <span className="text-[12px] w-6 text-right font-mono font-bold text-gray-800">{contrast.toFixed(1)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap ml-auto">
              <div className="flex items-center gap-1">
                <span className="text-[11px] uppercase font-bold text-gray-700">Export_Scale:</span>
                <select 
                  value={exportSizeMode} 
                  onChange={(e) => setExportSizeMode(e.target.value as ExportSizeMode)}
                  className="text-[12px] bg-white win-inset px-1 py-0.5 outline-none font-bold text-win-blue"
                >
                  <option value="original">Original (原圖等比放大)</option>
                  <option value="native_low">1:1 Raw Pixels (純低解析度原檔)</option>
                  <option value="2x">2X Pixel Blocks</option>
                  <option value="4x">4X Pixel Blocks</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-[11px] uppercase font-bold text-gray-600">Format:</span>
                <select 
                  value={exportFormat} 
                  onChange={(e) => setExportFormat(e.target.value as "png" | "jpeg")}
                  className="text-[12px] bg-white win-inset px-1 py-0.5 outline-none font-bold"
                >
                  <option value="png">PNG (無損)</option>
                  <option value="jpeg">JPG</option>
                </select>
              </div>

              <button 
                onClick={randomizeBothSeeds}
                title="Randomize both Glitch Pass 1 and Pass 2 seeds"
                className="px-2 py-0.5 win-outset flex items-center gap-1 text-[11px] bg-yellow-100 active:win-inset font-bold hover:bg-yellow-200 text-gray-900 ml-1"
              >
                <Dice5 size={13} className="text-red-700" /> Reroll_Both
              </button>
            </div>
          </div>

        </div>

        {/* Desktop Workspace: Dual Pane / 1:1 Pixel Inspection View */}
        <div className="flex flex-1 min-h-[560px] overflow-hidden bg-gray-200">
          <main className="flex-1 p-2 sm:p-3 overflow-hidden flex flex-col">
            <div className={`grid gap-2 sm:gap-3 h-full ${viewLayout === 'split' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
              
              {/* Source Buffer (Hidden if output_full) */}
              {viewLayout !== "output_full" && (
                <div className="flex flex-col gap-1 min-h-[400px]">
                  <div className="text-[12px] font-bold uppercase text-win-blue flex items-center justify-between px-1 bg-gray-100 py-1 win-inset">
                    <span className="flex items-center gap-1.5"><Layout size={14} /> Source_Buffer [Original]</span>
                    {sourceDimensions && (
                      <span className="text-[11px] text-gray-700 font-mono font-bold">
                        {sourceDimensions.width} × {sourceDimensions.height} px
                      </span>
                    )}
                  </div>
                  
                  <div 
                    onDrop={onDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => !file && fileInputRef.current?.click()}
                    className="flex-1 bg-white win-inset flex items-center justify-center relative group cursor-pointer overflow-hidden p-2 min-h-[340px]"
                  >
                     <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                     {!file ? (
                       <div className="flex flex-col items-center gap-3 text-win-border-dark p-6 text-center">
                          <div className="w-12 h-12 win-outset bg-win-bg flex items-center justify-center text-win-blue">
                            <Upload size={28} />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-gray-800">DRAG & DROP IMAGE HERE</p>
                            <p className="text-[12px] text-gray-500 font-mono">PNG, JPG, WEBP SUPPORTED</p>
                          </div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                            className="px-3 py-1.5 win-outset bg-win-bg text-[12px] font-bold hover:bg-gray-100"
                          >
                            Browse Files...
                          </button>
                       </div>
                     ) : (
                       <div className="relative w-full h-full flex items-center justify-center overflow-auto">
                         <img 
                          src={preview!} 
                          className="max-w-full max-h-[460px] object-contain shadow-sm"
                          alt="Input Source" 
                         />
                       </div>
                     )}
                  </div>
                </div>
              )}

              {/* VGA / CRT Glitch & 1:1 Pixel Output Viewport */}
              <div className="flex flex-col gap-1 min-h-[400px] flex-1">
                
                {/* Viewport Control Bar with 1:1 Actual Pixel Zoom */}
                <div className="text-[12px] font-bold uppercase text-win-blue flex items-center justify-between px-1 bg-gray-100 py-1 win-inset flex-wrap gap-1">
                  <div className="flex items-center gap-1.5 text-red-900">
                    <Monitor size={14} className="text-red-700" /> 
                    <span>VGA_BITMAP_OUTPUT</span>
                    {lowResDimensions && (
                      <span className="text-[11px] bg-gray-800 text-green-400 px-1 py-0.2 font-mono">
                        VRAM: {lowResDimensions.width}×{lowResDimensions.height}
                      </span>
                    )}
                  </div>

                  {/* 1:1 Actual Zoom Controls */}
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-gray-600 font-bold">VIEW ZOOM:</span>
                    
                    <button 
                      onClick={() => setZoomMode("fit")}
                      title="Fit entire image to window"
                      className={`px-1.5 py-0.5 win-outset text-[11px] font-bold ${zoomMode === 'fit' ? 'bg-win-blue text-white' : 'bg-win-bg text-black'}`}
                    >
                      FIT
                    </button>
                    
                    <button 
                      onClick={() => { setZoomMode("100"); resetPan(); }}
                      title="View at exact 1:1 physical pixel scale (zero downscale blur!)"
                      className={`px-2 py-0.5 win-outset text-[11px] font-bold inline-flex items-center gap-1 ${zoomMode === '100' ? 'bg-win-blue text-white' : 'bg-yellow-200 text-black border-win-blue'}`}
                    >
                      <Star size={11} className="shrink-0" /> 1:1 (100% 實際畫素)
                    </button>

                    <button 
                      onClick={() => { setZoomMode("200"); resetPan(); }}
                      title="2X Pixel magnification"
                      className={`px-1.5 py-0.5 win-outset text-[11px] font-bold ${zoomMode === '200' ? 'bg-win-blue text-white' : 'bg-win-bg text-black'}`}
                    >
                      200%
                    </button>

                    <button 
                      onClick={() => { setZoomMode("400"); resetPan(); }}
                      title="4X Pixel matrix inspection"
                      className={`px-1.5 py-0.5 win-outset text-[11px] font-bold ${zoomMode === '400' ? 'bg-win-blue text-white' : 'bg-win-bg text-black'}`}
                    >
                      400%
                    </button>

                    <button 
                      onClick={() => { setZoomMode("800"); resetPan(); }}
                      title="8X Extreme bit matrix inspection"
                      className={`px-1.5 py-0.5 win-outset text-[11px] font-bold ${zoomMode === '800' ? 'bg-win-blue text-white' : 'bg-win-bg text-black'}`}
                    >
                      800%
                    </button>

                    {zoomMode !== "fit" && (
                      <button 
                        onClick={resetPan}
                        title="Reset Pan Position"
                        className="px-1.5 py-0.5 win-outset text-[11px] bg-win-bg text-gray-800 hover:bg-gray-100"
                      >
                        Reset Pan
                      </button>
                    )}
                  </div>
                </div>

                {/* Main Viewport Container */}
                <div 
                  ref={outputViewportRef}
                  onWheel={handleWheel}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  className={`flex-1 win-inset alpha-checkerboard flex items-center justify-center relative overflow-hidden p-0 select-none min-h-[400px] ${zoomMode !== 'fit' ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'}`}
                >
                  
                  {/* CRT Scanline Overlay Texture (Optional) */}
                  {showScanlinesOverlay && (
                    <div className="absolute inset-0 crt-scanlines pointer-events-none z-20 opacity-30" />
                  )}

                  {/* Zoom Level & Mode HUD */}
                  <div className="absolute top-2 left-2 z-30 bg-black/80 text-green-400 font-mono text-[11px] px-2 py-1 border border-green-700/50 shadow flex items-center gap-2 pointer-events-none">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                    <span>SCALE: {zoomMode === "fit" ? "FIT (縮放適應)" : `${zoomMode}% (1:1 原始像素真實比例)`}</span>
                    {zoomMode !== "fit" && <span className="text-gray-400 inline-flex items-center gap-1">| <Mouse size={12} /> 滾輪縮放 / 拖曳平移</span>}
                  </div>

                  {/* Hold Space to Compare Tooltip */}
                  {file && processedUrl && (
                    <div className="absolute top-2 right-2 z-30 flex items-center gap-1">
                      <button
                        onMouseDown={() => setIsHoldingOriginal(true)}
                        onMouseUp={() => setIsHoldingOriginal(false)}
                        onMouseLeave={() => setIsHoldingOriginal(false)}
                        className="bg-black/80 text-yellow-300 hover:text-white font-mono text-[11px] px-2 py-1 border border-yellow-600/50 shadow flex items-center gap-1 active:bg-yellow-600 active:text-black cursor-pointer"
                        title="按住此按鈕可即時對照原圖"
                      >
                        <Eye size={12} /> [按住對照原圖]
                      </button>
                    </div>
                  )}

                  <AnimatePresence mode="wait">
                    {isProcessing ? (
                      <motion.div key="p" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-2 text-win-bg z-30">
                        <RefreshCw size={32} className="animate-spin text-yellow-400" />
                        <span className="text-[13px] font-mono tracking-widest text-green-400 animate-pulse font-bold">
                          [STACKING_2-PASS_VRAM_GLITCH...]
                        </span>
                        <span className="text-[11px] text-gray-400 font-mono">Applying Pass 1 ({glitch1Type}) + Pass 2 ({glitch2Type})</span>
                      </motion.div>
                    ) : processedUrl ? (
                      <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
                        
                        {/* The Actual Scaled / 1:1 Pixel Canvas Image */}
                        <div 
                          style={{
                            transform: zoomMode === "fit" 
                              ? "none" 
                              : `translate(${panOffset.x}px, ${panOffset.y}px) scale(${getDisplayZoom()})`,
                            transformOrigin: "center center",
                            transition: isDragging ? "none" : "transform 0.15s ease-out"
                          }}
                          className="flex items-center justify-center"
                        >
                          <img 
                            src={isHoldingOriginal ? preview! : processedUrl} 
                            style={{
                              maxWidth: zoomMode === "fit" ? "100%" : "none",
                              maxHeight: zoomMode === "fit" ? "420px" : "none",
                              imageRendering: "pixelated"
                            }}
                            className="pixelated shadow-2xl pointer-events-none select-none"
                            alt="Processed Glitch Output" 
                          />
                        </div>

                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-win-border-dark/60 z-30 p-6 text-center">
                        <Monitor size={56} strokeWidth={1} className="text-gray-600" />
                        <span className="text-[12px] font-mono text-gray-400 font-bold">READY FOR 2-PASS VRAM RENDERING</span>
                        <span className="text-[11px] text-gray-600">UPLOAD AN IMAGE TO GENERATE DUAL-LAYER GLITCH & DITHER</span>
                      </div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Bottom Action Row: Download and Quick Reroll */}
                {processedUrl && (
                  <div className="flex items-center gap-2 mt-1 bg-gray-100 p-1 win-inset flex-wrap">
                    <a 
                      href={processedUrl}
                      download={`retro_bitmap_${ditherType}_${colorDepth}_${Date.now()}.${exportFormat === 'jpeg' ? 'jpg' : 'png'}`}
                      className="px-4 py-1.5 win-outset bg-yellow-200 hover:bg-yellow-300 text-black text-sm font-bold flex items-center gap-1.5 shadow active:win-inset"
                    >
                      <FileDown size={16} className="text-win-blue" /> 
                      DOWNLOAD {exportFormat.toUpperCase()} ({renderDimensions ? `${renderDimensions.width}×${renderDimensions.height} px` : ""})
                    </a>

                    <button 
                      onClick={randomizeBothSeeds}
                      title="Re-generate both glitch layers"
                      className="px-3 py-1.5 win-outset bg-win-bg text-black text-sm font-bold hover:bg-gray-100 flex items-center gap-1 active:win-inset"
                    >
                      <Dice5 size={16} className="text-red-700" /> Reroll Both Glitches
                    </button>

                    <div className="ml-auto text-[11px] text-gray-600 font-mono hidden sm:flex items-center gap-1">
                      <Star size={11} className="shrink-0" /> 雙層特效已啟用：可自由搭配 <b>切片撕裂 + 0&1 破圖</b> 或 <b>色散分離 + 掃描線丟失</b> 等任意組合！
                    </div>
                  </div>
                )}

              </div>

            </div>
          </main>
        </div>

        {/* Status Bar */}
        <div className="h-8 bg-win-bg border-t border-win-border-dark flex items-center px-1.5 gap-2 text-[12px] select-none">
          <div className="flex-1 win-inset px-2 truncate flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-green-600"></span>
            {error ? (
              <span className="text-red-700 font-bold">{error}</span>
            ) : file ? (
              <span>ACTIVE: <b>{file.name}</b> | P1: {glitch1Type.toUpperCase()} ({glitch1Intensity}%) | P2: {glitch2Type.toUpperCase()} ({glitch2Intensity}%) | DITHER: {ditherType.toUpperCase()}</span>
            ) : (
              "System Ready. Dual-Pass Glitch Pipeline initialized."
            )}
          </div>
          
          <div className="w-44 win-inset px-2 flex justify-between font-mono font-bold text-gray-800">
            <span className="text-gray-600">EXPORT:</span>
            <span>{renderDimensions ? `${renderDimensions.width}×${renderDimensions.height} px` : "0×0"}</span>
          </div>

          <div className="w-32 win-inset px-2 font-mono text-gray-700 text-[11px]">
            S1:#{glitch1Seed % 1000} | S2:#{glitch2Seed % 1000}
          </div>
        </div>
      </div>

      {/* Taskbar — was z-[-1], which painted it behind the page background so it never showed */}
      <div className="fixed bottom-0 left-0 right-0 h-11 bg-win-bg border-t-2 border-win-border-light flex items-center p-1 px-2 z-50 select-none">
        <a
          href="/"
          className="px-3 bg-win-bg win-outset flex items-center gap-2 font-bold italic h-full cursor-pointer hover:bg-gray-200 text-sm no-underline text-black active:win-inset"
        >
           <Home size={16} /> HOME
        </a>
        <a
          href="https://baybay030.github.io"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-2 px-2.5 win-outset h-full bg-win-bg flex items-center text-[12px] font-mono text-black no-underline hover:bg-gray-200 active:win-inset shrink-0"
        >
           ⊹ 𝘽🜁𝙔𝘽🜁𝙔
        </a>
        <div className="ml-2 px-2.5 win-inset h-full bg-win-bg hidden md:flex items-center text-[12px] font-mono text-win-border-dark">
           BIOS v4.51PG VRAM EMULATOR // 2-STAGE GLITCH STACK & 1:1 BITMAP ENGINE
        </div>
        <div className="ml-auto px-3 win-inset h-full bg-win-bg hidden sm:flex items-center text-[12px] font-mono text-win-border-dark">
           {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Range Slider & Custom Scrollbar styling */}
      <style dangerouslySetInnerHTML={{ __html: `
        body {
          cursor: auto;
        }
        input[type='range'] {
          -webkit-appearance: none;
          background: #808080;
          border: 1px inset #fff;
          outline: none;
        }
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 10px;
          height: 16px;
          background: #C0C0C0;
          border: 2px outset #fff;
          cursor: pointer;
        }
      `}} />
    </div>
  );
}
