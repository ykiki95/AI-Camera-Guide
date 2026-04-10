interface CameraErrorScreenProps {
  error: string;
  onRetry: () => void;
  onDemo?: () => void;
}

export function CameraErrorScreen({ error, onRetry, onDemo }: CameraErrorScreenProps) {
  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-6 p-8 z-50">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
        <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 01-2.25-2.25V7.5a2.25 2.25 0 012.25-2.25H12" />
          <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>

      <div className="text-center space-y-2">
        <h2 className="text-lg font-bold text-white">카메라 접근 필요</h2>
        <p className="text-sm text-white/60 leading-relaxed max-w-xs">
          {error.includes('NotAllowed')
            ? '브라우저 설정에서 카메라 접근을 허용한 후 다시 시도해 주세요.'
            : error.includes('NotFound') || error.includes('not found')
            ? '카메라를 찾을 수 없습니다. 카메라가 있는 기기에서 열거나 데모 모드를 사용해 보세요.'
            : `카메라 오류: ${error}`}
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={onRetry}
          className="w-full px-6 py-3 rounded-xl bg-white/10 border border-white/10 text-white font-medium text-sm active:bg-white/20 transition-colors"
        >
          다시 시도
        </button>

        {onDemo && (
          <button
            onClick={onDemo}
            className="w-full px-6 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-medium text-sm active:bg-emerald-500/30 transition-colors"
          >
            데모 모드로 체험하기
          </button>
        )}
      </div>
    </div>
  );
}
