import type { SceneType, DetectedObject } from './sceneClassifier';

export interface CompositionResult {
  score: number;
  message: string;
  status: 'poor' | 'good' | 'excellent';
}

export interface ObjectGuide {
  currentBbox: [number, number, number, number];
  idealCenterX: number;
  idealCenterY: number;
  currentCenterX: number;
  currentCenterY: number;
  needsMove: boolean;
  label: string;
  objectClass: string;
  contourPath: string | null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function distanceScore(actual: number, ideal: number, tolerance: number): number {
  const dist = Math.abs(actual - ideal);
  return clamp(1 - dist / tolerance, 0, 1);
}

function getIdealPosition(
  sceneType: SceneType,
  det: DetectedObject,
  frameWidth: number,
  frameHeight: number,
): { idealX: number; idealY: number } {
  const [x, y, w, h] = det.bbox;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const normCx = cx / frameWidth;
  const normCy = cy / frameHeight;

  switch (sceneType) {
    case 'portrait': {
      const closestThirdX = Math.abs(normCx - 1/3) < Math.abs(normCx - 2/3) ? 1/3 : 2/3;
      const idealCxNorm = Math.abs(normCx - 0.5) < 0.12 ? 0.5 : closestThirdX;
      const idealEyeY = frameHeight / 3;
      const eyeOffset = h * 0.15;
      const idealCy = idealEyeY - eyeOffset + h / 2;
      return { idealX: idealCxNorm * frameWidth, idealY: clamp(idealCy, h / 2, frameHeight - h / 2) };
    }
    case 'food': {
      return { idealX: frameWidth / 2, idealY: frameHeight / 2 };
    }
    case 'landscape': {
      const closestThirdX = Math.abs(normCx - 1/3) < Math.abs(normCx - 2/3) ? 1/3 : 2/3;
      const closestThirdY = Math.abs(normCy - 1/3) < Math.abs(normCy - 2/3) ? 1/3 : 2/3;
      return { idealX: closestThirdX * frameWidth, idealY: closestThirdY * frameHeight };
    }
    default: {
      const closestX = [1/3, 0.5, 2/3].reduce((best, v) =>
        Math.abs(normCx - v) < Math.abs(normCx - best) ? v : best
      );
      const closestY = [1/3, 0.5, 2/3].reduce((best, v) =>
        Math.abs(normCy - v) < Math.abs(normCy - best) ? v : best
      );
      return { idealX: closestX * frameWidth, idealY: closestY * frameHeight };
    }
  }
}

const CLASS_LABELS: Record<string, string> = {
  person: '사람',
  bowl: '그릇',
  cup: '컵',
  fork: '포크',
  knife: '칼',
  spoon: '숟가락',
  bottle: '병',
  'wine glass': '와인잔',
  banana: '바나나',
  apple: '사과',
  sandwich: '샌드위치',
  orange: '오렌지',
  broccoli: '브로콜리',
  carrot: '당근',
  'hot dog': '핫도그',
  pizza: '피자',
  donut: '도넛',
  cake: '케이크',
  'dining table': '식탁',
  car: '자동차',
  bus: '버스',
  truck: '트럭',
  train: '기차',
  motorcycle: '오토바이',
  bicycle: '자전거',
  'traffic light': '신호등',
  'stop sign': '정지 표지판',
  'fire hydrant': '소화전',
  bench: '벤치',
  'parking meter': '주차 미터기',
  building: '건물',
  cat: '고양이',
  dog: '강아지',
  bird: '새',
  horse: '말',
  book: '책',
  clock: '시계',
  laptop: '노트북',
  'cell phone': '휴대폰',
  tv: 'TV',
  chair: '의자',
  couch: '소파',
  bed: '침대',
  vase: '꽃병',
  scissors: '가위',
  'teddy bear': '곰인형',
  umbrella: '우산',
  backpack: '배낭',
  handbag: '핸드백',
  suitcase: '여행가방',
};

export function computeObjectGuides(
  sceneType: SceneType,
  detections: DetectedObject[],
  frameWidth: number,
  frameHeight: number,
): ObjectGuide[] {
  const threshold = Math.min(frameWidth, frameHeight) * 0.04;

  const valid = detections.filter(d => d.score >= 0.4);

  const sorted = [...valid].sort((a, b) => {
    const areaA = a.bbox[2] * a.bbox[3];
    const areaB = b.bbox[2] * b.bbox[3];
    const isPrimaryA = a.class === 'person' ? 1 : 0;
    const isPrimaryB = b.class === 'person' ? 1 : 0;
    if (isPrimaryA !== isPrimaryB) return isPrimaryB - isPrimaryA;
    return (areaB * b.score) - (areaA * a.score);
  });

  const topObjects = sorted.slice(0, 2);

  const guides: ObjectGuide[] = [];

  for (const det of topObjects) {
    const [bx, by, bw, bh] = det.bbox;
    const currentCx = bx + bw / 2;
    const currentCy = by + bh / 2;
    const { idealX, idealY } = getIdealPosition(sceneType, det, frameWidth, frameHeight);
    const dist = Math.sqrt((currentCx - idealX) ** 2 + (currentCy - idealY) ** 2);

    guides.push({
      currentBbox: det.bbox,
      idealCenterX: idealX,
      idealCenterY: idealY,
      currentCenterX: currentCx,
      currentCenterY: currentCy,
      needsMove: dist > threshold,
      label: CLASS_LABELS[det.class.toLowerCase()] || det.class,
      objectClass: det.class.toLowerCase(),
      contourPath: (det as any).contourPath || null,
    });
  }

  return guides;
}

function evaluatePortrait(
  detections: DetectedObject[],
  frameWidth: number,
  frameHeight: number,
): number {
  const people = detections.filter((d) => d.class === 'person');
  if (people.length === 0) return 0.5;

  const person = people.reduce((a, b) =>
    (b.bbox[2] * b.bbox[3]) > (a.bbox[2] * a.bbox[3]) ? b : a
  );

  const [x, y, w, h] = person.bbox;
  const centerX = (x + w / 2) / frameWidth;
  const topY = y / frameHeight;

  const thirdLeft = 1 / 3;
  const thirdRight = 2 / 3;
  const ruleOfThirdsX = Math.max(
    distanceScore(centerX, thirdLeft, 0.25),
    distanceScore(centerX, thirdRight, 0.25),
    distanceScore(centerX, 0.5, 0.15),
  );

  const headroomScore = distanceScore(topY, 0.08, 0.15);
  const eyeLineY = (y + h * 0.15) / frameHeight;
  const eyeLineScore = distanceScore(eyeLineY, 1 / 3, 0.2);
  const sizeRatio = (w * h) / (frameWidth * frameHeight);
  const sizeScore = clamp(sizeRatio * 4, 0.3, 1);

  return (ruleOfThirdsX * 0.3 + headroomScore * 0.2 + eyeLineScore * 0.3 + sizeScore * 0.2);
}

function evaluateFood(
  detections: DetectedObject[],
  frameWidth: number,
  frameHeight: number,
): number {
  const foodItems = detections.filter((d) => d.class !== 'person');
  if (foodItems.length === 0) return 0.5;

  const main = foodItems.reduce((a, b) =>
    (b.bbox[2] * b.bbox[3]) > (a.bbox[2] * a.bbox[3]) ? b : a
  );

  const [x, y, w, h] = main.bbox;
  const centerX = (x + w / 2) / frameWidth;
  const centerY = (y + h / 2) / frameHeight;

  const centerScore = (distanceScore(centerX, 0.5, 0.3) + distanceScore(centerY, 0.5, 0.3)) / 2;
  const sizeRatio = (w * h) / (frameWidth * frameHeight);
  const fillScore = distanceScore(sizeRatio, 0.45, 0.35);

  return centerScore * 0.6 + fillScore * 0.4;
}

function evaluateLandscape(
  detections: DetectedObject[],
  frameWidth: number,
  frameHeight: number,
): number {
  if (detections.length === 0) return 0.5;

  let totalScore = 0;
  let count = 0;

  for (const det of detections) {
    const [x, y, w, h] = det.bbox;
    const centerX = (x + w / 2) / frameWidth;
    const centerY = (y + h / 2) / frameHeight;

    const thirdScore = Math.max(
      distanceScore(centerX, 1 / 3, 0.2),
      distanceScore(centerX, 2 / 3, 0.2),
    );

    const horizonScore = Math.max(
      distanceScore(centerY, 1 / 3, 0.2),
      distanceScore(centerY, 2 / 3, 0.2),
    );

    totalScore += (thirdScore + horizonScore) / 2;
    count++;
  }

  return count > 0 ? totalScore / count : 0.5;
}

function evaluateGeneral(
  detections: DetectedObject[],
  frameWidth: number,
  frameHeight: number,
): number {
  if (detections.length === 0) return 0.5;

  const main = detections.reduce((a, b) =>
    (b.score) > (a.score) ? b : a
  );

  const [x, y, w, h] = main.bbox;
  const centerX = (x + w / 2) / frameWidth;
  const centerY = (y + h / 2) / frameHeight;

  const thirdScoreX = Math.max(
    distanceScore(centerX, 1 / 3, 0.25),
    distanceScore(centerX, 2 / 3, 0.25),
    distanceScore(centerX, 0.5, 0.2),
  );

  const thirdScoreY = Math.max(
    distanceScore(centerY, 1 / 3, 0.25),
    distanceScore(centerY, 2 / 3, 0.25),
    distanceScore(centerY, 0.5, 0.2),
  );

  return (thirdScoreX + thirdScoreY) / 2;
}

export function evaluateComposition(
  sceneType: SceneType,
  detections: DetectedObject[],
  frameWidth: number,
  frameHeight: number,
): CompositionResult {
  let rawScore: number;

  switch (sceneType) {
    case 'portrait':
      rawScore = evaluatePortrait(detections, frameWidth, frameHeight);
      break;
    case 'food':
      rawScore = evaluateFood(detections, frameWidth, frameHeight);
      break;
    case 'landscape':
      rawScore = evaluateLandscape(detections, frameWidth, frameHeight);
      break;
    default:
      rawScore = evaluateGeneral(detections, frameWidth, frameHeight);
  }

  const score = Math.round(clamp(rawScore * 100, 0, 100));

  if (score >= 90) {
    return { score, message: '지금 촬영하세요! 📸', status: 'excellent' };
  } else if (score >= 70) {
    return { score, message: '거의 다 됐어요!', status: 'good' };
  } else {
    return { score, message: '구도를 맞춰주세요', status: 'poor' };
  }
}
