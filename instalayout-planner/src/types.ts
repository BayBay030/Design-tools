export interface GridImage {
  id: string;
  url: string;
  x: number; // percentage offset
  y: number; // percentage offset
  scale: number;
  caption?: string;
  aspectRatio?: number;
  backgroundColor?: string;
}
