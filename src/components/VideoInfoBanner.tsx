import { VideoMetadata } from '../types/video';
import { formatBytes, formatTime } from '../utils/formatters';
import { FileVideo, Clock, Maximize, Gauge, FileCode, Volume2, VolumeX } from 'lucide-react';

interface VideoInfoBannerProps {
  metadata: VideoMetadata;
}

export function VideoInfoBanner({ metadata }: VideoInfoBannerProps) {
  return (
    <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 mb-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* File name & size */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 shrink-0">
            <FileVideo className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-semibold text-zinc-100 truncate max-w-xs sm:max-w-md md:max-w-lg" title={metadata.name}>
              {metadata.name}
            </h2>
            <p className="text-[11px] text-zinc-400">
              원본 파일 용량: <span className="text-zinc-200 font-mono font-medium">{formatBytes(metadata.size)}</span>
            </p>
          </div>
        </div>

        {/* Video metadata pill tags */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {/* Duration */}
          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-950 text-zinc-300 border border-zinc-800 font-mono text-[11px]">
            <Clock className="w-3 h-3 text-zinc-400" />
            <span>{formatTime(metadata.duration, true)}</span>
          </div>

          {/* Resolution */}
          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-950 text-zinc-300 border border-zinc-800 font-mono text-[11px]">
            <Maximize className="w-3 h-3 text-zinc-400" />
            <span>{metadata.width} × {metadata.height}</span>
          </div>

          {/* FPS */}
          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-950 text-zinc-300 border border-zinc-800 font-mono text-[11px]">
            <Gauge className="w-3 h-3 text-zinc-400" />
            <span>{metadata.fps} FPS</span>
          </div>

          {/* Codec */}
          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-950 text-zinc-300 border border-zinc-800 font-mono text-[11px]">
            <FileCode className="w-3 h-3 text-zinc-400" />
            <span>{metadata.codec}</span>
          </div>

          {/* Audio presence */}
          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-mono ${
              metadata.hasAudio
                ? 'bg-zinc-950 border-zinc-800 text-zinc-300'
                : 'bg-zinc-950 border-zinc-800 text-zinc-500'
            }`}
          >
            {metadata.hasAudio ? (
              <>
                <Volume2 className="w-3 h-3 text-emerald-400" />
                <span>오디오 채널</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3 h-3 text-zinc-500" />
                <span>오디오 없음</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
