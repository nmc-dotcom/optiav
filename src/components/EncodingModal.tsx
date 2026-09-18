import { useState } from 'react';
import { EncodingProgress } from '../types/video';
import { formatTime } from '../utils/formatters';
import { Loader2, XCircle, Terminal, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';

interface EncodingModalProps {
  progress: EncodingProgress;
  onCancel: () => void;
  onForceCanvas?: () => void;
}

export function EncodingModal({ progress, onCancel, onForceCanvas }: EncodingModalProps) {
  const [showLogs, setShowLogs] = useState(false);

  const isEarlyStage = progress.percent <= 12;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">
                인코딩 진행 중
              </h3>
              <p className="text-[11px] text-zinc-400">
                {progress.stage || '프레임 렌더링 및 압축 중...'}
              </p>
            </div>
          </div>

          <div className="text-right font-mono">
            <span className="text-2xl font-bold text-zinc-100">
              {progress.percent}%
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
            <div
              className="h-full bg-zinc-100 rounded-full transition-all duration-200 ease-out"
              style={{ width: `${Math.max(2, progress.percent)}%` }}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-zinc-950 border border-zinc-800/80 text-xs font-mono">
          <div>
            <span className="text-zinc-500 text-[10px] uppercase tracking-wider block">처리 구간</span>
            <span className="text-zinc-200 font-medium">
              {formatTime(progress.currentTime)} / {formatTime(progress.totalTime)}
            </span>
          </div>

          <div>
            <span className="text-zinc-500 text-[10px] uppercase tracking-wider block">예상 잔여</span>
            <span className="text-zinc-300 font-medium">
              {progress.estimatedRemainingSeconds > 0
                ? `${progress.estimatedRemainingSeconds}초`
                : '마무리 패키징'}
            </span>
          </div>
        </div>

        {/* Early stage or stall helper notice */}
        {isEarlyStage && onForceCanvas && (
          <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-between text-xs">
            <span className="text-zinc-400 text-[11px]">처리 속도가 느린가요?</span>
            <button
              type="button"
              onClick={onForceCanvas}
              className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-medium border border-zinc-700 transition"
            >
              ⚡ GPU Canvas 가속 전환
            </button>
          </div>
        )}

        {/* Local processing note */}
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 bg-zinc-950 border border-zinc-800 p-2 rounded-lg font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span>브라우저 로컬 샌드박스 인코딩 (서버 미전송)</span>
        </div>

        {/* Log Viewer Toggle */}
        <div>
          <button
            type="button"
            onClick={() => setShowLogs(!showLogs)}
            className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 transition font-mono"
          >
            <Terminal className="w-3 h-3" />
            <span>엔진 콘솔 로그 {showLogs ? '닫기' : '열기'}</span>
            {showLogs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {showLogs && (
            <div className="mt-2 p-2.5 bg-black rounded-lg border border-zinc-800 h-32 overflow-y-auto font-mono text-[10px] text-zinc-400 space-y-0.5 select-text">
              {progress.logs.length > 0 ? (
                progress.logs.map((log, idx) => (
                  <div key={idx} className="leading-tight">
                    {log}
                  </div>
                ))
              ) : (
                <div className="text-zinc-600">로그 대기 중...</div>
              )}
            </div>
          )}
        </div>

        {/* Cancel Button */}
        <div className="pt-1 flex justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 text-xs font-medium flex items-center gap-1.5 transition"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>작업 취소</span>
          </button>
        </div>
      </div>
    </div>
  );
}
