import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CropArea } from '../types/video';

interface CropOverlayProps {
  cropArea: CropArea;
  onChange: (newCrop: CropArea) => void;
  aspectConstraint: 'free' | '16:9' | '9:16' | '1:1' | '4:3';
  videoWidth: number;
  videoHeight: number;
  containerWidth: number;
  containerHeight: number;
}

type DragMode = 'move' | 'nw' | 'ne' | 'sw' | 'se' | null;

export function CropOverlay({
  cropArea,
  onChange,
  aspectConstraint,
  videoWidth,
  videoHeight,
}: CropOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const startCropRef = useRef<CropArea>({ ...cropArea });

  // Compute aspect ratio value if constrained
  const getAspectRatioVal = useCallback(() => {
    if (aspectConstraint === '16:9') return 16 / 9;
    if (aspectConstraint === '9:16') return 9 / 16;
    if (aspectConstraint === '1:1') return 1;
    if (aspectConstraint === '4:3') return 4 / 3;
    return null;
  }, [aspectConstraint]);

  const handlePointerDown = (mode: DragMode, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragMode(mode);
    startPosRef.current = { x: e.clientX, y: e.clientY };
    startCropRef.current = { ...cropArea };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragMode || !containerRef.current) return;
    e.stopPropagation();
    e.preventDefault();

    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const deltaXPct = ((e.clientX - startPosRef.current.x) / rect.width) * 100;
    const deltaYPct = ((e.clientY - startPosRef.current.y) / rect.height) * 100;

    let newX = startCropRef.current.x;
    let newY = startCropRef.current.y;
    let newW = startCropRef.current.width;
    let newH = startCropRef.current.height;

    const ratio = getAspectRatioVal();

    if (dragMode === 'move') {
      newX = Math.min(Math.max(0, startCropRef.current.x + deltaXPct), 100 - startCropRef.current.width);
      newY = Math.min(Math.max(0, startCropRef.current.y + deltaYPct), 100 - startCropRef.current.height);
    } else if (dragMode === 'se') {
      newW = Math.max(10, Math.min(100 - startCropRef.current.x, startCropRef.current.width + deltaXPct));
      if (ratio) {
        const pixelW = (videoWidth * newW) / 100;
        const pixelH = pixelW / ratio;
        newH = (pixelH / videoHeight) * 100;
        if (newY + newH > 100) {
          newH = 100 - newY;
          newW = ((videoHeight * newH * ratio) / videoWidth);
        }
      } else {
        newH = Math.max(10, Math.min(100 - startCropRef.current.y, startCropRef.current.height + deltaYPct));
      }
    } else if (dragMode === 'sw') {
      const maxDeltaX = startCropRef.current.width - 10;
      const appliedDeltaX = Math.max(-startCropRef.current.x, Math.min(maxDeltaX, deltaXPct));
      newX = startCropRef.current.x + appliedDeltaX;
      newW = startCropRef.current.width - appliedDeltaX;
      if (ratio) {
        const pixelW = (videoWidth * newW) / 100;
        const pixelH = pixelW / ratio;
        newH = (pixelH / videoHeight) * 100;
        if (newY + newH > 100) {
          newH = 100 - newY;
          newW = ((videoHeight * newH * ratio) / videoWidth);
          newX = startCropRef.current.x + (startCropRef.current.width - newW);
        }
      } else {
        newH = Math.max(10, Math.min(100 - startCropRef.current.y, startCropRef.current.height + deltaYPct));
      }
    } else if (dragMode === 'ne') {
      newW = Math.max(10, Math.min(100 - startCropRef.current.x, startCropRef.current.width + deltaXPct));
      if (ratio) {
        const pixelW = (videoWidth * newW) / 100;
        const pixelH = pixelW / ratio;
        newH = (pixelH / videoHeight) * 100;
        newY = startCropRef.current.y + (startCropRef.current.height - newH);
        if (newY < 0) {
          newY = 0;
          newH = startCropRef.current.y + startCropRef.current.height;
          newW = (videoHeight * newH * ratio) / videoWidth;
        }
      } else {
        const maxDeltaY = startCropRef.current.height - 10;
        const appliedDeltaY = Math.max(-startCropRef.current.y, Math.min(maxDeltaY, deltaYPct));
        newY = startCropRef.current.y + appliedDeltaY;
        newH = startCropRef.current.height - appliedDeltaY;
      }
    } else if (dragMode === 'nw') {
      const maxDeltaX = startCropRef.current.width - 10;
      const appliedDeltaX = Math.max(-startCropRef.current.x, Math.min(maxDeltaX, deltaXPct));
      newX = startCropRef.current.x + appliedDeltaX;
      newW = startCropRef.current.width - appliedDeltaX;

      if (ratio) {
        const pixelW = (videoWidth * newW) / 100;
        const pixelH = pixelW / ratio;
        newH = (pixelH / videoHeight) * 100;
        newY = startCropRef.current.y + (startCropRef.current.height - newH);
        if (newY < 0) {
          newY = 0;
          newH = startCropRef.current.y + startCropRef.current.height;
          newW = (videoHeight * newH * ratio) / videoWidth;
          newX = startCropRef.current.x + (startCropRef.current.width - newW);
        }
      } else {
        const maxDeltaY = startCropRef.current.height - 10;
        const appliedDeltaY = Math.max(-startCropRef.current.y, Math.min(maxDeltaY, deltaYPct));
        newY = startCropRef.current.y + appliedDeltaY;
        newH = startCropRef.current.height - appliedDeltaY;
      }
    }

    onChange({
      x: Number(Math.max(0, Math.min(100 - newW, newX)).toFixed(2)),
      y: Number(Math.max(0, Math.min(100 - newH, newY)).toFixed(2)),
      width: Number(Math.max(10, Math.min(100, newW)).toFixed(2)),
      height: Number(Math.max(10, Math.min(100, newH)).toFixed(2)),
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragMode) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      setDragMode(null);
    }
  };

  // Adjust aspect ratio constraint when constraint changes
  useEffect(() => {
    const ratio = getAspectRatioVal();
    if (!ratio) return;

    // Recalculate height or width to fit aspect ratio
    const pixelW = (videoWidth * cropArea.width) / 100;
    const pixelH = pixelW / ratio;
    let newHPct = (pixelH / videoHeight) * 100;
    let newWPct = cropArea.width;
    let newY = cropArea.y;

    if (newY + newHPct > 100) {
      newHPct = 100 - newY;
      newWPct = ((videoHeight * newHPct * ratio) / videoWidth) * 100;
    }

    onChange({
      ...cropArea,
      width: Number(Math.min(100, newWPct).toFixed(2)),
      height: Number(Math.min(100, newHPct).toFixed(2)),
    });
  }, [aspectConstraint, getAspectRatioVal, videoHeight, videoWidth]);

  const pixelCropW = Math.round((videoWidth * cropArea.width) / 100);
  const pixelCropH = Math.round((videoHeight * cropArea.height) / 100);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-20 pointer-events-auto select-none overflow-hidden"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Darkened overlay masks */}
      <div
        className="absolute bg-black/60 pointer-events-none transition-all"
        style={{ top: 0, left: 0, right: 0, height: `${cropArea.y}%` }}
      />
      <div
        className="absolute bg-black/60 pointer-events-none transition-all"
        style={{ bottom: 0, left: 0, right: 0, height: `${100 - (cropArea.y + cropArea.height)}%` }}
      />
      <div
        className="absolute bg-black/60 pointer-events-none transition-all"
        style={{
          top: `${cropArea.y}%`,
          left: 0,
          width: `${cropArea.x}%`,
          height: `${cropArea.height}%`,
        }}
      />
      <div
        className="absolute bg-black/60 pointer-events-none transition-all"
        style={{
          top: `${cropArea.y}%`,
          right: 0,
          width: `${100 - (cropArea.x + cropArea.width)}%`,
          height: `${cropArea.height}%`,
        }}
      />

      {/* Interactive Crop Box */}
      <div
        className="absolute border border-amber-400 cursor-move shadow-2xl transition-shadow"
        style={{
          left: `${cropArea.x}%`,
          top: `${cropArea.y}%`,
          width: `${cropArea.width}%`,
          height: `${cropArea.height}%`,
        }}
        onPointerDown={(e) => handlePointerDown('move', e)}
      >
        {/* Rule of thirds grid lines */}
        <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-30">
          <div className="border-r border-white/40 border-b"></div>
          <div className="border-r border-white/40 border-b"></div>
          <div className="border-b border-white/40"></div>
          <div className="border-r border-white/40 border-b"></div>
          <div className="border-r border-white/40 border-b"></div>
          <div className="border-b border-white/40"></div>
          <div className="border-r border-white/40"></div>
          <div className="border-r border-white/40"></div>
          <div></div>
        </div>

        {/* Dimension badge */}
        <div className="absolute -top-6 left-0 px-1.5 py-0.5 rounded bg-zinc-900/90 border border-zinc-700 text-[10px] font-mono text-zinc-200 whitespace-nowrap shadow pointer-events-none">
          {pixelCropW} × {pixelCropH} px
        </div>

        {/* Resizing handles */}
        <div
          onPointerDown={(e) => handlePointerDown('nw', e)}
          className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-amber-400 border border-zinc-950 rounded-sm cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
        />
        <div
          onPointerDown={(e) => handlePointerDown('ne', e)}
          className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-amber-400 border border-zinc-950 rounded-sm cursor-nesw-resize shadow-md hover:scale-125 transition-transform"
        />
        <div
          onPointerDown={(e) => handlePointerDown('sw', e)}
          className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-amber-400 border border-zinc-950 rounded-sm cursor-nesw-resize shadow-md hover:scale-125 transition-transform"
        />
        <div
          onPointerDown={(e) => handlePointerDown('se', e)}
          className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-amber-400 border border-zinc-950 rounded-sm cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
        />
      </div>
    </div>
  );
}
