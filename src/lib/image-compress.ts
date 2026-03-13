/**
 * Compress image before upload. Resize to max 1920px, JPEG quality 0.82.
 * Reduces payload size for faster upload and lower OpenAI costs.
 */
const MAX_DIM = 1920;
const JPEG_QUALITY = 0.82;

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
