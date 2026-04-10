import { ImageSegmenter, FilesetResolver } from '@mediapipe/tasks-vision';

let segmenter: ImageSegmenter | null = null;
let initPromise: Promise<boolean> | null = null;
let initDone = false;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

export async function initSegmenter(): Promise<boolean> {
  if (segmenter) return true;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const delegates: Array<'GPU' | 'CPU'> = ['GPU', 'CPU'];

    for (const delegate of delegates) {
      try {
        const vision = await withTimeout(
          FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
          ),
          8000,
          `FilesetResolver(${delegate})`,
        );

        segmenter = await withTimeout(
          ImageSegmenter.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite',
              delegate,
            },
            runningMode: 'VIDEO',
            outputCategoryMask: true,
            outputConfidenceMasks: true,
          }),
          10000,
          `ImageSegmenter(${delegate})`,
        );

        initDone = true;
        console.log(`MediaPipe ImageSegmenter ready (${delegate})`);
        return true;
      } catch (err) {
        console.warn(`Segmenter ${delegate} init failed:`, err);
      }
    }

    initDone = true;
    console.warn('MediaPipe Segmenter unavailable');
    return false;
  })();

  return initPromise;
}

export function isSegmenterReady(): boolean {
  return !!segmenter;
}

export function isSegmenterInitDone(): boolean {
  return initDone;
}

let _cachedTimestamp = -1;
let _cachedResult: {
  categoryMask: Uint8Array | null;
  confidenceMask: Float32Array | null;
  width: number;
  height: number;
} | null = null;

export function segmentFrame(
  video: HTMLVideoElement,
  timestamp: number,
): {
  categoryMask: Uint8Array | null;
  confidenceMask: Float32Array | null;
  width: number;
  height: number;
} | null {
  if (!segmenter) return null;

  if (_cachedTimestamp === timestamp && _cachedResult) {
    return _cachedResult;
  }

  try {
    const result = segmenter.segmentForVideo(video, timestamp);
    const catMask = result.categoryMask?.getAsUint8Array() || null;
    const confMask = result.confidenceMasks?.[0]?.getAsFloat32Array() || null;
    const w = result.categoryMask?.width || video.videoWidth;
    const h = result.categoryMask?.height || video.videoHeight;

    _cachedResult = {
      categoryMask: catMask ? new Uint8Array(catMask) : null,
      confidenceMask: confMask ? new Float32Array(confMask) : null,
      width: w,
      height: h,
    };
    _cachedTimestamp = timestamp;

    result.close();
    return _cachedResult;
  } catch {
    return null;
  }
}
