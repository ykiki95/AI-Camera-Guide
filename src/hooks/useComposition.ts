import { useMemo, useRef, useEffect } from 'react';
import { classifyScene, type DetectedObject, type SceneInfo } from '../utils/sceneClassifier';
import { evaluateComposition, type CompositionResult } from '../utils/compositionRules';

interface UseCompositionReturn {
  scene: SceneInfo;
  composition: CompositionResult;
}

export function useComposition(
  detections: DetectedObject[],
  frameWidth: number,
  frameHeight: number,
): UseCompositionReturn {
  const prevVibratedRef = useRef(false);

  const scene = useMemo(() => classifyScene(detections), [detections]);

  const composition = useMemo(
    () => evaluateComposition(scene.type, detections, frameWidth, frameHeight),
    [scene.type, detections, frameWidth, frameHeight],
  );

  useEffect(() => {
    if (composition.status === 'excellent' && !prevVibratedRef.current) {
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }
      prevVibratedRef.current = true;
    } else if (composition.status !== 'excellent') {
      prevVibratedRef.current = false;
    }
  }, [composition.status]);

  return { scene, composition };
}
