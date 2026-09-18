import { useState, useCallback } from 'react';
import { VideoMetadata, EditOptions, EncodingProgress, EncodingResult } from './types/video';
import { extractVideoMetadata } from './services/videoMetadata';
import { startEncodingJob, TranscodeJob } from './services/transcoder';

import { Header } from './components/Header';
import { UploadDropzone } from './components/UploadDropzone';
import { VideoInfoBanner } from './components/VideoInfoBanner';
import { VideoPlayer } from './components/VideoPlayer';
import { TimelineTrimmer } from './components/TimelineTrimmer';
import { EditControls } from './components/EditControls';
import { OutputSettings } from './components/OutputSettings';
import { SummaryCard } from './components/SummaryCard';
import { EncodingModal } from './components/EncodingModal';
import { ResultView } from './components/ResultView';
import { BrowserSupportModal } from './components/BrowserSupportModal';
import { AlertCircle } from 'lucide-react';

const defaultOptions: EditOptions = {
  startTime: 0,
  endTime: 10,
  resolutionPreset: 'original',
  customWidth: 1280,
  customHeight: 720,
  lockAspectRatio: true,
  aspectRatioPreset: 'original',
  aspectRatioMode: 'fit',
  backgroundColor: '#000000',
  cropEnabled: false,
  cropArea: { x: 10, y: 10, width: 80, height: 80 },
  cropAspectConstraint: 'free',
  rotation: 0,
  flipHorizontal: false,
  speed: 1,
  mute: false,
  volume: 1.0,
  format: 'mp4',
  quality: 'balanced',
  crf: 23,
  targetBitrateKbps: 3700,
  x264Preset: 'veryfast',
  fps: 0,
  targetSizeMB: 20,
  gifFps: 15,
  gifMaxWidth: 480,
};

export default function App() {
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [options, setOptions] = useState<EditOptions>(defaultOptions);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Encoding states
  const [isEncoding, setIsEncoding] = useState(false);
  const [encodingProgress, setEncodingProgress] = useState<EncodingProgress>({
    percent: 0,
    currentTime: 0,
    totalTime: 0,
    estimatedRemainingSeconds: 0,
    stage: '초기화 중...',
    logs: [],
  });
  const [activeJob, setActiveJob] = useState<TranscodeJob | null>(null);
  const [encodingResult, setEncodingResult] = useState<EncodingResult | null>(null);
  const [preferHardwareCanvas, setPreferHardwareCanvas] = useState(false);

  // Browser diagnostics modal
  const [isBrowserModalOpen, setIsBrowserModalOpen] = useState(false);

  // Partial update helper
  const handleUpdateOptions = useCallback((updates: Partial<EditOptions>) => {
    setOptions((prev) => ({ ...prev, ...updates }));
  }, []);

  // Handle uploaded video file
  const handleFileSelect = async (file: File) => {
    setErrorMsg(null);
    try {
      const meta = await extractVideoMetadata(file);
      setMetadata(meta);
      setCurrentTime(0);

      // Large file protection: If file is >= 50MB, automatically set hardware acceleration (Canvas)
      // to completely eliminate 32-bit WebAssembly MEMFS memory allocation failure (OOM freeze at 8%)
      const isLarge = meta.size >= 50 * 1024 * 1024;
      if (isLarge) {
        setPreferHardwareCanvas(true);
      }

      setOptions({
        ...defaultOptions,
        startTime: 0,
        endTime: meta.duration,
        customWidth: meta.width,
        customHeight: meta.height,
        mute: !meta.hasAudio,
      });
      setEncodingResult(null);
    } catch (err) {
      setErrorMsg((err as Error).message || '동영상을 로드하는데 실패했습니다.');
    }
  };

  // Start encoding process with specified engine preference
  const handleStartEncodingWith = async (useCanvas: boolean) => {
    if (!metadata) return;
    setErrorMsg(null);
    setIsEncoding(true);
    setIsProcessing(true);
    setEncodingProgress({
      percent: 0,
      currentTime: 0,
      totalTime: options.endTime - options.startTime,
      estimatedRemainingSeconds: Math.round((options.endTime - options.startTime) / options.speed),
      stage: useCanvas
        ? '하드웨어 가속(GPU) 스트리밍 엔진 초기화 중...'
        : '인코더 프로세스 초기화 중...',
      logs: [
        `[INIT] 엔진: ${useCanvas ? '하드웨어 가속 Canvas (OOM 면역)' : 'FFmpeg.wasm'}`,
        `[SIZE] 입력 파일 크기: ${(metadata.size / (1024 * 1024)).toFixed(1)} MB`,
      ],
    });

    const job = startEncodingJob(
      metadata,
      options,
      (progress) => {
        setEncodingProgress(progress);
      },
      useCanvas
    );

    setActiveJob(job);

    try {
      const result = await job.promise;
      setEncodingResult(result);
      setIsEncoding(false);
    } catch (err) {
      const msg = (err as Error).message;
      if (!msg.includes('취소')) {
        setErrorMsg(`인코딩 오류: ${msg}`);
      }
      setIsEncoding(false);
    } finally {
      setIsProcessing(false);
      setActiveJob(null);
    }
  };

  const handleStartEncoding = () => {
    handleStartEncodingWith(preferHardwareCanvas);
  };

  // Force switch to Canvas Hardware Acceleration immediately
  const handleForceCanvas = () => {
    if (activeJob) {
      activeJob.cancel();
      setActiveJob(null);
    }
    setPreferHardwareCanvas(true);
    // Restart with Canvas engine after short tick
    setTimeout(() => {
      handleStartEncodingWith(true);
    }, 150);
  };

  // Cancel encoding
  const handleCancelEncoding = () => {
    if (activeJob) {
      activeJob.cancel();
      setActiveJob(null);
    }
    setIsEncoding(false);
    setIsProcessing(false);
  };

  // Reset all
  const handleReset = () => {
    if (metadata?.url) {
      URL.revokeObjectURL(metadata.url);
    }
    if (encodingResult?.url) {
      URL.revokeObjectURL(encodingResult.url);
    }
    setMetadata(null);
    setEncodingResult(null);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-zinc-700 selection:text-white">
      {/* Top Navigation & Brand Header */}
      <Header
        hasVideo={!!metadata}
        onReset={handleReset}
        onOpenBrowserInfo={() => setIsBrowserModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col">
        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 text-xs flex items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="text-xs text-red-300 hover:text-white font-medium px-2 py-0.5 rounded"
            >
              닫기
            </button>
          </div>
        )}

        {/* View 1: Upload Dropzone if no video loaded */}
        {!metadata && (
          <UploadDropzone
            onFileSelect={handleFileSelect}
          />
        )}

        {/* View 2: Result Screen if encoding finished */}
        {metadata && encodingResult && (
          <ResultView
            result={encodingResult}
            onReEdit={() => setEncodingResult(null)}
            onNewVideo={handleReset}
          />
        )}

        {/* View 3: Active Video Editor Studio */}
        {metadata && !encodingResult && (
          <div className="space-y-4">
            {/* Top Video Metadata Banner */}
            <VideoInfoBanner metadata={metadata} />

            {/* Video Player Preview Stage */}
            <VideoPlayer
              metadata={metadata}
              options={options}
              onOptionsChange={handleUpdateOptions}
              currentTime={currentTime}
              onTimeUpdate={setCurrentTime}
            />

            {/* Timeline Filmstrip Trimmer */}
            <TimelineTrimmer
              duration={metadata.duration}
              startTime={options.startTime}
              endTime={options.endTime}
              currentTime={currentTime}
              thumbnails={metadata.thumbnails}
              onTrimChange={(start, end) => handleUpdateOptions({ startTime: start, endTime: end })}
              onSeek={setCurrentTime}
            />

            {/* Two-Column Editor Grid: Left = Edit Controls, Right = Output Settings */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              {/* Left Column: Resolution, Aspect Ratio, Crop, Rotation, Audio */}
              <EditControls
                metadata={metadata}
                options={options}
                onChange={handleUpdateOptions}
              />

              {/* Right Column: Format, Quality, Bitrate, Target Size MB */}
              <OutputSettings
                metadata={metadata}
                options={options}
                onChange={handleUpdateOptions}
              />
            </div>

            {/* Final Pre-encoding Summary Bar & Action CTA */}
            <SummaryCard
              metadata={metadata}
              options={options}
              onStartEncoding={handleStartEncoding}
              preferHardwareCanvas={preferHardwareCanvas}
              onToggleEngine={setPreferHardwareCanvas}
              isProcessing={isProcessing}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-3.5 px-4 text-center text-xs text-zinc-500 font-mono">
        <p>
          OPTIAV Studio • 브라우저 샌드박스 내부 로컬 고성능 비디오 인코딩 시스템
        </p>
      </footer>

      {/* In-Progress Encoding Modal */}
      {isEncoding && (
        <EncodingModal
          progress={encodingProgress}
          onCancel={handleCancelEncoding}
          onForceCanvas={handleForceCanvas}
        />
      )}

      {/* Browser Hardware Capabilities Diagnostics Modal */}
      <BrowserSupportModal
        isOpen={isBrowserModalOpen}
        onClose={() => setIsBrowserModalOpen(false)}
      />
    </div>
  );
}
