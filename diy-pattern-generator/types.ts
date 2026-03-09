
export interface PatternElement {
  id: string;
  image: HTMLImageElement;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
}

export interface GeneratorSettings {
  tileSize: number;
  density: number;
  minScale: number;
  maxScale: number;
  rotationRange: number; // This will act as our "Chaos" (0-360)
  seed: number;
  backgroundColor: string;
  isTransparent: boolean;
}
