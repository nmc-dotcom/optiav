import { VideoMetadata, EditOptions } from '../types/video';
import { formatBytes, formatTime, computeOutputDimensions, estimateOutputSize } from '../utils/formatters';
import { ArrowRight, Play, Cpu, CheckCircle } from 'lucide-react';

interface SummaryCardProps {
  metadata: VideoMetadata;
  options: EditOptions;
  onStartEncoding: () => void;
  preferHardwareCanvas: boolean;
  onToggleEngine: (val: boolean) => void;
  isProcessing: boolean;
}

export function SummaryCard({
  metadata,
  options,
  onStartEncoding,
  preferHardwareCanvas,
  onToggleEngine,
  isProcessing,
}: SummaryCardProps) {
  const duration = Math.max(0.1, (options.endTime - options.startTime) / options.speed);

  const dims = computeOutputDimensions(
    metadata.width,
    metadata.height,
    options.resolutionPreset,
    options.customWidth,
    options.customHeight,
    options.aspectRatioPreset,
    options.aspectRatioMode,
    options.cropEnabled,
    options.cropArea,
    options.rotation
  );

  const estimatedBytes = estimateOutputSize(
    duration,
    options.format,
    options.quality,
    options.crf,
    options.targetBitrateKbps,
    options.targetSizeMB,
    dims.width,
    dims.height,
    options.fps || metadata.fps || 30,
    metadata.hasAudio,
    options.mute
  );

  const formatLabels: Record<string, string> = {
    mp4: 'MP4 (H.264)',
    webm: 'WebM (VP9)',
    gif: 'GIF',
  };

  const isFFmpeg = (options.engine || (preferHardwareCanvas ? 'hardware' : 'ffmpeg')) === 'ffmpeg';

  return (
    <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-sm">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Specs comparison flow */}
        <div className="flex-1 w-full flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-950 p-3.5 rounded-lg border border-zinc-800/80">
          {/* Source Info */}
          <div className="text-left w-full sm:w-auto">
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-0.5">
              원본 미디어
            </span>
            <div className="text-zinc-100 font-semibold text-sm font-mono">
              {metadata.width} × {metadata.height}
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5 space-x-1 font-mono">
              <span>{metadata.fps} FPS</span>
              <span>•</span>
              <span>{formatTime(metadata.duration)}</span>
              <span>•</span>
              <strong className="text-zinc-300">{formatBytes(metadata.size)}</strong>
            </div>
          </div>

          {/* Arrow */}
          <div className="hidden sm:flex w-7 h-7 rounded-full bg-zinc-900 border border-zinc-700 items-center justify-center text-zinc-400">
            <ArrowRight className="w-3.5 h-3.5" />
          </div>

          {/* Output Info */}
          <div className="text-left sm:text-right w-full sm:w-auto">
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-0.5">
              변환 출력 사양
            </span>
            <div className="text-zinc-100 font-semibold text-sm font-mono">
              {dims.width} × {dims.height}
            </div>
            <div className="text-[11px] text-zinc-300 mt-0.5 space-x-1 font-mono">
              <span>{options.fps ? `${options.fps} FPS` : `${metadata.fps} FPS`}</span>
              <span>•</span>
              <span className="text-zinc-200">{formatLabels[options.format]}</span>
              <span>•</span>
              <span>{formatTime(duration)}</span>
              <span>•</span>
              <strong className="text-zinc-100 font-mono">
                예상 ~{formatBytes(estimatedBytes)}
              </strong>
            </div>
          </div>
        </div>

        {/* Action Button & Engine Indicator */}
        <div className="w-full md:w-auto flex flex-col items-center md:items-end gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono">
            <Cpu className="w-3.5 h-3.5 text-zinc-400" />
            <span>엔진:</span>
            <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-200">
              {isFFmpeg ? 'FFmpeg x264 Studio' : 'GPU Canvas Hardware'}
            </span>
          </div>

          {/* Big CTA Button */}
          <button
            type="button"
            onClick={onStartEncoding}
            disabled={isProcessing}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-900 font-semibold text-xs transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>인코딩 작업 시작</span>
            <Play className="w-3.5 h-3.5 fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
}
