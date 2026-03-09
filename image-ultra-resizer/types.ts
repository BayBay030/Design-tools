
export type TargetOrientation = 'landscape' | 'portrait';

export interface ConversionResult {
  id: string;
  name: string;
  blob: Blob;
  previewUrl: string;
  size: number;
  format: 'JPG (XL)' | 'JPG (S)' | 'WebP';
  dimensions: { width: number; height: number };
}

export interface ProcessingState {
  isProcessing: boolean;
  progress: number;
  error: string | null;
}
