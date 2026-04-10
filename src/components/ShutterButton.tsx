import type { CompositionResult } from '../utils/compositionRules';

interface ShutterButtonProps {
  composition: CompositionResult;
  onCapture: () => void;
  disabled?: boolean;
}

export function ShutterButton({ composition, onCapture, disabled }: ShutterButtonProps) {
  const isExcellent = composition.status === 'excellent';

  return (
    <button
      onClick={onCapture}
      disabled={disabled}
      className={`
        relative w-[72px] h-[72px] rounded-full
        border-[3px] transition-all duration-300
        flex items-center justify-center
        active:scale-95
        disabled:opacity-40
        ${isExcellent
          ? 'border-green-400 animate-pulse-glow'
          : 'border-white/80 hover:border-white'
        }
      `}
    >
      <div
        className={`
          w-[58px] h-[58px] rounded-full transition-all duration-300
          ${isExcellent ? 'bg-green-400' : 'bg-white/90'}
        `}
      />
    </button>
  );
}
