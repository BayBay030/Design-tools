
import { PatternElement, GeneratorSettings } from '../types';

export const drawSeamlessElement = (
  ctx: CanvasRenderingContext2D,
  element: PatternElement,
  tileSize: number
) => {
  const { image, x, y, scale, rotation, opacity } = element;
  const w = image.width * scale;
  const h = image.height * scale;

  ctx.save();
  ctx.globalAlpha = opacity;

  for (let ox = -1; ox <= 1; ox++) {
    for (let oy = -1; oy <= 1; oy++) {
      const drawX = x + ox * tileSize;
      const drawY = y + oy * tileSize;

      const halfSize = Math.max(w, h);
      if (
        drawX + halfSize < 0 || 
        drawX - halfSize > tileSize || 
        drawY + halfSize < 0 || 
        drawY - halfSize > tileSize
      ) continue;

      ctx.save();
      ctx.translate(drawX, drawY);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(image, -w / 2, -h / 2, w, h);
      ctx.restore();
    }
  }

  ctx.restore();
};

export const generateElements = (
  images: HTMLImageElement[],
  settings: GeneratorSettings
): PatternElement[] => {
  if (images.length === 0) return [];

  const elements: PatternElement[] = [];
  const { tileSize, density, minScale, maxScale, rotationRange } = settings;
  
  // rotationRange here is treated as "Chaos" (0 to 360)
  const chaosFactor = rotationRange / 360; // 0.0 to 1.0

  const totalCount = Math.max(images.length, Math.floor(density * 15));
  
  // Calculate grid dimensions for "Ordered" logic
  const gridCols = Math.ceil(Math.sqrt(totalCount));
  const gridRows = Math.ceil(totalCount / gridCols);
  const cellW = tileSize / gridCols;
  const cellH = tileSize / gridRows;

  for (let i = 0; i < totalCount; i++) {
    const imgIndex = i < images.length ? i : Math.floor(Math.random() * images.length);
    const img = images[imgIndex];
    
    const row = Math.floor(i / gridCols);
    const col = i % gridCols;
    
    // Base grid position
    const baseX = col * cellW + cellW / 2;
    const baseY = row * cellH + cellH / 2;
    
    // Position Jitter increases with Chaos
    // At chaos 0, jitter is 0. At chaos 1, jitter allows moving anywhere in the tile.
    const jitterAmount = tileSize * chaosFactor * 0.8; 
    const jitterX = (Math.random() - 0.5) * jitterAmount;
    const jitterY = (Math.random() - 0.5) * jitterAmount;
    
    let x = (baseX + jitterX) % tileSize;
    let y = (baseY + jitterY) % tileSize;
    if (x < 0) x += tileSize;
    if (y < 0) y += tileSize;

    // Rotation is strictly 0 at Chaos 0, and fully random at Chaos 1
    const rotation = Math.random() * rotationRange;

    elements.push({
      id: Math.random().toString(36).substr(2, 9),
      image: img,
      x,
      y,
      scale: minScale + Math.random() * (maxScale - minScale) * (0.5 + 0.5 * chaosFactor),
      rotation,
      opacity: 1
    });
  }

  return elements;
};
