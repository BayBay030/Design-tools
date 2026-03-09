
export interface ImageTransform {
  scale: number;
  translateX: number;
  translateY: number;
  flipX: boolean;
  flipY: boolean;
}

export interface ImageFile {
  id: string;
  file: File;
  preview: string;
  width: number;
  height: number;
  aspectRatio: number;
  transform: ImageTransform;
}

export interface CollageSettings {
  columns: number;
  rows: number;
  gap: number;
  padding: number;
  backgroundColor: string;
  itemAspectRatio: number; // Width / Height ratio for each cell
  quality: number;
  borderRadius: number;
  borderWidth: number;
  borderColor: string;
}

export interface GridDimensions {
  cols: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
  totalWidth: number;
  totalHeight: number;
}
