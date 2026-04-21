declare module 'gifshot' {
  interface GifOptions {
    images: string[];
    interval?: number;
    gifWidth?: number;
    gifHeight?: number;
    numWorkers?: number;
    transparent?: string | null;
    frameDuration?: number;
    sampleInterval?: number;
    numFrames?: number;
    fontWeight?: string;
    fontSize?: string;
    fontFamily?: string;
    fontColor?: string;
    textAlign?: string;
    textBaseline?: string;
    text?: string;
    watermark?: string;
    watermarkHeight?: number;
    watermarkWidth?: number;
    watermarkX?: number;
    watermarkY?: number;
  }

  interface GifResult {
    error: boolean;
    errorCode?: string;
    errorMsg?: string;
    image: string;
  }

  export function createGIF(options: GifOptions, callback: (obj: GifResult) => void): void;
}
