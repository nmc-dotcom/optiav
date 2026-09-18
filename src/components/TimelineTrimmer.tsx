import React, { useRef, useCallback } from 'react';
import { Scissors, Clock } from 'lucide-react';
import { formatTime } from '../utils/formatters';

interface TimelineTrimmerProps {
  duration: number;
  startTime: number;
  endTime: number;
  currentTime: number;
  thumbnails: string[];
  onTrimChange: (start: number, end: number) => void;
  onSeek: (time: number) => void;
}

export function TimelineTrimmer({
  duration,
  startTime,
  endTime,
  currentTime,
  thumbnails,
  onTrimChange,
  onSeek,
}: TimelineTrimmerProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const startPercent = Math.max(0, Math.min(100, (startTime / duration) * 100));
  const endPercent = Math.max(0, Math.min(100, (endTime / duration) * 100));
  const currentPercent = Math.max(0, Math.min(100, (currentTime / duration) * 100));
  const selectedDuration = Math.max(0, endTime - startTime);

  // Dragging start handle
  const handleStartDrag = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      const onPointerMove = (moveEvent: PointerEvent) => {
        if (!trackRef.current) return;
        const rect = trackRef.current.getBoundingClientRect();
        const clickX = Math.max(0, Math.min(rect.width, moveEvent.clientX - rect.left));
        const newTime = (clickX / rect.width) * duration;
        const boundedTime = Math.max(0, Math.min(endTime - 0.2, newTime));
        onTrimChange(Number(boundedTime.toFixed(2)), endTime);
        onSeek(boundedTime);
      };

      const onPointerUp = (upEvent: PointerEvent) => {
        try {
          (upEvent.target as HTMLElement).releasePointerCapture(upEvent.pointerId);
        } catch {}
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    },
    [duration, endTime, onSeek, onTrimChange]
  );

  // Dragging end handle
  const handleEndDrag = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      const onPointerMove = (moveEvent: PointerEvent) => {
        if (!trackRef.current) return;
        const rect = trackRef.current.getBoundingClientRect();
        const clickX = Math.max(0, Math.min(rect.width, moveEvent.clientX - rect.left));
        const newTime = (clickX / rect.width) * duration;
        const boundedTime = Math.min(duration, Math.max(startTime + 0.2, newTime));
        onTrimChange(startTime, Number(boundedTime.toFixed(2)));
        onSeek(boundedTime);
      };

      const onPointerUp = (upEvent: PointerEvent) => {
        try {
          (upEvent.target as HTMLElement).releasePointerCapture(upEvent.pointerId);
        } catch {}
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    },
    [duration, onSeek, onTrimChange, startTime]
  );

  // Click on track to jump playhead
  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const newTime = (clickX / rect.width) * duration;
    onSeek(newTime);
  };

  // Quick action: set current position as start or end
  const setCurrentAsStart = () => {
    if (currentTime < endTime - 0.2) {
      onTrimChange(Number(currentTime.toFixed(2)), endTime);
    }
  };

  const setCurrentAsEnd = () => {
    if (currentTime > startTime + 0.2) {
      onTrimChange(startTime, Number(currentTime.toFixed(2)));
    }
  };

  return (
    <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 my-3 shadow-sm">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <Scissors className="w-3.5 h-3.5 text-zinc-300" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            타임라인 트리밍
          </h3>
          <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono border border-zinc-700/60">
            구간: {formatTime(selectedDuration, true)}
          </span>
        </div>

        {/* Quick set buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={setCurrentAsStart}
            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium border border-zinc-700 transition"
            title="현재 위치를 시작점으로 지정"
          >
            [ 시작점
          </button>
          <button
            type="button"
            onClick={setCurrentAsEnd}
            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium border border-zinc-700 transition"
            title="현재 위치를 종료점으로 지정"
          >
            종료점 ]
          </button>
        </div>
      </div>

      {/* Visual Timeline Track with Thumbnails Filmstrip */}
      <div
        ref={trackRef}
        onClick={handleTrackClick}
        className="relative h-14 w-full rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800 cursor-pointer select-none"
      >
        {/* Background Filmstrip Thumbnails */}
        <div className="absolute inset-0 flex">
          {thumbnails.length > 0 ? (
            thumbnails.map((thumb, idx) => (
              <div key={idx} className="flex-1 h-full overflow-hidden border-r border-black/50">
                <img
                  src={thumb}
                  alt={`frame ${idx}`}
                  className="w-full h-full object-cover opacity-50 pointer-events-none"
                />
              </div>
            ))
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs font-mono">
              필름스트립 생성 중...
            </div>
          )}
        </div>

        {/* Dimmed unselected areas (before start and after end) */}
        <div
          className="absolute top-0 bottom-0 left-0 bg-black/80 pointer-events-none transition-all"
          style={{ width: `${startPercent}%` }}
        />
        <div
          className="absolute top-0 bottom-0 right-0 bg-black/80 pointer-events-none transition-all"
          style={{ width: `${100 - endPercent}%` }}
        />

        {/* Active trim highlight box */}
        <div
          className="absolute top-0 bottom-0 border-y-2 border-zinc-200 bg-white/5 pointer-events-none"
          style={{
            left: `${startPercent}%`,
            width: `${endPercent - startPercent}%`,
          }}
        />

        {/* Start Handle */}
        <div
          onPointerDown={handleStartDrag}
          style={{ left: `${startPercent}%` }}
          className="absolute top-0 bottom-0 -ml-2 w-4 bg-zinc-100 hover:bg-white cursor-ew-resize flex items-center justify-center shadow-md rounded-l z-20 transition-colors"
          title="시작 위치 드래그"
        >
          <div className="w-0.5 h-4 bg-zinc-900 rounded" />
        </div>

        {/* End Handle */}
        <div
          onPointerDown={handleEndDrag}
          style={{ left: `${endPercent}%` }}
          className="absolute top-0 bottom-0 -ml-2 w-4 bg-zinc-100 hover:bg-white cursor-ew-resize flex items-center justify-center shadow-md rounded-r z-20 transition-colors"
          title="종료 위치 드래그"
        >
          <div className="w-0.5 h-4 bg-zinc-900 rounded" />
        </div>

        {/* Current Playhead Scrubber Bar */}
        <div
          style={{ left: `${currentPercent}%` }}
          className="absolute top-0 bottom-0 w-0.5 bg-amber-400 pointer-events-none z-30 shadow"
        >
          <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-amber-400 rounded-full border border-zinc-900 shadow-sm" />
        </div>
      </div>

      {/* Numeric Time Inputs for Start & End */}
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-400 font-medium text-[11px]">시작:</span>
          <input
            type="number"
            step="0.1"
            min="0"
            max={endTime - 0.1}
            value={startTime}
            onChange={(e) => {
              const val = Math.max(0, Math.min(endTime - 0.1, parseFloat(e.target.value) || 0));
              onTrimChange(val, endTime);
              onSeek(val);
            }}
            className="w-18 px-1.5 py-0.5 bg-zinc-950 border border-zinc-700 rounded text-zinc-100 font-mono text-center text-xs focus:border-zinc-400 focus:outline-none"
          />
          <span className="text-zinc-500 font-mono text-[11px]">({formatTime(startTime, true)})</span>
        </div>

        <div className="flex items-center gap-1.5 text-zinc-400 text-xs">
          <Clock className="w-3.5 h-3.5 text-zinc-400" />
          <span>재생위치: <strong className="text-zinc-100 font-mono">{formatTime(currentTime, true)}</strong></span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-zinc-400 font-medium text-[11px]">종료:</span>
          <input
            type="number"
            step="0.1"
            min={startTime + 0.1}
            max={duration}
            value={endTime}
            onChange={(e) => {
              const val = Math.min(duration, Math.max(startTime + 0.1, parseFloat(e.target.value) || duration));
              onTrimChange(startTime, val);
              onSeek(val);
            }}
            className="w-18 px-1.5 py-0.5 bg-zinc-950 border border-zinc-700 rounded text-zinc-100 font-mono text-center text-xs focus:border-zinc-400 focus:outline-none"
          />
          <span className="text-zinc-500 font-mono text-[11px]">({formatTime(endTime, true)})</span>
        </div>
      </div>
    </div>
  );
}
