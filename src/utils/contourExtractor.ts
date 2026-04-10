interface Pt { x: number; y: number }

let _offCanvas: HTMLCanvasElement | null = null;
let _offCtx: CanvasRenderingContext2D | null = null;

function getOffCtx(w: number, h: number): CanvasRenderingContext2D {
  if (!_offCanvas) {
    _offCanvas = document.createElement('canvas');
    _offCtx = _offCanvas.getContext('2d', { willReadFrequently: true })!;
  }
  _offCanvas.width = w;
  _offCanvas.height = h;
  return _offCtx!;
}

export function extractContourPath(
  segMask: Uint8Array | null,
  confMask: Float32Array | null,
  maskWidth: number,
  maskHeight: number,
  bbox: [number, number, number, number],
  videoElement: HTMLVideoElement,
): string | null {
  if (!segMask || maskWidth === 0 || maskHeight === 0) return null;

  const [bx, by, bw, bh] = bbox;
  if (bw < 30 || bh < 30) return null;

  const videoW = videoElement.videoWidth;
  const videoH = videoElement.videoHeight;
  const scaleX = maskWidth / videoW;
  const scaleY = maskHeight / videoH;

  const cmx = Math.max(0, Math.floor(bx * scaleX));
  const cmy = Math.max(0, Math.floor(by * scaleY));
  const cmw = Math.min(maskWidth - cmx, Math.ceil(bw * scaleX));
  const cmh = Math.min(maskHeight - cmy, Math.ceil(bh * scaleY));
  if (cmw < 5 || cmh < 5) return null;

  const localMask = new Uint8Array(cmw * cmh);
  for (let y = 0; y < cmh; y++) {
    for (let x = 0; x < cmw; x++) {
      const srcIdx = (cmy + y) * maskWidth + (cmx + x);
      localMask[y * cmw + x] = segMask[srcIdx] > 0 ? 1 : 0;
    }
  }

  if (confMask && confMask.length === maskWidth * maskHeight) {
    for (let y = 0; y < cmh; y++) {
      for (let x = 0; x < cmw; x++) {
        if (isBorderInLocal(localMask, cmw, cmh, x, y, 5)) {
          const srcIdx = (cmy + y) * maskWidth + (cmx + x);
          if (confMask[srcIdx] < 0.5) {
            localMask[y * cmw + x] = 0;
          }
        }
      }
    }
  }

  const SAMPLE_SIZE = 300;
  const maxDim = Math.max(bw, bh);
  const sampleW = Math.max(30, Math.round(SAMPLE_SIZE * (bw / maxDim)));
  const sampleH = Math.max(30, Math.round(SAMPLE_SIZE * (bh / maxDim)));

  const ctx = getOffCtx(sampleW, sampleH);
  ctx.drawImage(videoElement, bx, by, bw, bh, 0, 0, sampleW, sampleH);
  const imgData = ctx.getImageData(0, 0, sampleW, sampleH);
  const gray = toGrayscale(imgData.data, sampleW, sampleH);

  const blurred = gaussianBlur(gray, sampleW, sampleH, 1.4);
  const edgeMask = cannyEdgeDetection(blurred, sampleW, sampleH);

  const refined = refineContourWithEdges(localMask, edgeMask, cmw, cmh, sampleW, sampleH, 5);

  const contourPts = traceContourBoundary(refined, cmw, cmh, cmx, cmy, scaleX, scaleY);
  if (contourPts.length < 10) return null;

  const simplified = douglasPeucker(contourPts, Math.min(bw, bh) * 0.008);
  if (simplified.length < 6) return null;

  const smooth = chaikinSmooth(simplified, 3);
  return buildPath(smooth);
}

function isBorderInLocal(mask: Uint8Array, W: number, H: number, x: number, y: number, r: number): boolean {
  const val = mask[y * W + x];
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
        if (mask[ny * W + nx] !== val) return true;
      }
    }
  }
  return false;
}

function toGrayscale(rgba: Uint8ClampedArray, w: number, h: number): Float32Array {
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    gray[i] = (0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2]) / 255;
  }
  return gray;
}

function gaussianBlur(gray: Float32Array, w: number, h: number, sigma: number): Float32Array {
  const ks = Math.ceil(sigma * 3) * 2 + 1;
  const half = (ks - 1) / 2;
  const kernel = new Float32Array(ks);
  let sum = 0;
  for (let i = 0; i < ks; i++) {
    const d = i - half;
    kernel[i] = Math.exp(-(d * d) / (2 * sigma * sigma));
    sum += kernel[i];
  }
  for (let i = 0; i < ks; i++) kernel[i] /= sum;

  const temp = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = 0;
      for (let k = 0; k < ks; k++) {
        const sx = Math.min(w - 1, Math.max(0, x + k - half));
        v += gray[y * w + sx] * kernel[k];
      }
      temp[y * w + x] = v;
    }
  }

  const out = new Float32Array(w * h);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let v = 0;
      for (let k = 0; k < ks; k++) {
        const sy = Math.min(h - 1, Math.max(0, y + k - half));
        v += temp[sy * w + x] * kernel[k];
      }
      out[y * w + x] = v;
    }
  }
  return out;
}

function cannyEdgeDetection(gray: Float32Array, w: number, h: number): Uint8Array {
  const mag = new Float32Array(w * h);
  const dir = new Float32Array(w * h);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const sx = -gray[(y-1)*w+(x-1)] + gray[(y-1)*w+(x+1)]
                - 2*gray[y*w+(x-1)] + 2*gray[y*w+(x+1)]
                - gray[(y+1)*w+(x-1)] + gray[(y+1)*w+(x+1)];
      const sy = -gray[(y-1)*w+(x-1)] - 2*gray[(y-1)*w+x] - gray[(y-1)*w+(x+1)]
                + gray[(y+1)*w+(x-1)] + 2*gray[(y+1)*w+x] + gray[(y+1)*w+(x+1)];
      mag[idx] = Math.sqrt(sx * sx + sy * sy);
      dir[idx] = Math.atan2(sy, sx);
    }
  }

  let maxMag = 0;
  for (let i = 0; i < mag.length; i++) {
    if (mag[i] > maxMag) maxMag = mag[i];
  }
  if (maxMag > 0) {
    for (let i = 0; i < mag.length; i++) mag[i] /= maxMag;
  }

  const nms = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const m = mag[idx];
      if (m === 0) continue;

      let angle = (dir[idx] * 180 / Math.PI + 180) % 180;
      let n1 = 0, n2 = 0;

      if (angle < 22.5 || angle >= 157.5) {
        n1 = mag[y * w + (x - 1)];
        n2 = mag[y * w + (x + 1)];
      } else if (angle < 67.5) {
        n1 = mag[(y - 1) * w + (x + 1)];
        n2 = mag[(y + 1) * w + (x - 1)];
      } else if (angle < 112.5) {
        n1 = mag[(y - 1) * w + x];
        n2 = mag[(y + 1) * w + x];
      } else {
        n1 = mag[(y - 1) * w + (x - 1)];
        n2 = mag[(y + 1) * w + (x + 1)];
      }

      nms[idx] = (m >= n1 && m >= n2) ? m : 0;
    }
  }

  const lowT = 0.05;
  const highT = 0.15;
  const out = new Uint8Array(w * h);
  const strong: number[] = [];

  for (let i = 0; i < w * h; i++) {
    if (nms[i] >= highT) {
      out[i] = 1;
      strong.push(i);
    }
  }

  const deltas: [number, number][] = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
  while (strong.length) {
    const idx = strong.pop()!;
    const px = idx % w;
    const py = (idx / w) | 0;
    for (const [dy, dx] of deltas) {
      const nx = px + dx, ny = py + dy;
      if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
        const ni = ny * w + nx;
        if (!out[ni] && nms[ni] >= lowT) {
          out[ni] = 1;
          strong.push(ni);
        }
      }
    }
  }
  return out;
}

function refineContourWithEdges(
  segMask: Uint8Array,
  edgeMask: Uint8Array,
  segW: number,
  segH: number,
  edgeW: number,
  edgeH: number,
  borderWidth: number,
): Uint8Array {
  const out = new Uint8Array(segW * segH);
  out.set(segMask);

  const exScale = edgeW / segW;
  const eyScale = edgeH / segH;

  for (let y = 0; y < segH; y++) {
    for (let x = 0; x < segW; x++) {
      const idx = y * segW + x;
      if (!isBorderInLocal(segMask, segW, segH, x, y, borderWidth)) continue;

      const ex = Math.min(edgeW - 1, Math.round(x * exScale));
      const ey = Math.min(edgeH - 1, Math.round(y * eyScale));

      let hasEdgeNearby = false;
      for (let dy = -1; dy <= 1 && !hasEdgeNearby; dy++) {
        for (let dx = -1; dx <= 1 && !hasEdgeNearby; dx++) {
          const nex = ex + dx, ney = ey + dy;
          if (nex >= 0 && nex < edgeW && ney >= 0 && ney < edgeH) {
            if (edgeMask[ney * edgeW + nex]) hasEdgeNearby = true;
          }
        }
      }

      if (hasEdgeNearby) {
        let fgCount = 0;
        let bgCount = 0;
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < segW && ny >= 0 && ny < segH) {
              if (segMask[ny * segW + nx]) fgCount++;
              else bgCount++;
            }
          }
        }
        out[idx] = fgCount > bgCount ? 1 : 0;
      }
    }
  }
  return out;
}

function traceContourBoundary(
  mask: Uint8Array,
  w: number,
  h: number,
  offsetX: number,
  offsetY: number,
  scaleX: number,
  scaleY: number,
): Pt[] {
  const padW = w + 2;
  const padH = h + 2;
  const padded = new Uint8Array(padW * padH);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      padded[(y + 1) * padW + (x + 1)] = mask[y * w + x];
    }
  }

  let startX = -1, startY = -1;
  outer: for (let y = 0; y < padH - 1; y++) {
    for (let x = 0; x < padW - 1; x++) {
      const cell = cellIdx(padded, padW, x, y);
      if (cell > 0 && cell < 15) {
        startX = x;
        startY = y;
        break outer;
      }
    }
  }
  if (startX === -1) return [];

  const pts: Pt[] = [];
  let cx = startX, cy = startY;
  let prevDir = 0;
  const maxIter = (padW + padH) * 6;
  const visitCount = new Map<string, number>();

  for (let iter = 0; iter < maxIter; iter++) {
    const key = `${cx},${cy}`;
    const vc = visitCount.get(key) || 0;
    if (vc >= 2) break;
    visitCount.set(key, vc + 1);

    if (iter > 2 && cx === startX && cy === startY) break;

    const cell = cellIdx(padded, padW, cx, cy);
    const ep = interpEdgePoint(cell, cx, cy, prevDir);
    if (ep) {
      const rx = (offsetX + (ep.x - 1)) / scaleX;
      const ry = (offsetY + (ep.y - 1)) / scaleY;
      pts.push({ x: rx, y: ry });
    }

    const [dx, dy] = marchDir(cell, prevDir);
    if (dx === 0 && dy === 0) break;

    prevDir = dirCode(dx, dy);
    cx += dx;
    cy += dy;
    if (cx < 0 || cx >= padW - 1 || cy < 0 || cy >= padH - 1) break;
  }
  return pts;
}

function cellIdx(mask: Uint8Array, w: number, x: number, y: number): number {
  const tl = mask[y * w + x] ? 1 : 0;
  const tr = mask[y * w + (x + 1)] ? 1 : 0;
  const br = mask[(y + 1) * w + (x + 1)] ? 1 : 0;
  const bl = mask[(y + 1) * w + x] ? 1 : 0;
  return (tl << 3) | (tr << 2) | (br << 1) | bl;
}

function interpEdgePoint(cell: number, x: number, y: number, prevDir: number): Pt | null {
  switch (cell) {
    case 1:  return { x: x,     y: y + 0.5 };
    case 2:  return { x: x + 0.5, y: y + 1 };
    case 3:  return { x: x,     y: y + 0.5 };
    case 4:  return { x: x + 1,   y: y + 0.5 };
    case 5:
      return prevDir === 3 ? { x: x, y: y + 0.5 } : { x: x + 1, y: y + 0.5 };
    case 6:  return { x: x + 0.5, y: y + 1 };
    case 7:  return { x: x + 0.5, y: y };
    case 8:  return { x: x + 0.5, y: y };
    case 9:  return { x: x + 0.5, y: y };
    case 10:
      return prevDir === 2 ? { x: x + 0.5, y: y + 1 } : { x: x + 0.5, y: y };
    case 11: return { x: x,     y: y + 0.5 };
    case 12: return { x: x + 1,   y: y + 0.5 };
    case 13: return { x: x + 0.5, y: y + 1 };
    case 14: return { x: x + 0.5, y: y };
    default: return null;
  }
}

function marchDir(cell: number, prevDir: number): [number, number] {
  switch (cell) {
    case 1:  return [ 0,  1];
    case 2:  return [ 1,  0];
    case 3:  return [ 1,  0];
    case 4:  return [ 0, -1];
    case 5:
      return prevDir === 3 ? [0, 1] : [0, -1];
    case 6:  return [ 0,  1];
    case 7:  return [ 1,  0];
    case 8:  return [-1,  0];
    case 9:  return [ 0, -1];
    case 10:
      return prevDir === 2 ? [-1, 0] : [1, 0];
    case 11: return [-1,  0];
    case 12: return [-1,  0];
    case 13: return [ 0,  1];
    case 14: return [ 0, -1];
    default: return [ 0,  0];
  }
}

function dirCode(dx: number, dy: number): number {
  if (dx === 1)  return 0;
  if (dx === -1) return 1;
  if (dy === 1)  return 2;
  return 3;
}

function douglasPeucker(pts: Pt[], eps: number): Pt[] {
  if (pts.length <= 2) return pts;
  let maxD = 0, maxI = 0;
  const a = pts[0], b = pts[pts.length - 1];
  for (let i = 1; i < pts.length - 1; i++) {
    const d = perpDist(pts[i], a, b);
    if (d > maxD) { maxD = d; maxI = i; }
  }
  if (maxD > eps) {
    const l = douglasPeucker(pts.slice(0, maxI + 1), eps);
    const r = douglasPeucker(pts.slice(maxI), eps);
    return [...l.slice(0, -1), ...r];
  }
  return [a, b];
}

function perpDist(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function chaikinSmooth(pts: Pt[], iterations: number): Pt[] {
  let current = pts;
  for (let iter = 0; iter < iterations; iter++) {
    const next: Pt[] = [];
    for (let i = 0; i < current.length; i++) {
      const a = current[i];
      const b = current[(i + 1) % current.length];
      next.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 });
      next.push({ x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 });
    }
    current = next;
  }
  return current;
}

function buildPath(pts: Pt[]): string {
  if (pts.length < 3) return '';
  const n = pts.length;
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < n; i++) {
    d += ` L ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`;
  }
  d += ' Z';
  return d;
}

export function translateContourPath(path: string, ox: number, oy: number): string {
  return path.replace(
    /(-?\d+\.?\d*)\s+(-?\d+\.?\d*)/g,
    (_, xs, ys) => `${(parseFloat(xs) + ox).toFixed(1)} ${(parseFloat(ys) + oy).toFixed(1)}`,
  );
}

export function scaleContourPath(path: string, cx: number, cy: number, s: number): string {
  return path.replace(
    /(-?\d+\.?\d*)\s+(-?\d+\.?\d*)/g,
    (_, xs, ys) => {
      const x = cx + (parseFloat(xs) - cx) * s;
      const y = cy + (parseFloat(ys) - cy) * s;
      return `${x.toFixed(1)} ${y.toFixed(1)}`;
    },
  );
}
