import type { CompositionResult } from '../utils/compositionRules';

interface ScoreGaugeProps {
  composition: CompositionResult;
}

const STATUS_COLORS = {
  poor: { stroke: '#ef4444', text: 'text-red-400' },
  good: { stroke: '#eab308', text: 'text-yellow-400' },
  excellent: { stroke: '#22c55e', text: 'text-green-400' },
};

export function ScoreGauge({ composition }: ScoreGaugeProps) {
  const { score, message, status } = composition;
  const colors = STATUS_COLORS[status];

  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex items-center gap-2.5">
      <div className="relative w-16 h-16">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="4"
          />
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke={colors.stroke}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.4s ease, stroke 0.3s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-sm font-bold ${colors.text}`}>{score}</span>
        </div>
      </div>
      <span className={`text-xs font-medium ${colors.text} max-w-[80px] leading-tight`}>
        {message}
      </span>
    </div>
  );
}
