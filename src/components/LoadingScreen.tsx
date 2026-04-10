interface LoadingScreenProps {
  progress: number;
}

function getLoadingMessage(progress: number): string {
  if (progress <= 10) return 'AI 엔진 준비 중...';
  if (progress <= 30) return 'TensorFlow 초기화...';
  if (progress <= 50) return '객체 감지 모델 로딩...';
  if (progress <= 70) return 'COCO-SSD 모델 준비...';
  if (progress <= 80) return '세그멘테이션 엔진 로딩...';
  if (progress <= 90) return '엣지 검출기 준비...';
  return '준비 완료!';
}

export function LoadingScreen({ progress }: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-8 z-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-white">AI 포토 코치</h1>
        <p className="text-sm text-white/50">{getLoadingMessage(progress)}</p>
      </div>

      <div className="w-48 space-y-2">
        <div className="h-1 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-green-400 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-white/40 text-center">{progress}%</p>
      </div>
    </div>
  );
}
