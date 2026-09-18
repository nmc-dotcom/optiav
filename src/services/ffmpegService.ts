import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { EditOptions, EncodingProgress, EncodingResult, VideoMetadata } from '../types/video';
import { calculateTargetBitrate, computeOutputDimensions } from '../utils/formatters';
import { transcodeWithCanvas } from './canvasTranscoder';

let ffmpegInstance: FFmpeg | null = null;
let isLoaded = false;
let isLoading = false;

/**
 * Initializes and loads FFmpeg.wasm core with retry and fallback
 */
export async function loadFFmpeg(
  onProgress?: (progress: number, message: string) => void
): Promise<FFmpeg> {
  if (ffmpegInstance && isLoaded) {
    return ffmpegInstance;
  }

  if (isLoading) {
    // Wait until loading completes
    while (isLoading) {
      await new Promise((r) => setTimeout(r, 100));
    }
    if (ffmpegInstance && isLoaded) return ffmpegInstance;
  }

  isLoading = true;
  try {
    const ffmpeg = new FFmpeg();
    ffmpegInstance = ffmpeg;

    onProgress?.(10, 'FFmpeg 엔진을 불러오는 중...');

    // Load from reliable unpkg, jsdelivr, or cdnjs mirrors
    const cdnBases = [
      'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm',
      'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm',
      'https://cdnjs.cloudflare.com/ajax/libs/ffmpeg-core/0.12.6/esm',
    ];

    let lastError: unknown = null;
    for (const baseURL of cdnBases) {
      try {
        onProgress?.(40, `FFmpeg 바이너리 다운로드 중 (${new URL(baseURL).hostname})...`);
        const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
        const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');

        onProgress?.(80, 'FFmpeg WebAssembly 컴파일 및 초기화 중...');
        const loadPromise = ffmpeg.load({
          coreURL,
          wasmURL,
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`FFmpeg WASM 초기화 시간 초과 (${baseURL})`)), 30000)
        );

        await Promise.race([loadPromise, timeoutPromise]);

        isLoaded = true;
        onProgress?.(100, 'FFmpeg 준비 완료');
        return ffmpeg;
      } catch (cdnErr) {
        lastError = cdnErr;
        console.warn(`FFmpeg CDN ${baseURL} 로드 실패, 다음 미러 서버 시도:`, cdnErr);
      }
    }

    throw lastError || new Error('모든 FFmpeg CDN 미러 서버 연결에 실패했습니다.');
  } catch (err) {
    console.warn('FFmpeg.wasm 로딩 실패, Canvas/WebCodecs fallback 사용 예정:', err);
    throw err;
  } finally {
    isLoading = false;
  }
}

/**
 * Checks whether FFmpeg is currently loaded and ready
 */
export function isFFmpegReady(): boolean {
  return isLoaded && ffmpegInstance !== null;
}

/**
 * Main transcoding function: Uses FFmpeg.wasm if available, or seamlessly
 * falls back to high-performance CanvasTranscoder.
 */
export async function transcodeVideo(
  metadata: VideoMetadata,
  options: EditOptions,
  onProgress: (progress: EncodingProgress) => void,
  signal?: AbortSignal
): Promise<EncodingResult> {
  const logEntries: string[] = [];
  const appendLog = (msg: string) => {
    logEntries.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
    if (logEntries.length > 50) logEntries.shift();
  };

  appendLog('영상 변환 프로세스 시작');

  // Try FFmpeg first (supports GIF, exact CRF, H.264, WebM)
  try {
    const ffmpeg = await loadFFmpeg((pct, stage) => {
      onProgress({
        percent: Math.round(pct * 0.1), // 0-10% is engine loading
        currentTime: 0,
        totalTime: options.endTime - options.startTime,
        estimatedRemainingSeconds: 0,
        stage,
        logs: [...logEntries],
      });
    });

    appendLog('FFmpeg.wasm 엔진 연결 성공');
    return await executeFFmpegTranscode(ffmpeg, metadata, options, onProgress, logEntries, signal);
  } catch (err) {
    appendLog(`FFmpeg WASM 처리 예외 (${(err as Error).message}), 브라우저 내장 Canvas 엔진으로 안전 처리`);
    onProgress({
      percent: 5,
      currentTime: 0,
      totalTime: options.endTime - options.startTime,
      estimatedRemainingSeconds: 0,
      stage: '하드웨어 가속 GPU 엔진으로 자동 전환 중...',
      logs: [...logEntries],
    });

    // Fallback to Canvas/MediaRecorder
    return await transcodeWithCanvas(metadata, options, onProgress, signal);
  }
}

/**
 * Executes transcoding using FFmpeg command line
 */
async function executeFFmpegTranscode(
  ffmpeg: FFmpeg,
  metadata: VideoMetadata,
  options: EditOptions,
  onProgress: (progress: EncodingProgress) => void,
  logs: string[],
  signal?: AbortSignal
): Promise<EncodingResult> {
  const startTime = options.startTime;
  const endTime = Math.min(options.endTime, metadata.duration);
  const duration = Math.max(0.1, endTime - startTime);
  const effectiveDuration = duration / options.speed;

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

  const ext = metadata.name.split('.').pop() || 'mp4';
  const inputFileName = `input.${ext}`;
  const outputExt = options.format === 'gif' ? 'gif' : options.format;
  const outputFileName = `output.${outputExt}`;

  // Write file to FFmpeg virtual FS
  logs.push('입력 영상 메모리 로딩 중...');
  const fileData = await fetchFile(metadata.file);
  await ffmpeg.writeFile(inputFileName, fileData);

  const filterChains: string[] = [];

  // 1. Crop filter
  if (options.cropEnabled && options.cropArea.width > 0 && options.cropArea.height > 0) {
    const cw = Math.round((metadata.width * options.cropArea.width) / 100);
    const ch = Math.round((metadata.height * options.cropArea.height) / 100);
    const cx = Math.round((metadata.width * options.cropArea.x) / 100);
    const cy = Math.round((metadata.height * options.cropArea.y) / 100);
    filterChains.push(`crop=${cw}:${ch}:${cx}:${cy}`);
  }

  // 2. Rotation & Flip filters
  if (options.rotation === 90) {
    filterChains.push('transpose=1');
  } else if (options.rotation === 180) {
    filterChains.push('transpose=2,transpose=2');
  } else if (options.rotation === 270) {
    filterChains.push('transpose=2');
  }

  if (options.flipHorizontal) {
    filterChains.push('hflip');
  }

  // 3. Scaling & Aspect Ratio mode
  if (options.aspectRatioPreset !== 'original' && options.aspectRatioMode === 'fit') {
    filterChains.push(
      `scale=${dims.width}:${dims.height}:force_original_aspect_ratio=decrease,pad=${dims.width}:${dims.height}:(ow-iw)/2:(oh-ih)/2:color=${options.backgroundColor.replace('#', '0x') || 'black'}`
    );
  } else if (options.aspectRatioPreset !== 'original' && options.aspectRatioMode === 'fill') {
    filterChains.push(
      `scale=${dims.width}:${dims.height}:force_original_aspect_ratio=increase,crop=${dims.width}:${dims.height}`
    );
  } else {
    filterChains.push(`scale=${dims.width}:${dims.height}`);
  }

  // 4. Video Speed
  if (options.speed !== 1) {
    filterChains.push(`setpts=${(1 / options.speed).toFixed(4)}*PTS`);
  }

  // 5. FPS
  if (options.fps > 0) {
    filterChains.push(`fps=${options.fps}`);
  }

  // Assemble CLI arguments
  const args: string[] = [];

  // Trimming parameters
  args.push('-ss', startTime.toString());
  args.push('-to', endTime.toString());
  args.push('-i', inputFileName);

  // Video filter string
  const vfString = filterChains.join(',');

  // Audio filter & handling
  if (options.format === 'gif' || options.mute || !metadata.hasAudio) {
    args.push('-an');
  } else {
    const audioFilters: string[] = [];
    if (options.volume !== 1.0) {
      audioFilters.push(`volume=${options.volume.toFixed(2)}`);
    }
    if (options.speed !== 1.0) {
      let remainingSpeed = options.speed;
      // atempo only accepts 0.5 to 2.0, so chain if needed
      while (remainingSpeed > 2.0) {
        audioFilters.push('atempo=2.0');
        remainingSpeed /= 2.0;
      }
      while (remainingSpeed < 0.5) {
        audioFilters.push('atempo=0.5');
        remainingSpeed /= 0.5;
      }
      audioFilters.push(`atempo=${remainingSpeed.toFixed(4)}`);
    }
    if (audioFilters.length > 0) {
      args.push('-af', audioFilters.join(','));
    }
  }

  // Format-specific encoding flags
  if (options.format === 'gif') {
    const gifFps = options.gifFps || 15;
    const maxW = options.gifMaxWidth || 480;
    const finalVf = vfString ? `${vfString},fps=${gifFps},scale=${maxW}:-1:flags=lanczos` : `fps=${gifFps},scale=${maxW}:-1:flags=lanczos`;
    args.push('-vf', `${finalVf},split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`);
  } else if (options.format === 'webm') {
    if (vfString) args.push('-vf', vfString);
    args.push('-c:v', 'libvpx-vp9');

    if (options.quality === 'target_size' && options.targetSizeMB > 0) {
      const vBitrate = calculateTargetBitrate(options.targetSizeMB, effectiveDuration);
      args.push('-b:v', `${vBitrate}k`);
    } else if ((options.quality === 'bitrate' || options.quality === 'custom') && options.targetBitrateKbps > 0) {
      args.push('-b:v', `${options.targetBitrateKbps}k`);
    } else {
      const crfMap = { fast: 32, balanced: 28, high: 20, custom: options.crf || 28, bitrate: 28 };
      args.push('-crf', (crfMap[options.quality as keyof typeof crfMap] || 28).toString(), '-b:v', '0');
    }

    if (!options.mute && metadata.hasAudio) {
      args.push('-c:a', 'libopus', '-b:a', '128k');
    }
  } else {
    // Default MP4 H.264 (High Profile with B-frames, CABAC, 8x8 DCT enabled)
    if (vfString) args.push('-vf', vfString);
    
    // Choose x264 preset: 'veryfast' provides high quality (CABAC, B-frames, 8x8 DCT) with high WASM performance
    const preset = options.x264Preset || 'veryfast';
    args.push(
      '-c:v', 'libx264',
      '-preset', preset,
      '-profile:v', 'high',
      '-level', '4.1',
      '-pix_fmt', 'yuv420p'
    );

    if (options.quality === 'target_size' && options.targetSizeMB > 0) {
      const vBitrate = calculateTargetBitrate(options.targetSizeMB, effectiveDuration);
      args.push(
        '-b:v', `${vBitrate}k`,
        '-maxrate', `${Math.round(vBitrate * 1.4)}k`,
        '-bufsize', `${Math.round(vBitrate * 2.5)}k`
      );
    } else if (options.quality === 'bitrate' || (options.quality === 'custom' && options.targetBitrateKbps > 0)) {
      const vBitrate = options.targetBitrateKbps || 3700;
      args.push(
        '-b:v', `${vBitrate}k`,
        '-maxrate', `${Math.round(vBitrate * 1.5)}k`,
        '-bufsize', `${Math.round(vBitrate * 2.5)}k`
      );
    } else {
      const crfMap = { fast: 28, balanced: 23, high: 18, custom: options.crf || 23, bitrate: 23 };
      args.push('-crf', (crfMap[options.quality as keyof typeof crfMap] || 23).toString());
    }

    if (!options.mute && metadata.hasAudio) {
      args.push('-c:a', 'aac', '-b:a', '128k');
    }
  }

  args.push('-y', outputFileName);

  logs.push(`FFmpeg 실행 인수: ${args.join(' ')}`);

  const startTimeStamp = performance.now();

  // Progress hook
  const progressHandler = ({ progress, time }: { progress: number; time: number }) => {
    const elapsedSeconds = time / 1000000; // microseconds to seconds
    const percent = Math.min(99, Math.max(1, Math.round(progress * 100)));
    const timeSpent = (performance.now() - startTimeStamp) / 1000;
    const estRemaining = progress > 0.05
      ? Math.max(0, Math.round((timeSpent / progress) - timeSpent))
      : Math.round(effectiveDuration);

    onProgress({
      percent,
      currentTime: elapsedSeconds || (duration * progress),
      totalTime: duration,
      estimatedRemainingSeconds: estRemaining,
      stage: `비디오 인코딩 처리 중 (${percent}%)`,
      logs: [...logs],
    });
  };

  ffmpeg.on('progress', progressHandler);

  const logHandler = ({ message }: { message: string }) => {
    if (message.includes('frame=') || message.includes('size=') || message.includes('time=')) {
      logs.push(message.trim());
      if (logs.length > 50) logs.shift();
    }
  };
  ffmpeg.on('log', logHandler);

  // Cancellation listener
  let isCancelled = false;
  if (signal) {
    signal.addEventListener('abort', () => {
      isCancelled = true;
      try {
        ffmpeg.terminate();
        isLoaded = false;
        ffmpegInstance = null;
      } catch {}
    });
  }

  try {
    await ffmpeg.exec(args);
  } catch (execErr) {
    if (isCancelled) {
      throw new Error('인코딩이 취소되었습니다.');
    }
    throw execErr;
  } finally {
    ffmpeg.off('progress', progressHandler);
    ffmpeg.off('log', logHandler);
  }

  if (isCancelled) {
    throw new Error('인코딩이 취소되었습니다.');
  }

  onProgress({
    percent: 100,
    currentTime: duration,
    totalTime: duration,
    estimatedRemainingSeconds: 0,
    stage: '인코딩 완료! 최종 비디오 파일 추출 중...',
    logs: [...logs, '[WASM] 변환 완료. 가상 파일 시스템에서 결과 데이터 추출 중...'],
  });

  // Read result file from virtual FS
  const outputData = await ffmpeg.readFile(outputFileName);
  // Clean up virtual files
  try {
    await ffmpeg.deleteFile(inputFileName);
    await ffmpeg.deleteFile(outputFileName);
  } catch {}

  const mimeMap = {
    mp4: 'video/mp4',
    webm: 'video/webm',
    gif: 'image/gif',
  };

  const outputBlob = new Blob([outputData as Uint8Array], { type: mimeMap[options.format] });
  const outputUrl = URL.createObjectURL(outputBlob);
  const encodingTime = (performance.now() - startTimeStamp) / 1000;
  const savings = Math.max(0, ((metadata.size - outputBlob.size) / metadata.size) * 100);

  const baseName = metadata.name.replace(/\.[^/.]+$/, '');
  const fileName = `${baseName}_edited.${outputExt}`;

  return {
    blob: outputBlob,
    url: outputUrl,
    fileName,
    size: outputBlob.size,
    duration: effectiveDuration,
    width: dims.width,
    height: dims.height,
    format: options.format,
    originalSize: metadata.size,
    savingsPercent: Number(savings.toFixed(1)),
    encodingTimeSeconds: Number(encodingTime.toFixed(1)),
  };
}
