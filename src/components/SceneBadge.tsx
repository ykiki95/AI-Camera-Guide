import type { SceneInfo } from '../utils/sceneClassifier';

interface SceneBadgeProps {
  scene: SceneInfo;
}

export function SceneBadge({ scene }: SceneBadgeProps) {
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white text-sm font-medium animate-fade-in">
      <span className="text-base">{scene.icon}</span>
      <span>{scene.label}</span>
    </div>
  );
}
