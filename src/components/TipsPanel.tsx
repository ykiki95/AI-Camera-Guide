import { useState } from 'react';
import type { SceneType } from '../utils/sceneClassifier';
import { getTips } from '../utils/tips';

interface TipsPanelProps {
  sceneType: SceneType;
}

export function TipsPanel({ sceneType }: TipsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const tips = getTips(sceneType);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute top-14 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-0.5 text-white/50 hover:text-white/80 transition-colors"
      >
        <svg
          className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
        <span className="text-[10px] font-medium tracking-wider">촬영 팁</span>
      </button>

      {isOpen && (
        <div
          className="absolute top-20 left-0 right-0 z-30 mx-4 animate-fade-in"
          onClick={() => setIsOpen(false)}
        >
          <div className="bg-black/80 backdrop-blur-xl rounded-2xl border border-white/10 p-4 space-y-3">
            <h3 className="text-xs font-semibold text-white/70 tracking-wider">
              촬영 팁
            </h3>
            {tips.map((tip, i) => (
              <div key={i} className="flex gap-2.5 items-start">
                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[10px] text-white/70 font-medium">{i + 1}</span>
                </div>
                <p className="text-sm text-white/80 leading-relaxed">{tip}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
