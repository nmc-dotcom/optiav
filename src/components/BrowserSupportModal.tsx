import { useState, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, ShieldCheck, Cpu } from 'lucide-react';

interface BrowserSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Capability {
  name: string;
  supported: boolean;
  desc: string;
}

export function BrowserSupportModal({ isOpen, onClose }: BrowserSupportModalProps) {
  const [capabilities, setCapabilities] = useState<Capability[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    const hasWasm = typeof WebAssembly !== 'undefined';
    const hasWebCodecs = typeof window.VideoEncoder !== 'undefined';
    const hasSharedArrayBuffer = typeof window.SharedArrayBuffer !== 'undefined';
    const hasMediaRecorder = typeof window.MediaRecorder !== 'undefined';
    const hasAudioContext = typeof window.AudioContext !== 'undefined' || typeof (window as unknown as { webkitAudioContext: unknown }).webkitAudioContext !== 'undefined';
    const hasOPFS = typeof navigator.storage?.getDirectory !== 'undefined';

    setCapabilities([
      {
        name: 'WebAssembly (WASM)',
        supported: hasWasm,
        desc: 'FFmpeg.wasm 코어 및 x264 비트레이트 정밀 인코딩',
      },
      {
        name: 'MediaRecorder & Canvas API',
        supported: hasMediaRecorder,
        desc: '하드웨어 가속 실시간 캔버스 렌더링 및 초고속 인코딩',
      },
      {
        name: 'Web Audio API',
        supported: hasAudioContext,
        desc: '오디오 멀티플렉싱, 볼륨 정밀 게인 및 음소거 제어',
      },
      {
        name: 'OPFS (Origin Private File System)',
        supported: hasOPFS,
        desc: '대용량 영상 버퍼링 및 메모리 가비지 컬렉션 최적화',
      },
      {
        name: 'WebCodecs API',
        supported: hasWebCodecs,
        desc: '브라우저 네이티브 GPU 디코딩/인코딩 하드웨어 가속',
      },
      {
        name: 'SharedArrayBuffer (멀티스레딩)',
        supported: hasSharedArrayBuffer,
        desc: '스레드 격리 환경에서의 병렬 연산 가속',
      },
    ]);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-zinc-300" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-100">
              하드웨어 가속 및 브라우저 환경 진단
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Capability list */}
        <div className="space-y-1.5 max-h-[320px] overflow-y-auto">
          {capabilities.map((cap) => (
            <div
              key={cap.name}
              className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80 flex items-start justify-between gap-2.5 text-xs"
            >
              <div>
                <div className="font-medium text-zinc-200 flex items-center gap-2">
                  <span>{cap.name}</span>
                  {cap.supported ? (
                    <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-emerald-400 border border-zinc-700 text-[10px] font-mono">
                      지원됨
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-amber-400 border border-zinc-700 text-[10px] font-mono">
                      폴백 모드
                    </span>
                  )}
                </div>
                <p className="text-zinc-400 text-[11px] mt-0.5 leading-relaxed">
                  {cap.desc}
                </p>
              </div>

              {cap.supported ? (
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              )}
            </div>
          ))}
        </div>

        {/* Local Security & Architecture Info */}
        <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs space-y-1 text-zinc-300 font-mono">
          <div className="flex items-center gap-1.5 text-zinc-200 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
            <span>하이브리드 엔진 샌드박스</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            FFmpeg.wasm과 Canvas/Web Audio Transcoder가 유기적으로 연동되어 어떤 브라우저 환경에서도 끊김 없는 인코딩을 보장합니다.
          </p>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-900 text-xs font-medium transition"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
