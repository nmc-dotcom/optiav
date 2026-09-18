import { ShieldCheck, Video, RefreshCw, Cpu } from 'lucide-react';

interface HeaderProps {
  hasVideo: boolean;
  onReset: () => void;
  onOpenBrowserInfo: () => void;
}

export function Header({ hasVideo, onReset, onOpenBrowserInfo }: HeaderProps) {
  return (
    <header className="border-b border-zinc-800/90 bg-zinc-950/95 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Studio Title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-100 shadow-sm">
            <Video className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-zinc-100">
              OPTIAV
            </h1>
            <p className="text-xs text-zinc-400 hidden sm:block">
              브라우저 샌드박스 기반 고화질 비디오 트랜스코더
            </p>
          </div>
        </div>

        {/* Privacy badge & Actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="hidden md:inline">100% 로컬 샌드박스 처리 (서버 무전송)</span>
            <span className="md:hidden">로컬 샌드박스</span>
          </div>

          <button
            type="button"
            onClick={onOpenBrowserInfo}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-800 hover:border-zinc-700 transition"
            title="인코딩 엔진 사양 및 브라우저 호환성 상태"
          >
            <Cpu className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">엔진 사양</span>
          </button>

          {hasVideo && (
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-800 hover:border-zinc-700 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>새 파일 열기</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
