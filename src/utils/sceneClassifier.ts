export type SceneType = 'portrait' | 'food' | 'landscape' | 'general';

export interface SceneInfo {
  type: SceneType;
  label: string;
  icon: string;
  confidence: number;
}

const PERSON_CLASSES = ['person'];
const FOOD_CLASSES = [
  'bowl', 'cup', 'fork', 'knife', 'spoon', 'bottle',
  'wine glass', 'banana', 'apple', 'sandwich', 'orange',
  'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake',
  'dining table',
];
const LANDSCAPE_CLASSES = [
  'car', 'bus', 'truck', 'train', 'motorcycle', 'bicycle',
  'traffic light', 'stop sign', 'fire hydrant', 'bench',
  'parking meter', 'building',
];

const SCENE_INFO: Record<SceneType, { label: string; icon: string }> = {
  portrait: { label: '인물', icon: '👤' },
  food: { label: '음식', icon: '🍕' },
  landscape: { label: '풍경', icon: '🏙' },
  general: { label: '일반', icon: '📷' },
};

export interface DetectedObject {
  class: string;
  score: number;
  bbox: [number, number, number, number];
}

export function classifyScene(detections: DetectedObject[]): SceneInfo {
  if (detections.length === 0) {
    return { type: 'general', ...SCENE_INFO.general, confidence: 0 };
  }

  let personScore = 0;
  let foodScore = 0;
  let landscapeScore = 0;

  for (const det of detections) {
    const cls = det.class.toLowerCase();
    if (PERSON_CLASSES.includes(cls)) {
      personScore += det.score * 2;
    }
    if (FOOD_CLASSES.includes(cls)) {
      foodScore += det.score * 1.5;
    }
    if (LANDSCAPE_CLASSES.includes(cls)) {
      landscapeScore += det.score;
    }
  }

  const maxScore = Math.max(personScore, foodScore, landscapeScore);

  if (maxScore < 0.3) {
    return { type: 'general', ...SCENE_INFO.general, confidence: 0.5 };
  }

  let type: SceneType = 'general';
  if (maxScore === personScore) type = 'portrait';
  else if (maxScore === foodScore) type = 'food';
  else if (maxScore === landscapeScore) type = 'landscape';

  return {
    type,
    ...SCENE_INFO[type],
    confidence: Math.min(maxScore, 1),
  };
}
