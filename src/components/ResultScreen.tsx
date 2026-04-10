import { useState, useEffect } from 'react';
import type { SceneInfo } from '../utils/sceneClassifier';
import type { CompositionResult } from '../utils/compositionRules';
import { canvasToBlob, downloadImage } from '../utils/imageProcessor';

interface ResultScreenProps {
  imageCanvas: HTMLCanvasElement;
  scene: SceneInfo;
  composition: CompositionResult;
  onRetake: () => void;
}

const COMPOSITION_RULES: Record<string, string> = {
  portrait: '삼분법을 적용하여 피사체를 배치했습니다. 눈높이 정렬과 머리 위 여백 균형을 분석했습니다.',
  food: '중앙 구도로 프레임의 60~70%를 채우도록 안내했습니다. 45도 각도 촬영을 권장합니다.',
  landscape: '삼분법과 수평선 배치를 분석했습니다. 리딩 라인과 소실점을 활용한 구도입니다.',
  general: '삼분법 그리드와 중앙 십자선을 기준으로 균형 잡힌 구도를 분석했습니다.',
};

export function ResultScreen({ imageCanvas, scene, composition, onRetake }: ResultScreenProps) {
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    const url = imageCanvas.toDataURL('image/jpeg', 0.92);
    setImageUrl(url);
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageCanvas]);

  const handleSave = async () => {
    try {
      const blob = await canvasToBlob(imageCanvas);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      downloadImage(blob, `photo-coach-${timestamp}.jpg`);
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  const statusColor = {
    poor: 'text-red-400 bg-red-400/10 border-red-400/20',
    good: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    excellent: 'text-green-400 bg-green-400/10 border-green-400/20',
  }[composition.status];

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col animate-fade-in">
      <div className="flex-1 relative overflow-hidden">
        {imageUrl && (
          <img
            src={imageUrl}
            alt="촬영된 사진"
            className="w-full h-full object-contain"
          />
        )}
      </div>

      <div className="bg-black/95 backdrop-blur-xl border-t border-white/10 p-4 pb-8 space-y-4 animate-slide-up">
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1.5 rounded-full border text-sm font-medium ${statusColor}`}>
            {scene.icon} {scene.label}
          </div>
          <div className={`px-3 py-1.5 rounded-full border text-sm font-bold ${statusColor}`}>
            {composition.score}%
          </div>
        </div>

        <div className="bg-white/5 rounded-xl border border-white/10 p-3.5 space-y-2">
          <h4 className="text-xs font-semibold text-white/60 tracking-wider">
            AI 분석 결과
          </h4>
          <p className="text-sm text-white/80 leading-relaxed">
            {COMPOSITION_RULES[scene.type] || COMPOSITION_RULES.general}
          </p>
          <p className={`text-sm font-medium ${composition.status === 'excellent' ? 'text-green-400' : composition.status === 'good' ? 'text-yellow-400' : 'text-red-400'}`}>
            {composition.message}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onRetake}
            className="flex-1 py-3 rounded-xl bg-white/10 border border-white/10 text-white font-medium text-sm active:bg-white/20 transition-colors"
          >
            다시 촬영
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 rounded-xl bg-green-500 text-white font-medium text-sm active:bg-green-600 transition-colors"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
