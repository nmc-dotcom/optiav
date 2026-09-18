import React from 'react';
import { EditOptions, OutputFormat, QualityPreset, VideoMetadata } from '../types/video';
import { formatBytes, estimateOutputSize, computeOutputDimensions, estimateVideoBitrateKbps } from '../utils/formatters';
import { FileOutput, Sliders, Zap, Award, Target, HelpCircle, Gauge, Cpu, CheckCircle, Flame } from 'lucide-react';

interface OutputSettingsProps {
  metadata: VideoMetadata;
  options: EditOptions;
  onChange: (updates: Partial<EditOptions>) => void;
}

export function OutputSettings({ metadata, options, onChange }: OutputSettingsProps) {
  const duration = Math.max(0.1, (options.endTime - options.startTime) / options.speed);

  // Compute target dimensions for estimation
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

  // Estimated output size
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

  // Current effective video bitrate in kbps
  const currentBitrateKbps = estimateVideoBitrateKbps(
    options.quality,
    options.crf,
    options.targetBitrateKbps,
    options.targetSizeMB,
    duration,
    dims.width,
    dims.height
  );

  const activeEngine = options.engine || 'ffmpeg';

  return (
    <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-sm flex flex-col space-y-4">
      
      {/* 1. Core Transcoding Engine Selection */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-zinc-300" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              인코딩 엔진 선택
            </h3>
          </div>
          <span className="text-[11px] text-zinc-400 font-mono">
            {activeEngine === 'ffmpeg' ? 'FFmpeg x264 Studio' : 'GPU Canvas Hardware'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* FFmpeg Studio Engine */}
          <button
            type="button"
            onClick={() => onChange({ engine: 'ffmpeg' })}
            className={`p-3 rounded-lg border text-left transition ${
              activeEngine === 'ffmpeg'
                ? 'border-zinc-400 bg-zinc-800 text-zinc-100 ring-1 ring-zinc-500/40'
                : 'border-zinc-800/80 bg-zinc-950/60 hover:bg-zinc-800/60 text-zinc-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-zinc-100 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                FFmpeg x264 고화질 스튜디오 엔진
              </span>
              {activeEngine === 'ffmpeg' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-200 font-mono">
                  적용중
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1 leading-snug">
              HandBrake·샤나인코더 동등 화질. H.264 High Profile, CABAC 무손실 압축, B-프레임 3중 모션 예측 적용.
            </p>
          </button>

          {/* Hardware Accelerated Canvas Engine */}
          <button
            type="button"
            onClick={() => onChange({ engine: 'hardware' })}
            className={`p-3 rounded-lg border text-left transition ${
              activeEngine === 'hardware'
                ? 'border-zinc-400 bg-zinc-800 text-zinc-100 ring-1 ring-zinc-500/40'
                : 'border-zinc-800/80 bg-zinc-950/60 hover:bg-zinc-800/60 text-zinc-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-zinc-100 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-blue-400" />
                GPU 하드웨어 가속 Canvas 엔진
              </span>
              {activeEngine === 'hardware' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-200 font-mono">
                  적용중
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1 leading-snug">
              브라우저 내장 하드웨어 가속 렌더링. 실시간 프레임 캡처 기반 빠른 인코딩 지원.
            </p>
          </button>
        </div>
      </div>

      {/* 2. Format Selection */}
      <div className="border-t border-zinc-800 pt-3">
        <div className="flex items-center gap-2 mb-2">
          <FileOutput className="w-4 h-4 text-zinc-300" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            출력 포맷
          </h3>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {/* MP4 */}
          <button
            type="button"
            onClick={() => onChange({ format: 'mp4' })}
            className={`p-2.5 rounded-lg border text-left transition ${
              options.format === 'mp4'
                ? 'border-zinc-400 bg-zinc-800 text-zinc-100 ring-1 ring-zinc-500/40'
                : 'border-zinc-800 bg-zinc-950/60 hover:bg-zinc-800/50 text-zinc-400'
            }`}
          >
            <div className="font-semibold text-zinc-100 text-xs">MP4</div>
            <div className="text-[11px] text-zinc-400 mt-0.5">H.264 + AAC</div>
            <div className="text-[10px] text-zinc-300 font-mono mt-0.5">범용 호환</div>
          </button>

          {/* WebM */}
          <button
            type="button"
            onClick={() => onChange({ format: 'webm' })}
            className={`p-2.5 rounded-lg border text-left transition ${
              options.format === 'webm'
                ? 'border-zinc-400 bg-zinc-800 text-zinc-100 ring-1 ring-zinc-500/40'
                : 'border-zinc-800 bg-zinc-950/60 hover:bg-zinc-800/50 text-zinc-400'
            }`}
          >
            <div className="font-semibold text-zinc-100 text-xs">WebM</div>
            <div className="text-[11px] text-zinc-400 mt-0.5">VP9 + Opus</div>
            <div className="text-[10px] text-zinc-300 font-mono mt-0.5">웹 최적화</div>
          </button>

          {/* GIF */}
          <button
            type="button"
            onClick={() => onChange({ format: 'gif' })}
            className={`p-2.5 rounded-lg border text-left transition ${
              options.format === 'gif'
                ? 'border-zinc-400 bg-zinc-800 text-zinc-100 ring-1 ring-zinc-500/40'
                : 'border-zinc-800 bg-zinc-950/60 hover:bg-zinc-800/50 text-zinc-400'
            }`}
          >
            <div className="font-semibold text-zinc-100 text-xs">GIF</div>
            <div className="text-[11px] text-zinc-400 mt-0.5">애니메이션 짤</div>
            <div className="text-[10px] text-zinc-300 font-mono mt-0.5">무음 루프</div>
          </button>
        </div>
      </div>

      {/* Format-specific Extra Settings (GIF) */}
      {options.format === 'gif' && (
        <div className="p-3 rounded-lg bg-zinc-950/70 border border-zinc-800 space-y-2.5 text-xs">
          <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>GIF 변환 파라미터</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="block text-zinc-400 mb-1 text-[11px]">프레임레이트 (FPS)</span>
              <div className="grid grid-cols-3 gap-1">
                {[10, 15, 20].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => onChange({ gifFps: f })}
                    className={`py-1 rounded text-xs font-mono border ${
                      options.gifFps === f
                        ? 'border-zinc-400 bg-zinc-800 text-zinc-100 font-semibold'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {f} fps
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-zinc-400 mb-1 text-[11px]">최대 가로폭 (px)</span>
              <div className="grid grid-cols-3 gap-1">
                {[320, 480, 640].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => onChange({ gifMaxWidth: w })}
                    className={`py-1 rounded text-xs font-mono border ${
                      options.gifMaxWidth === w
                        ? 'border-zinc-400 bg-zinc-800 text-zinc-100 font-semibold'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {w}px
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Quality & Bitrate Settings */}
      {options.format !== 'gif' && (
        <div className="border-t border-zinc-800 pt-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-zinc-300" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                화질 및 압축 비트레이트
              </h3>
            </div>
            {/* Real-time Bitrate & Output Size Monitor */}
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700/60 text-zinc-300">
                비트레이트: <strong className="text-zinc-100">~{currentBitrateKbps.toLocaleString()} kbps</strong>
              </span>
              <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700/60 text-zinc-300">
                예상 용량: <strong className="text-zinc-100">~{formatBytes(estimatedBytes)}</strong>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {/* Fast */}
            <button
              type="button"
              onClick={() => onChange({ quality: 'fast' })}
              className={`p-2.5 rounded-lg border text-left transition ${
                options.quality === 'fast'
                  ? 'border-zinc-400 bg-zinc-800 text-zinc-100 ring-1 ring-zinc-500/40'
                  : 'border-zinc-800 bg-zinc-950/60 hover:bg-zinc-800/50 text-zinc-400'
              }`}
            >
              <div className="flex items-center gap-1 font-semibold text-zinc-100">
                <Zap className="w-3.5 h-3.5 text-zinc-400" />
                <span>빠른 압축</span>
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">CRF 28 (~1.8Mbps)</div>
            </button>

            {/* Balanced */}
            <button
              type="button"
              onClick={() => onChange({ quality: 'balanced' })}
              className={`p-2.5 rounded-lg border text-left transition ${
                options.quality === 'balanced'
                  ? 'border-zinc-400 bg-zinc-800 text-zinc-100 ring-1 ring-zinc-500/40'
                  : 'border-zinc-800 bg-zinc-950/60 hover:bg-zinc-800/50 text-zinc-400'
              }`}
            >
              <div className="flex items-center gap-1 font-semibold text-zinc-100">
                <Award className="w-3.5 h-3.5 text-zinc-400" />
                <span>균형 (표준)</span>
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">CRF 23 (~3.7Mbps)</div>
            </button>

            {/* High Quality */}
            <button
              type="button"
              onClick={() => onChange({ quality: 'high' })}
              className={`p-2.5 rounded-lg border text-left transition ${
                options.quality === 'high'
                  ? 'border-zinc-400 bg-zinc-800 text-zinc-100 ring-1 ring-zinc-500/40'
                  : 'border-zinc-800 bg-zinc-950/60 hover:bg-zinc-800/50 text-zinc-400'
              }`}
            >
              <div className="flex items-center gap-1 font-semibold text-zinc-100">
                <CheckCircle className="w-3.5 h-3.5 text-zinc-400" />
                <span>고화질</span>
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">CRF 18 (~6.5Mbps)</div>
            </button>

            {/* Bitrate Specified Mode */}
            <button
              type="button"
              onClick={() => onChange({ quality: 'bitrate', targetBitrateKbps: options.targetBitrateKbps || 3700 })}
              className={`p-2.5 rounded-lg border text-left transition ${
                options.quality === 'bitrate'
                  ? 'border-zinc-400 bg-zinc-800 text-zinc-100 ring-1 ring-zinc-500/40'
                  : 'border-zinc-800 bg-zinc-950/60 hover:bg-zinc-800/50 text-zinc-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 font-semibold text-zinc-100">
                  <Gauge className="w-3.5 h-3.5 text-zinc-300" />
                  <span>비트레이트 지정</span>
                </div>
                <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-zinc-700 text-zinc-200">
                  {options.targetBitrateKbps || 3700}k
                </span>
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">수치 직접 입력</div>
            </button>
          </div>

          {/* Bitrate Direct Input Section */}
          {options.quality === 'bitrate' && (
            <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-medium text-zinc-200">
                  <Gauge className="w-3.5 h-3.5 text-zinc-400" />
                  <span>목표 비트레이트 수치 (kbps) 직접 설정</span>
                </div>
                <span className="text-[11px] text-zinc-300 font-mono">
                  설정값: <strong className="text-zinc-100">{options.targetBitrateKbps || 3700} kbps</strong>
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="300"
                    max="50000"
                    step="100"
                    value={options.targetBitrateKbps || 3700}
                    onChange={(e) =>
                      onChange({ targetBitrateKbps: Math.max(100, parseInt(e.target.value) || 3700) })
                    }
                    className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-md text-zinc-100 font-mono text-xs focus:border-zinc-400 focus:outline-none"
                    placeholder="예: 3700"
                  />
                  <span className="absolute right-3 top-2 font-bold text-zinc-400 font-mono text-xs">
                    kbps
                  </span>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1">
                  {[
                    { label: '1500k', val: 1500, desc: '저용량 (모바일)' },
                    { label: '2500k', val: 2500, desc: '720p HD' },
                    { label: '3700k', val: 3700, desc: '1080p 표준 권장 (HandBrake 동등)' },
                    { label: '5000k', val: 5000, desc: '고화질' },
                    { label: '8000k', val: 8000, desc: '초고화질' },
                  ].map((item) => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => onChange({ targetBitrateKbps: item.val })}
                      className={`px-2 py-1 rounded text-xs font-mono border transition ${
                        (options.targetBitrateKbps || 3700) === item.val
                          ? 'border-zinc-400 bg-zinc-800 text-zinc-100 font-semibold'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                      }`}
                      title={item.desc}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-2.5 rounded bg-zinc-900/90 border border-zinc-800 text-[11px] text-zinc-300 leading-relaxed">
                <div className="flex items-center gap-1.5 text-zinc-200 font-medium mb-1">
                  <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                  <span>H.264 High Profile (Level 4.1) & CABAC 무손실 압축 연동</span>
                </div>
                <p className="text-zinc-400">
                  타 전문 인코더(HandBrake, 샤나인코더 등)와 100% 동일한 <strong>CABAC 엔트로피 코딩</strong>, <strong>B-프레임 3중 예측</strong>, <strong>8x8 DCT 주파수 변환</strong> 및 <strong>동적 VBR 버퍼링</strong>이 실행됩니다.
                </p>
              </div>
            </div>
          )}

          {/* Target File Size Input Section */}
          {options.quality === 'target_size' && (
            <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <label className="font-medium text-zinc-200">
                  목표 파일 용량 설정
                </label>
                <span className="text-[11px] text-zinc-400">
                  카카오톡/디스코드/이메일 첨부용
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    step="1"
                    value={options.targetSizeMB}
                    onChange={(e) =>
                      onChange({ targetSizeMB: Math.max(1, parseInt(e.target.value) || 20) })
                    }
                    className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-md text-zinc-100 font-mono text-xs focus:border-zinc-400 focus:outline-none"
                    placeholder="예: 25"
                  />
                  <span className="absolute right-3 top-2 font-bold text-zinc-400">
                    MB
                  </span>
                </div>

                {/* Quick Presets */}
                <div className="flex gap-1">
                  {[5, 10, 20, 50, 100].map((mb) => (
                    <button
                      key={mb}
                      type="button"
                      onClick={() => onChange({ targetSizeMB: mb })}
                      className={`px-2 py-1 rounded text-xs font-mono border ${
                        options.targetSizeMB === mb
                          ? 'border-zinc-400 bg-zinc-800 text-zinc-100 font-semibold'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {mb}M
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Advanced Video Settings (x264 Preset, FPS, CRF Tuning) */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() =>
                onChange({
                  quality: options.quality === 'custom' ? 'balanced' : 'custom',
                })
              }
              className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 font-medium transition"
            >
              <span>{options.quality === 'custom' ? '▼ 고급 인코딩 파라미터 접기' : '▶ 고급 인코딩 파라미터 (x264 프리셋, FPS, CRF 세부 조정)'}</span>
            </button>

            {options.quality === 'custom' && (
              <div className="mt-2.5 p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-3 text-xs">
                {/* CRF Fine-Tuning */}
                <div>
                  <div className="flex items-center justify-between text-zinc-300 mb-1">
                    <span>CRF 품질 계수 (기본 23 · 낮을수록 고화질)</span>
                    <span className="font-mono text-zinc-100 font-bold">{options.crf}</span>
                  </div>
                  <input
                    type="range"
                    min="16"
                    max="35"
                    step="1"
                    value={options.crf}
                    onChange={(e) => onChange({ crf: parseInt(e.target.value) })}
                    className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-zinc-400"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-0.5">
                    <span>16 (초고화질)</span>
                    <span>23 (표준 균형)</span>
                    <span>35 (최대 압축)</span>
                  </div>
                </div>

                {/* x264 Encoding Preset */}
                {options.format === 'mp4' && (
                  <div>
                    <div className="flex items-center justify-between text-zinc-300 mb-1">
                      <span>x264 인코딩 프리셋 (모션 예측 정밀도)</span>
                      <span className="font-mono text-zinc-200">
                        {options.x264Preset || 'veryfast'}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { label: 'ultrafast', val: 'ultrafast', desc: '초고속' },
                        { label: 'veryfast', val: 'veryfast', desc: '표준 권장 (CABAC/B-Frame)' },
                        { label: 'faster', val: 'faster', desc: '정밀 예측' },
                        { label: 'fast', val: 'fast', desc: '최고 압축률' },
                      ].map((item) => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => onChange({ x264Preset: item.val as any })}
                          className={`py-1 rounded text-xs font-mono border text-center transition ${
                            (options.x264Preset || 'veryfast') === item.val
                              ? 'border-zinc-400 bg-zinc-800 text-zinc-100 font-semibold'
                              : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                          }`}
                          title={item.desc}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Target FPS */}
                <div>
                  <span className="block text-zinc-300 mb-1">출력 프레임레이트 (FPS)</span>
                  <div className="grid grid-cols-5 gap-1">
                    {[
                      { label: '원본 유지', val: 0 },
                      { label: '15 fps', val: 15 },
                      { label: '24 fps', val: 24 },
                      { label: '30 fps', val: 30 },
                      { label: '60 fps', val: 60 },
                    ].map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => onChange({ fps: item.val })}
                        className={`py-1 rounded text-xs font-mono border ${
                          options.fps === item.val
                            ? 'border-zinc-400 bg-zinc-800 text-zinc-100 font-semibold'
                            : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
