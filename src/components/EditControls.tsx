import React, { useState } from 'react';
import {
  EditOptions,
  ResolutionPreset,
  AspectRatioPreset,
  AspectRatioMode,
  VideoMetadata,
} from '../types/video';
import {
  Maximize2,
  Ratio,
  Crop as CropIcon,
  RotateCw,
  Gauge,
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  Check,
} from 'lucide-react';

interface EditControlsProps {
  metadata: VideoMetadata;
  options: EditOptions;
  onChange: (updates: Partial<EditOptions>) => void;
}

export function EditControls({ metadata, options, onChange }: EditControlsProps) {
  const [activeTab, setActiveTab] = useState<'resolution' | 'aspect' | 'transform' | 'audio'>('resolution');

  // Resolution presets
  const resolutionPresets: { label: string; value: ResolutionPreset; desc: string }[] = [
    { label: '원본 크기', value: 'original', desc: `${metadata.width} × ${metadata.height}` },
    { label: '4K UHD', value: '3840x2160', desc: '3840 × 2160' },
    { label: '2K QHD', value: '2560x1440', desc: '2560 × 1440' },
    { label: 'FHD 1080p', value: '1920x1080', desc: '1920 × 1080' },
    { label: 'HD 720p', value: '1280x720', desc: '1280 × 720' },
    { label: 'SD 480p', value: '854x480', desc: '854 × 480' },
    { label: '360p', value: '640x360', desc: '640 × 360' },
    { label: '사용자 지정', value: 'custom', desc: '직접 입력' },
  ];

  // Aspect ratio presets
  const aspectPresets: { label: string; value: AspectRatioPreset; icon: string }[] = [
    { label: '원본 비율', value: 'original', icon: '◫' },
    { label: '16:9 (가로)', value: '16:9', icon: '▭' },
    { label: '9:16 (숏츠/릴스)', value: '9:16', icon: '▯' },
    { label: '4:3 (클래식)', value: '4:3', icon: '▱' },
    { label: '1:1 (정사각)', value: '1:1', icon: '□' },
    { label: '4:5 (피드)', value: '4:5', icon: '▤' },
    { label: '사용자 지정', value: 'custom', icon: '⚙' },
  ];

  // Handle custom width change
  const handleCustomWidth = (w: number) => {
    let h = options.customHeight;
    if (options.lockAspectRatio && metadata.width > 0) {
      const ratio = metadata.height / metadata.width;
      h = Math.round(w * ratio);
    }
    onChange({ customWidth: w, customHeight: h, resolutionPreset: 'custom' });
  };

  // Handle custom height change
  const handleCustomHeight = (h: number) => {
    let w = options.customWidth;
    if (options.lockAspectRatio && metadata.height > 0) {
      const ratio = metadata.width / metadata.height;
      w = Math.round(h * ratio);
    }
    onChange({ customWidth: w, customHeight: h, resolutionPreset: 'custom' });
  };

  // Rotate Right 90°
  const rotateRight = () => {
    const next = ((options.rotation + 90) % 360) as 0 | 90 | 180 | 270;
    onChange({ rotation: next });
  };

  // Rotate Left 90°
  const rotateLeft = () => {
    const next = ((options.rotation + 270) % 360) as 0 | 90 | 180 | 270;
    onChange({ rotation: next });
  };

  // Rotate 180°
  const rotate180 = () => {
    const next = ((options.rotation + 180) % 360) as 0 | 90 | 180 | 270;
    onChange({ rotation: next });
  };

  return (
    <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-sm flex flex-col">
      {/* Sub Navigation Bar */}
      <div className="flex border-b border-zinc-800 pb-2.5 mb-3.5 gap-1.5 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('resolution')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
            activeTab === 'resolution'
              ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>해상도</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('aspect')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
            activeTab === 'aspect'
              ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <Ratio className="w-3.5 h-3.5" />
          <span>비율 & 크롭</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('transform')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
            activeTab === 'transform'
              ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>회전 & 배속</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audio')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
            activeTab === 'audio'
              ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span>오디오</span>
        </button>
      </div>

      {/* Tab 1: Resolution */}
      {activeTab === 'resolution' && (
        <div className="space-y-3.5 text-xs">
          <div>
            <label className="block text-zinc-300 font-medium mb-1.5 text-[11px] uppercase tracking-wider">
              해상도 프리셋
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {resolutionPresets.map((preset) => {
                const isSelected = options.resolutionPreset === preset.value;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => onChange({ resolutionPreset: preset.value })}
                    className={`p-2 rounded-lg text-left border transition ${
                      isSelected
                        ? 'border-zinc-400 bg-zinc-800 text-zinc-100 font-semibold ring-1 ring-zinc-500/40'
                        : 'border-zinc-800 bg-zinc-950/60 hover:bg-zinc-800/50 text-zinc-400'
                    }`}
                  >
                    <div className="font-medium text-zinc-100 flex items-center justify-between">
                      <span>{preset.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-zinc-200" />}
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5 font-mono">
                      {preset.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Width & Height */}
          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-medium text-zinc-300">사용자 지정 해상도 (px)</span>
              <label className="flex items-center gap-1.5 cursor-pointer text-zinc-400 hover:text-zinc-200">
                <input
                  type="checkbox"
                  checked={options.lockAspectRatio}
                  onChange={(e) => onChange({ lockAspectRatio: e.target.checked })}
                  className="rounded bg-zinc-800 border-zinc-700 text-zinc-200 focus:ring-0"
                />
                {options.lockAspectRatio ? (
                  <Lock className="w-3.5 h-3.5 text-zinc-200" />
                ) : (
                  <Unlock className="w-3.5 h-3.5 text-zinc-500" />
                )}
                <span>비율 고정</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <span className="block text-zinc-400 mb-1 text-[11px]">너비 (Width)</span>
                <input
                  type="number"
                  min="160"
                  max="7680"
                  step="2"
                  value={options.customWidth}
                  onChange={(e) => handleCustomWidth(parseInt(e.target.value) || metadata.width)}
                  className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 font-mono text-xs focus:border-zinc-400 focus:outline-none"
                />
              </div>

              <div>
                <span className="block text-zinc-400 mb-1 text-[11px]">높이 (Height)</span>
                <input
                  type="number"
                  min="120"
                  max="4320"
                  step="2"
                  value={options.customHeight}
                  onChange={(e) => handleCustomHeight(parseInt(e.target.value) || metadata.height)}
                  className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 font-mono text-xs focus:border-zinc-400 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Aspect Ratio & Crop */}
      {activeTab === 'aspect' && (
        <div className="space-y-3.5 text-xs">
          {/* Aspect Presets */}
          <div>
            <label className="block text-zinc-300 font-medium mb-1.5 text-[11px] uppercase tracking-wider">
              화면 비율 프리셋
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {aspectPresets.map((preset) => {
                const isSelected = options.aspectRatioPreset === preset.value;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => onChange({ aspectRatioPreset: preset.value })}
                    className={`p-2 rounded-lg text-left border transition ${
                      isSelected
                        ? 'border-zinc-400 bg-zinc-800 text-zinc-100 font-semibold ring-1 ring-zinc-500/40'
                        : 'border-zinc-800 bg-zinc-950/60 hover:bg-zinc-800/50 text-zinc-400'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-medium text-zinc-100">
                      <span>{preset.icon}</span>
                      <span>{preset.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fit vs Fill Mode */}
          {options.aspectRatioPreset !== 'original' && (
            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
              <label className="block font-medium text-zinc-300">
                화면 비율 맞춤 방식
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onChange({ aspectRatioMode: 'fit' })}
                  className={`p-2.5 rounded-lg text-left border transition ${
                    options.aspectRatioMode === 'fit'
                      ? 'border-zinc-400 bg-zinc-800 text-zinc-100 font-semibold'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-400'
                  }`}
                >
                  <div className="font-medium text-zinc-200">Fit (맞춤)</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    전체 보존 (여백 채움)
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onChange({ aspectRatioMode: 'fill' })}
                  className={`p-2.5 rounded-lg text-left border transition ${
                    options.aspectRatioMode === 'fill'
                      ? 'border-zinc-400 bg-zinc-800 text-zinc-100 font-semibold'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-400'
                  }`}
                >
                  <div className="font-medium text-zinc-200">Fill (채움)</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    화면 가득 채우기 (크롭)
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Interactive Crop Section */}
          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CropIcon className="w-3.5 h-3.5 text-zinc-300" />
                <span className="font-medium text-zinc-200">자유 영역 크롭 (Crop)</span>
              </div>
              <button
                type="button"
                onClick={() =>
                  onChange({
                    cropEnabled: !options.cropEnabled,
                    cropArea: { x: 10, y: 10, width: 80, height: 80 },
                  })
                }
                className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                  options.cropEnabled
                    ? 'bg-zinc-100 text-zinc-900'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                {options.cropEnabled ? '크롭 켜짐' : '크롭 끄기'}
              </button>
            </div>

            {options.cropEnabled && (
              <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                <span className="block text-zinc-400 text-[11px]">크롭 비율 고정:</span>
                <div className="flex flex-wrap gap-1">
                  {(['free', '16:9', '9:16', '1:1', '4:3'] as const).map((constraint) => (
                    <button
                      key={constraint}
                      type="button"
                      onClick={() => onChange({ cropAspectConstraint: constraint })}
                      className={`px-2 py-0.5 rounded text-xs font-mono border transition ${
                        options.cropAspectConstraint === constraint
                          ? 'border-zinc-400 bg-zinc-800 text-zinc-100 font-semibold'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {constraint === 'free' ? '자유' : constraint}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Rotation & Speed */}
      {activeTab === 'transform' && (
        <div className="space-y-3.5 text-xs">
          {/* Rotation Buttons */}
          <div>
            <label className="block text-zinc-300 font-medium mb-1.5 text-[11px] uppercase tracking-wider">
              영상 회전 및 반전
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={rotateRight}
                className="p-2 rounded-lg border border-zinc-800 bg-zinc-950 hover:bg-zinc-800 text-zinc-200 flex items-center justify-center gap-1.5 font-medium transition"
              >
                <RotateCw className="w-3.5 h-3.5 text-zinc-300" />
                <span>90° 우회전</span>
              </button>

              <button
                type="button"
                onClick={rotateLeft}
                className="p-2 rounded-lg border border-zinc-800 bg-zinc-950 hover:bg-zinc-800 text-zinc-200 flex items-center justify-center gap-1.5 font-medium transition"
              >
                <RotateCw className="w-3.5 h-3.5 text-zinc-300 -scale-x-100" />
                <span>90° 좌회전</span>
              </button>

              <button
                type="button"
                onClick={rotate180}
                className="p-2 rounded-lg border border-zinc-800 bg-zinc-950 hover:bg-zinc-800 text-zinc-200 flex items-center justify-center gap-1.5 font-medium transition"
              >
                <RotateCw className="w-3.5 h-3.5 text-zinc-300 rotate-180" />
                <span>180° 회전</span>
              </button>

              <button
                type="button"
                onClick={() => onChange({ flipHorizontal: !options.flipHorizontal })}
                className={`p-2 rounded-lg border transition flex items-center justify-center gap-1.5 font-medium ${
                  options.flipHorizontal
                    ? 'border-zinc-400 bg-zinc-800 text-zinc-100'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                <span>⇄ 좌우 반전</span>
              </button>
            </div>
          </div>

          {/* Speed Selection */}
          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-medium text-zinc-300 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-zinc-400" />
                <span>재생 속도 (배속)</span>
              </label>
              <span className="font-mono text-zinc-100 font-semibold text-xs">
                {options.speed}x
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {[0.25, 0.5, 1, 1.25, 1.5, 2].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onChange({ speed: s })}
                  className={`py-1.5 rounded font-mono font-medium text-xs border transition ${
                    options.speed === s
                      ? 'border-zinc-400 bg-zinc-800 text-zinc-100 font-semibold'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Audio Controls */}
      {activeTab === 'audio' && (
        <div className="space-y-3.5 text-xs">
          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2.5">
            <label className="font-medium text-zinc-300 block">오디오 채널</label>

            {/* Mute vs Keep audio radio */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onChange({ mute: false })}
                className={`p-2.5 rounded-lg border text-left flex items-start gap-2 transition ${
                  !options.mute
                    ? 'border-zinc-400 bg-zinc-800 text-zinc-100 font-semibold'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-400'
                }`}
              >
                <Volume2 className="w-3.5 h-3.5 text-zinc-300 shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-zinc-200">오디오 보존</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">음성 트랙 포함</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onChange({ mute: true })}
                className={`p-2.5 rounded-lg border text-left flex items-start gap-2 transition ${
                  options.mute
                    ? 'border-zinc-400 bg-zinc-800 text-zinc-100 font-semibold'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-400'
                }`}
              >
                <VolumeX className="w-3.5 h-3.5 text-zinc-300 shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-zinc-200">음소거</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">오디오 트랙 제거</div>
                </div>
              </button>
            </div>

            {/* Volume level slider */}
            {!options.mute && (
              <div className="pt-2 border-t border-zinc-800 space-y-1.5">
                <div className="flex items-center justify-between text-zinc-300">
                  <span>볼륨 증폭/감쇄</span>
                  <span className="font-mono text-zinc-100 font-semibold">
                    {Math.round(options.volume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.05"
                  value={options.volume}
                  onChange={(e) => onChange({ volume: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-zinc-700 rounded appearance-none cursor-pointer accent-zinc-400"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
