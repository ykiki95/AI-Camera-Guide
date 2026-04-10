import { useRef, useState, useCallback, useEffect } from 'react';
import type { DetectedObject } from '../utils/sceneClassifier';
import { extractContourPath } from '../utils/contourExtractor';
import { initSegmenter, isSegmenterReady, segmentFrame } from '../utils/segmentationEngine';

export interface DetectionWithContour extends DetectedObject {
  contourPath: string | null;
}

interface UseObjectDetectionReturn {
  isModelLoading: boolean;
  loadProgress: number;
  detections: DetectionWithContour[];
  startDetection: (video: HTMLVideoElement) => void;
  stopDetection: () => void;
}

export function useObjectDetection(): UseObjectDetectionReturn {
  const modelRef = useRef<any>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [detections, setDetections] = useState<DetectionWithContour[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadModel() {
      try {
        setLoadProgress(10);
        const tf = await import('@tensorflow/tfjs');
        if (cancelled) return;
        setLoadProgress(30);

        try {
          await tf.ready();
        } catch {
          await tf.setBackend('cpu');
          await tf.ready();
        }
        if (cancelled) return;
        setLoadProgress(50);

        const cocoSsd = await import('@tensorflow-models/coco-ssd');
        if (cancelled) return;
        setLoadProgress(60);

        const model = await cocoSsd.load({
          base: 'lite_mobilenet_v2',
        });
        if (cancelled) return;
        setLoadProgress(70);
        modelRef.current = model;

        setLoadProgress(80);
        initSegmenter().then((ready) => {
          if (!ready) {
            console.warn('MediaPipe 세그멘터 초기화 실패, fallback 모드로 동작');
          }
        }).catch((segErr) => {
          console.warn('Segmenter init failed:', segErr);
        });
        if (cancelled) return;
        setLoadProgress(100);

        setIsModelLoading(false);
      } catch (err) {
        console.error('Failed to load models:', err);
        setIsModelLoading(false);
      }
    }

    loadModel();

    return () => {
      cancelled = true;
    };
  }, []);

  const stopDetection = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startDetection = useCallback(
    (video: HTMLVideoElement) => {
      stopDetection();

      let isProcessing = false;

      intervalRef.current = setInterval(async () => {
        if (!modelRef.current || video.readyState < 2 || isProcessing) return;
        isProcessing = true;

        try {
          const predictions = await modelRef.current.detect(video);

          const sorted = predictions
            .filter((p: any) => p.score >= 0.4)
            .sort((a: any, b: any) => {
              const isPrimaryA = a.class === 'person' ? 1 : 0;
              const isPrimaryB = b.class === 'person' ? 1 : 0;
              if (isPrimaryA !== isPrimaryB) return isPrimaryB - isPrimaryA;
              return (b.bbox[2] * b.bbox[3] * b.score) - (a.bbox[2] * a.bbox[3] * a.score);
            })
            .slice(0, 2);

          const timestamp = performance.now();
          const segResult = isSegmenterReady() ? segmentFrame(video, timestamp) : null;

          const mapped: DetectionWithContour[] = sorted.map((p: any) => {
            const bbox = p.bbox as [number, number, number, number];
            let contourPath: string | null = null;

            try {
              if (segResult) {
                contourPath = extractContourPath(
                  segResult.categoryMask,
                  segResult.confidenceMask,
                  segResult.width,
                  segResult.height,
                  bbox,
                  video,
                );
              }
            } catch {
              contourPath = null;
            }

            return {
              class: p.class,
              score: p.score,
              bbox,
              contourPath,
            };
          });
          setDetections(mapped);
        } catch {
          // skip frame
        } finally {
          isProcessing = false;
        }
      }, 800);
    },
    [stopDetection],
  );

  useEffect(() => {
    return () => {
      stopDetection();
    };
  }, [stopDetection]);

  return {
    isModelLoading,
    loadProgress,
    detections,
    startDetection,
    stopDetection,
  };
}
