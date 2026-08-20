/**
 * BMP conversion utility to handle 32-bit images with alpha.
 */

export function convertTo32BitBMP(imageData: ImageData): ArrayBuffer {
  const { width, height, data } = imageData;
  const rowSize = width * 4;
  const dataSize = rowSize * height;
  const fileSize = 54 + dataSize;
  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // --- BMP File Header ---
  view.setUint8(0, 0x42); // 'B'
  view.setUint8(1, 0x4D); // 'M'
  view.setUint32(2, fileSize, true);
  view.setUint16(6, 0, true); // Reserved 1
  view.setUint16(8, 0, true); // Reserved 2
  view.setUint32(10, 54, true); // Offset to pixel data

  // --- BITMAPINFOHEADER ---
  view.setUint32(14, 40, true); // Info header size
  view.setUint32(18, width, true);
  view.setUint32(22, -height, true); // Negative height for top-down BMP
  view.setUint16(26, 1, true); // Planes
  view.setUint16(28, 32, true); // Bits per pixel
  view.setUint32(30, 0, true); // Compression (0 = BI_RGB)
  view.setUint32(34, dataSize, true); // Image size
  view.setUint32(38, 2835, true); // X pixels per meter (72 DPI)
  view.setUint32(42, 2835, true); // Y pixels per meter (72 DPI)
  view.setUint32(46, 0, true); // Total colors
  view.setUint32(50, 0, true); // Important colors

  // --- Pixel Data ---
  // Canvas data is RGBA, BMP is BGRA
  const pixelDataOffset = 54;
  for (let i = 0; i < dataSize; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    view.setUint8(pixelDataOffset + i, b);
    view.setUint8(pixelDataOffset + i + 1, g);
    view.setUint8(pixelDataOffset + i + 2, r);
    view.setUint8(pixelDataOffset + i + 3, a);
  }

  return buffer;
}
