/**
 * Convert the first page of a PDF to a JPEG blob for receipt scanning.
 * Uses pdfjs-dist.
 */
import * as pdfjsLib from 'pdfjs-dist';

// Configure worker for browser (required by pdfjs-dist v4+)
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

export async function pdfFirstPageToImageBlob(file: File): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const scale = 2;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2d not available');

  const renderTask = page.render({
    canvasContext: ctx,
    canvas,
    viewport,
  });
  await renderTask.promise;

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('PDF to blob failed'))),
      'image/jpeg',
      0.9
    );
  });
}
