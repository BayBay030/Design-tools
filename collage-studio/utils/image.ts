
import { ImageFile, CollageSettings, GridDimensions } from '../types';

export const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
};

export const calculateBestGrid = (
  count: number,
  avgAspectRatio: number,
  targetRatio: '5:4' | '4:5' | '1:1' | 'auto'
): { cols: number; rows: number } => {
  if (count === 0) return { cols: 1, rows: 1 };

  let bestCols = 1;
  let bestRows = count;
  let minDiff = Infinity;

  const targetValue = 
    targetRatio === '5:4' ? 1.25 : 
    targetRatio === '4:5' ? 0.8 : 
    targetRatio === '1:1' ? 1.0 : 1.0;

  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    const currentRatio = (cols / rows) * avgAspectRatio;
    const diff = Math.abs(currentRatio - targetValue);
    
    if (diff < minDiff) {
      minDiff = diff;
      bestCols = cols;
      bestRows = rows;
    }
  }
  
  return { cols: bestCols, rows: bestRows };
};

export const getDimensions = (
  images: ImageFile[],
  settings: CollageSettings
): GridDimensions => {
  const { columns, rows, gap, padding } = settings;
  
  // Base dimensions on the largest resolution available or a standard high-def base
  const refImg = images[0] || { width: 1200, height: 1200 };
  const cellWidth = refImg.width;
  const cellHeight = refImg.height;

  const totalWidth = (columns * cellWidth) + ((columns - 1) * gap) + (padding * 2);
  const totalHeight = (rows * cellHeight) + ((rows - 1) * gap) + (padding * 2);

  return {
    cols: columns,
    rows,
    cellWidth,
    cellHeight,
    totalWidth,
    totalHeight
  };
};
