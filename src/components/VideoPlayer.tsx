import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  RotateCcw,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Crop as CropIcon,
} from 'lucide-react';
import { EditOptions, VideoMetadata } from '../types/video';
import { formatTime } from '../utils/formatters';
import { CropOverlay } from './CropOverlay';

interface VideoPlayerProps {
  metadata: VideoMetadata;
  options: EditOptions;
  onOptionsChange: (newOptions: Partial<EditOptions>) => void;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
}

export function VideoPlayer({
  metadata,
  options,
  onOptionsChange,
  currentTime,
  onTimeUpdate,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sync video current time when changed from outside (e.g. timeline scrubber)
  useEffect(() => {
    if (videoRef.current && Math.abs(videoRef.current.currentTime - currentTime) > 0.3) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  // Sync playback rate
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = options.speed;
    }
  }, [options.speed]);

  // Keep within trim range during playback
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    onTimeUpdate(curr);

    // Loop or pause if past trim endTime
    if (curr >= options.endTime) {
      videoRef.current.currentTime = options.startTime;
      onTimeUpdate(options.startTime);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      // If outside trim range, jump to start
      if (
        videoRef.current.currentTime < options.startTime ||
        videoRef.current.currentTime >= options.endTime
      ) {
        videoRef.current.currentTime = options.startTime;
      }
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
    setIsMuted(val === 0);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMute = !isMuted;
    videoRef.current.muted = nextMute;
    setIsMuted(nextMute);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Step frame back/forward (approx 1/30 second)
  const stepFrame = useCallback(
    (deltaSeconds: number) => {
      if (!videoRef.current) return;
      videoRef.current.pause();
      setIsPlaying(false);
      const newTime = Math.max(
        options.startTime,
        Math.min(options.endTime, videoRef.current.currentTime + deltaSeconds)
      );
      videoRef.current.currentTime = newTime;
      onTimeUpdate(newTime);
    },
    [options.endTime, options.startTime, onTimeUpdate]
  );

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col">
      {/* Player Stage */}
      <div
        ref={containerRef}
        className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden select-none group"
      >
        {/* Actual Video with live rotation and flip transforms */}
        <div
          className="relative max-w-full max-h-full flex items-center justify-center transition-transform duration-300"
          style={{
            transform: `rotate(${options.rotation}deg) scaleX(${options.flipHorizontal ? -1 : 1})`,
          }}
        >
          <video
            ref={videoRef}
            src={metadata.url}
            playsInline
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            className="max-w-full max-h-[500px] object-contain cursor-pointer"
            onClick={togglePlay}
          />

          {/* Interactive Crop Box Overlay */}
          {options.cropEnabled && (
            <CropOverlay
              cropArea={options.cropArea}
              onChange={(cropArea) => onOptionsChange({ cropArea })}
              aspectConstraint={options.cropAspectConstraint}
              videoWidth={metadata.width}
              videoHeight={metadata.height}
              containerWidth={metadata.width}
              containerHeight={metadata.height}
            />
          )}
        </div>

        {/* Center Play/Pause Flash Button */}
        {!isPlaying && (
          <button
            type="button"
            onClick={togglePlay}
            className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-zinc-900/90 hover:bg-zinc-800 text-zinc-100 border border-zinc-700 flex items-center justify-center shadow-xl backdrop-blur-sm transition-transform hover:scale-105 z-10"
            aria-label="재생"
          >
            <Play className="w-6 h-6 ml-0.5 fill-current" />
          </button>
        )}

        {/* Crop active notification banner */}
        {options.cropEnabled && (
          <div className="absolute top-3 left-3 z-30 px-2.5 py-1 rounded bg-zinc-900/90 border border-zinc-700 text-zinc-200 text-xs flex items-center gap-1.5 backdrop-blur font-mono">
            <CropIcon className="w-3.5 h-3.5 text-amber-400" />
            <span>크롭 영역 편집 중</span>
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="bg-zinc-950 border-t border-zinc-800/90 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Playback controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={togglePlay}
            className="w-8 h-8 rounded bg-zinc-100 hover:bg-white text-zinc-900 flex items-center justify-center transition shadow-sm"
            title={isPlaying ? '일시정지' : '재생'}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 ml-0.5 fill-current" />}
          </button>

          {/* Frame Step Controls */}
          <div className="flex items-center gap-0.5 border-l border-zinc-800 pl-2">
            <button
              type="button"
              onClick={() => stepFrame(-1)}
              className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition text-xs flex items-center"
              title="1초 뒤로 (-1s)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => stepFrame(-1 / 30)}
              className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition text-xs flex items-center"
              title="이전 프레임 (-1 frame)"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => stepFrame(1 / 30)}
              className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition text-xs flex items-center"
              title="다음 프레임 (+1 frame)"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => stepFrame(1)}
              className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition text-xs flex items-center"
              title="1초 앞으로 (+1s)"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Timecode display */}
          <div className="text-xs font-mono text-zinc-300 ml-1.5">
            <span className="text-zinc-100 font-semibold">{formatTime(currentTime, true)}</span>
            <span className="text-zinc-600 mx-1">/</span>
            <span className="text-zinc-400">{formatTime(metadata.duration, true)}</span>
          </div>
        </div>

        {/* Right: Audio Volume, Speed badge, Fullscreen */}
        <div className="flex items-center gap-2.5">
          {/* Volume Control */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleMute}
              className="text-zinc-400 hover:text-zinc-200 transition"
              title={isMuted ? '음소거 해제' : '음소거'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-red-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-16 sm:w-20 h-1 bg-zinc-700 rounded appearance-none cursor-pointer accent-zinc-400"
            />
          </div>

          {/* Current Speed pill */}
          <div className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-300">
            {options.speed}x
          </div>

          {/* Fullscreen */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
            title="전체화면"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
