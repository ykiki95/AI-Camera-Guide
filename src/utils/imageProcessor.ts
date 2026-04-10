export function processImage(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  const brightness = 10;
  const contrast = 1.15;

  for (let i = 0; i < data.length; i += 4) {
    data[i] = clampByte((data[i] - 128) * contrast + 128 + brightness);
    data[i + 1] = clampByte((data[i + 1] - 128) * contrast + 128 + brightness);
    data[i + 2] = clampByte((data[i + 2] - 128) * contrast + 128 + brightness);
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function clampByte(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create blob'));
      },
      'image/jpeg',
      0.92,
    );
  });
}

export function downloadImage(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
