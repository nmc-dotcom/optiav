import { EditOptions, EncodingProgress, EncodingResult, VideoMetadata } from '../types/video';
import { transcodeVideo } from './ffmpegService';
import { transcodeWithCanvas } from './canvasTranscoder';

export interface TranscodeJob {
  promise: Promise<EncodingResult>;
  cancel: () => void;
}

/**
 * Starts a video encoding job with cancellation support, engine routing, and live progress
 */
export function startEncodingJob(
  metadata: VideoMetadata,
  options: EditOptions,
  onProgress: (progress: EncodingProgress) => void,
  preferHardwareCanvas = false
): TranscodeJob {
  const controller = new AbortController();

  // Engine selection:
  // If user explicitly chose 'hardware' or preferHardwareCanvas is true, use Canvas GPU hardware acceleration.
  // Otherwise, default to FFmpeg x264 high-quality studio engine (identical to HandBrake/ShanaEncoder).
  const requestedEngine = options.engine || (preferHardwareCanvas ? 'hardware' : 'ffmpeg');
  const shouldUseCanvas = requestedEngine === 'hardware';

  let lastProgressPercent = 0;
  let lastProgressTime = Date.now();
  let hasFallbackTriggered = false;

  const promise = (async () => {
    if (shouldUseCanvas) {
      return await transcodeWithCanvas(metadata, options, onProgress, controller.signal);
    }

    const wrappedOnProgress = (p: EncodingProgress) => {
      if (p.percent !== lastProgressPercent) {
        lastProgressPercent = p.percent;
        lastProgressTime = Date.now();
      }
      onProgress(p);
    };

    let wasmController: AbortController | null = new AbortController();

    // Watchdog check every 3 seconds: Only triggers if completely locked with 0 progress for >45s
    const watchdogInterval = setInterval(async () => {
      if (hasFallbackTriggered || controller.signal.aborted) {
        clearInterval(watchdogInterval);
        return;
      }

      const idleDuration = Date.now() - lastProgressTime;
      // High-resolution video frames take time to encode in WASM, so allow ample time (45s) before auto-fallback
      if (idleDuration > 45000 && !hasFallbackTriggered && lastProgressPercent === 0) {
        hasFallbackTriggered = true;
        clearInterval(watchdogInterval);
        console.warn(`[WATCHDOG] FFmpeg 엔진 장기 정체 감지. 하드웨어 가속 Canvas 엔진으로 안전 전환합니다.`);
        
        if (wasmController) {
          wasmController.abort();
        }
      }
    }, 3000);

    try {
      controller.signal.addEventListener('abort', () => {
        if (wasmController) wasmController.abort();
      });

      const result = await transcodeVideo(metadata, options, wrappedOnProgress, wasmController.signal);
      clearInterval(watchdogInterval);
      return result;
    } catch (err) {
      clearInterval(watchdogInterval);
      if (controller.signal.aborted) {
        throw err;
      }

      console.warn('FFmpeg WASM 실패, Canvas 엔진으로 안전 전환합니다:', err);
      onProgress({
        percent: 15,
        currentTime: 0,
        totalTime: options.endTime - options.startTime,
        estimatedRemainingSeconds: Math.round((options.endTime - options.startTime) / options.speed),
        stage: '하드웨어 가속(GPU) 엔진으로 전환하여 인코딩 진행 중...',
        logs: [
          `[엔진 복구] FFmpeg WASM 예외 발생: ${(err as Error).message}`,
          `[엔진 전환] 브라우저 내장 하드웨어 가속 GPU 엔진으로 작업을 계속합니다.`,
        ],
      });

      return await transcodeWithCanvas(metadata, options, onProgress, controller.signal);
    }
  })();

  return {
    promise,
    cancel: () => {
      controller.abort();
    },
  };
}

