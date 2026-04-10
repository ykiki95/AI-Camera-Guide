import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { CompositionOverlay } from './CompositionOverlay';
import { SceneBadge } from './SceneBadge';
import { ScoreGauge } from './ScoreGauge';
import { TipsPanel } from './TipsPanel';
import { ShutterButton } from './ShutterButton';
import { ResultScreen } from './ResultScreen';
import { processImage } from '../utils/imageProcessor';
import type { SceneType, SceneInfo } from '../utils/sceneClassifier';
import type { CompositionResult, ObjectGuide } from '../utils/compositionRules';
import type { DetectionWithContour } from '../hooks/useObjectDetection';

interface DemoScene {
  label: string;
  scene: SceneInfo;
  detections: DetectionWithContour[];
  composition: CompositionResult;
  guides: ObjectGuide[];
  drawFn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
}

function drawPortraitScene(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#1a1a2e');
  grad.addColorStop(0.4, '#16213e');
  grad.addColorStop(1, '#0f3460');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#e2b07a';
  ctx.beginPath();
  ctx.ellipse(w * 0.38, h * 0.25, w * 0.06, h * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.ellipse(w * 0.38, h * 0.18, w * 0.07, h * 0.04, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#2c5f7c';
  ctx.beginPath();
  ctx.moveTo(w * 0.28, h * 0.32);
  ctx.quadraticCurveTo(w * 0.38, h * 0.30, w * 0.48, h * 0.32);
  ctx.lineTo(w * 0.50, h * 0.65);
  ctx.lineTo(w * 0.26, h * 0.65);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  for (let i = 0; i < 30; i++) {
    const sx = Math.random() * w;
    const sy = Math.random() * h * 0.5;
    ctx.beginPath();
    ctx.arc(sx, sy, 1 + Math.random() * 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFoodScene(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#3d2b1f';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#5c4033';
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.5, w * 0.38, h * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f5f5dc';
  ctx.beginPath();
  ctx.ellipse(w * 0.45, h * 0.45, w * 0.18, h * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#d44';
  ctx.beginPath();
  ctx.ellipse(w * 0.43, h * 0.43, w * 0.14, h * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffd700';
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const cx = w * 0.43 + Math.cos(angle) * w * 0.08;
    const cy = h * 0.43 + Math.sin(angle) * h * 0.08;
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.015, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#2e8b57';
  ctx.beginPath();
  ctx.ellipse(w * 0.7, h * 0.35, w * 0.06, h * 0.04, -0.3, 0, Math.PI * 2);
  ctx.fill();
}

function drawLandscapeScene(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.6);
  sky.addColorStop(0, '#ff7e5f');
  sky.addColorStop(0.5, '#feb47b');
  sky.addColorStop(1, '#86c5da');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h * 0.6);

  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.arc(w * 0.7, h * 0.2, w * 0.06, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#2d5016';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.55);
  ctx.quadraticCurveTo(w * 0.3, h * 0.45, w * 0.5, h * 0.55);
  ctx.quadraticCurveTo(w * 0.7, h * 0.48, w, h * 0.52);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#1e3a0f';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.6);
  ctx.quadraticCurveTo(w * 0.5, h * 0.55, w, h * 0.62);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#3a2510';
  ctx.fillRect(w * 0.15, h * 0.45, w * 0.012, h * 0.15);
  ctx.fillStyle = '#1a4d0a';
  ctx.beginPath();
  ctx.moveTo(w * 0.156, h * 0.35);
  ctx.lineTo(w * 0.10, h * 0.48);
  ctx.lineTo(w * 0.21, h * 0.48);
  ctx.closePath();
  ctx.fill();
}

const DEMO_SCENES: DemoScene[] = [
  {
    label: '인물 촬영',
    scene: { type: 'portrait', label: '인물', icon: '👤', confidence: 0.92 },
    detections: [
      { class: 'person', score: 0.92, bbox: [180, 80, 200, 380], contourPath: null },
    ],
    composition: { score: 72, message: '피사체를 삼분할 교차점으로 이동하세요', status: 'good' },
    guides: [
      {
        currentBbox: [180, 80, 200, 380],
        idealCenterX: 213,
        idealCenterY: 240,
        currentCenterX: 280,
        currentCenterY: 270,
        needsMove: true,
        label: '인물',
        objectClass: 'person',
        contourPath: null,
      },
    ],
    drawFn: drawPortraitScene,
  },
  {
    label: '음식 촬영',
    scene: { type: 'food', label: '음식', icon: '🍕', confidence: 0.88 },
    detections: [
      { class: 'pizza', score: 0.88, bbox: [150, 130, 260, 260], contourPath: null },
    ],
    composition: { score: 85, message: '좋은 구도! 접시를 중앙에 잘 배치했습니다', status: 'excellent' },
    guides: [
      {
        currentBbox: [150, 130, 260, 260],
        idealCenterX: 320,
        idealCenterY: 240,
        currentCenterX: 280,
        currentCenterY: 260,
        needsMove: false,
        label: '음식',
        objectClass: 'pizza',
        contourPath: null,
      },
    ],
    drawFn: drawFoodScene,
  },
  {
    label: '풍경 촬영',
    scene: { type: 'landscape', label: '풍경', icon: '🏙', confidence: 0.85 },
    detections: [
      { class: 'building', score: 0.75, bbox: [60, 150, 120, 200], contourPath: null },
    ],
    composition: { score: 68, message: '수평선을 삼분할 선에 맞추세요', status: 'good' },
    guides: [
      {
        currentBbox: [60, 150, 120, 200],
        idealCenterX: 213,
        idealCenterY: 160,
        currentCenterX: 120,
        currentCenterY: 250,
        needsMove: true,
        label: '건물',
        objectClass: 'building',
        contourPath: null,
      },
    ],
    drawFn: drawLandscapeScene,
  },
];

interface DemoViewProps {
  onBack: () => void;
}

export function DemoView({ onBack }: DemoViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [capturedImage, setCapturedImage] = useState<HTMLCanvasElement | null>(null);

  const demoScene = DEMO_SCENES[currentIdx];
  const W = 640;
  const H = 480;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    demoScene.drawFn(ctx, W, H);
  }, [currentIdx, demoScene]);

  const handleNext = useCallback(() => {
    setCurrentIdx((prev) => (prev + 1) % DEMO_SCENES.length);
  }, []);

  const handleCapture = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resultCanvas = document.createElement('canvas');
    resultCanvas.width = W;
    resultCanvas.height = H;
    const ctx = resultCanvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(canvas, 0, 0);
      processImage(resultCanvas);
      setCapturedImage(resultCanvas);
    }
  }, []);

  const handleRetake = useCallback(() => {
    setCapturedImage(null);
  }, []);

  if (capturedImage) {
    return (
      <ResultScreen
        imageCanvas={capturedImage}
        scene={demoScene.scene}
        composition={demoScene.composition}
        onRetake={handleRetake}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full object-cover"
      />

      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30">
        <div className="px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 backdrop-blur-md">
          <span className="text-xs font-medium text-emerald-400">데모 모드 — {demoScene.label}</span>
        </div>
      </div>

      <CompositionOverlay
        sceneType={demoScene.scene.type}
        composition={demoScene.composition}
        width={W}
        height={H}
        objectGuides={demoScene.guides}
      />

      <div className="absolute top-12 left-0 right-0 z-20 pt-3 px-4 flex items-start justify-between">
        <SceneBadge scene={demoScene.scene} />
        <ScoreGauge composition={demoScene.composition} />
      </div>

      <TipsPanel sceneType={demoScene.scene.type} />

      <div className="absolute bottom-0 left-0 right-0 z-20 pb-10 flex items-center justify-center gap-8">
        <button
          onClick={onBack}
          className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/70 hover:text-white active:bg-white/10 transition-colors"
          aria-label="뒤로 가기"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>

        <ShutterButton
          composition={demoScene.composition}
          onCapture={handleCapture}
          disabled={false}
        />

        <button
          onClick={handleNext}
          className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/70 hover:text-white active:bg-white/10 transition-colors"
          aria-label="다음 장면"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </button>
      </div>
    </div>
  );
}
