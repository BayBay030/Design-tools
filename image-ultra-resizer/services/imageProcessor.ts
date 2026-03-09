
// Use global 'JSZip' from CDN script
declare const JSZip: any;

import { ConversionResult, TargetOrientation } from '../types';

export const processImageFile = async (
  file: File,
  orientation: TargetOrientation,
  onProgress: (progress: number) => void
): Promise<ConversionResult[]> => {
  onProgress(10);

  // Load image using createImageBitmap for better performance
  const bitmap = await createImageBitmap(file);
  onProgress(30);

  const origW = bitmap.width;
  const origH = bitmap.height;
  const aspectRatio = origH / origW;
  
  const results: ConversionResult[] = [];
  const baseName = file.name.replace(/\.[^/.]+$/, "");

  // Helper to get scaled canvas
  const getScaledCanvas = (targetDim: number): HTMLCanvasElement => {
    let targetW: number, targetH: number;
    
    if (orientation === 'landscape') {
      targetW = targetDim;
      targetH = Math.round(targetDim * aspectRatio);
    } else {
      targetH = targetDim;
      targetW = Math.round(targetDim / aspectRatio);
    }

    const scaledCanvas = document.createElement('canvas');
    scaledCanvas.width = targetW;
    scaledCanvas.height = targetH;
    const ctx = scaledCanvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    }
    return scaledCanvas;
  };

  // Helper to convert canvas to blob
  const getBlob = (canvas: HTMLCanvasElement, type: string, quality: number = 0.9): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('生成影像數據失敗'));
      }, type, quality);
    });
  };

  // 1. XL JPG (Fixed 3200px)
  onProgress(50);
  const xlCanvas = getScaledCanvas(3200);
  const xlBlob = await getBlob(xlCanvas, 'image/jpeg', 0.95);
  results.push({
    id: 'xl',
    name: `${baseName}_XL.jpg`,
    blob: xlBlob,
    previewUrl: URL.createObjectURL(xlBlob),
    size: xlBlob.size,
    format: 'JPG (XL)',
    dimensions: { width: xlCanvas.width, height: xlCanvas.height }
  });

  // 2. S JPG (Fixed 1200px)
  onProgress(75);
  const sCanvas = getScaledCanvas(1200);
  const sBlob = await getBlob(sCanvas, 'image/jpeg', 0.85);
  results.push({
    id: 's',
    name: `${baseName}_S.jpg`,
    blob: sBlob,
    previewUrl: URL.createObjectURL(sBlob),
    size: sBlob.size,
    format: 'JPG (S)',
    dimensions: { width: sCanvas.width, height: sCanvas.height }
  });

  // 3. WebP (Fixed 920px)
  onProgress(90);
  const webpCanvas = getScaledCanvas(920);
  const webpBlob = await getBlob(webpCanvas, 'image/webp', 0.9);
  results.push({
    id: 'webp',
    name: `${baseName}.webp`,
    blob: webpBlob,
    previewUrl: URL.createObjectURL(webpBlob),
    size: webpBlob.size,
    format: 'WebP',
    dimensions: { width: webpCanvas.width, height: webpCanvas.height }
  });

  // Cleanup bitmap memory
  bitmap.close();

  onProgress(100);
  return results;
};

export const createZipPackage = async (
  results: ConversionResult[], 
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  const zip = new JSZip();
  results.forEach((res) => {
    zip.file(res.name, res.blob);
  });
  
  return await zip.generateAsync({ type: 'blob' }, (metadata: { percent: number }) => {
    if (onProgress) {
      onProgress(Math.round(metadata.percent));
    }
  });
};
