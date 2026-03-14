/**
 * Compress and enhance receipt images before upload.
 * - Resize to max 1920px, JPEG quality 0.82
 * - Increase contrast for better OCR
 * - Sharpen edges for receipt text
 * - Optional grayscale (receipts often read better without color noise)
 */
const MAX_DIM = 1920;
const JPEG_QUALITY = 0.82;

/** Apply contrast + sharpen via canvas. Improves receipt readability for AI. */
function enhanceReceiptImage(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;
  const contrast = 1.2;
  const offset = 128 * (1 - contrast);

  for (let i = 0; i < d.length; i += 4) {
    d[i] = Math.min(255, Math.max(0, d[i] * contrast + offset));
    d[i + 1] = Math.min(255, Math.max(0, d[i + 1] * contrast + offset));
    d[i + 2] = Math.min(255, Math.max(0, d[i + 2] * contrast + offset));
  }
  ctx.putImageData(imageData, 0, 0);

  // Light sharpen (3x3: center 9, neighbors -1). Edges stay as-is.
  const kernel = [-1, -1, -1, -1, 9, -1, -1, -1, -1];
  const out = new Uint8ClampedArray(d);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      for (let c = 0; c < 4; c++) {
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            sum += d[((y + ky) * w + (x + kx)) * 4 + c] * kernel[(ky + 1) * 3 + (kx + 1)];
          }
        }
        out[(y * w + x) * 4 + c] = Math.min(255, Math.max(0, sum));
      }
    }
  }
  for (let i = 0; i < d.length; i++) d[i] = out[i];
  ctx.putImageData(imageData, 0, 0);
}

/**
 * Prepare any receipt format (image or PDF) for scan API.
 * Images are compressed and enhanced. PDF first page is converted to JPEG.
 */
export async function prepareReceiptForUpload(file: File): Promise<string> {
  if (file.type === 'application/pdf') {
    const { pdfFirstPageToImageBlob } = await import('@/lib/pdf-to-image');
    const blob = await pdfFirstPageToImageBlob(file);
    const imageFile = new File([blob], 'receipt.jpg', { type: 'image/jpeg' });
    return compressImageForUpload(imageFile);
  }
  return compressImageForUpload(file);
}

export async function compressImageForUpload(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      let dw = w;
      let dh = h;
      if (w > MAX_DIM || h > MAX_DIM) {
        if (w > h) {
          dw = MAX_DIM;
          dh = Math.round((h * MAX_DIM) / w);
        } else {
          dh = MAX_DIM;
          dw = Math.round((w * MAX_DIM) / h);
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = dw;
      canvas.height = dh;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2d not available'));
        return;
      }
      ctx.drawImage(img, 0, 0, dw, dh);
      enhanceReceiptImage(ctx, dw, dh);

      const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const quality = mime === 'image/jpeg' ? JPEG_QUALITY : 0.9;

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('toBlob failed'));
            return;
          }
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64 || '');
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        },
        mime,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image load failed'));
    };

    img.src = url;
  });
}
