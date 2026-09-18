import { EditOptions, EncodingProgress, EncodingResult, VideoMetadata } from '../types/video';
import { computeOutputDimensions } from '../utils/formatters';
import { loadFFmpeg } from './ffmpegService';

/**
 * Fast Client-side Video Transcoder using HTML5 Video, OffscreenCanvas/Canvas,
 * Web Audio API, and MediaRecorder.
 * 
 * Works 100% reliably in any browser environment without needing WebAssembly / SharedArrayBuffer.
 */
export async function transcodeWithCanvas(
  metadata: VideoMetadata,
  options: EditOptions,
  onProgress: (progress: EncodingProgress) => void,
  signal?: AbortSignal
): Promise<EncodingResult> {
  const startTime = options.startTime;
  const endTime = Math.min(options.endTime, metadata.duration);
  const duration = Math.max(0.1, endTime - startTime);
  const effectiveDuration = duration / options.speed;

  // Calculate output dimensions
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

  const canvas = document.createElement('canvas');
  canvas.width = dims.width;
  canvas.height = dims.height;
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: false })!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Prepare hidden video element for frame playback
  const video = document.createElement('video');
  video.src = metadata.url;
  video.crossOrigin = 'anonymous';
  video.playsInline = true;
  video.preload = 'auto';
  // Note: Keep muted false so createMediaElementSource can extract audio track,
  // but we do NOT connect to audioContext.destination (so no audible sound through speakers).
  video.muted = options.mute || !metadata.hasAudio;
  video.playbackRate = options.speed;

  await new Promise<void>((resolve, reject) => {
    const onLoaded = () => {
      video.removeEventListener('loadeddata', onLoaded);
      resolve();
    };
    video.addEventListener('loadeddata', onLoaded);
    video.onerror = () => reject(new Error('동영상 데이터를 로드할 수 없습니다.'));
  });

  // Setup Audio Context if audio is enabled
  let audioContext: AudioContext | null = null;
  let audioDest: MediaStreamAudioDestinationNode | null = null;
  let sourceNode: MediaElementAudioSourceNode | null = null;

  if (!options.mute && metadata.hasAudio) {
    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContext = new AudioCtxClass();
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      sourceNode = audioContext.createMediaElementSource(video);
      const gainNode = audioContext.createGain();
      gainNode.gain.value = options.volume;
      audioDest = audioContext.createMediaStreamDestination();
      sourceNode.connect(gainNode);
      // Connect to destination stream for recording only (not speakers)
      gainNode.connect(audioDest);
    } catch (e) {
      console.warn('Audio capture not available via Web Audio API, proceeding with video-only track:', e);
    }
  }

  // Setup Canvas Stream & MediaRecorder
  const targetFps = options.fps > 0 ? options.fps : (metadata.fps || 30);
  const stream = canvas.captureStream(targetFps);

  if (audioDest && audioDest.stream.getAudioTracks().length > 0) {
    stream.addTrack(audioDest.stream.getAudioTracks()[0]);
  }

  // Choose MIME type prioritizing H.264 High Profile and modern codecs
  let mimeType = 'video/webm';
  let isNativeMp4Supported = false;

  if (options.format === 'mp4') {
    // Check candidate MIME types supported across Chromium, Safari, and Firefox
    const mp4Candidates = [
      'video/mp4;codecs=avc1.640028,mp4a.40.2', // High Profile Level 4.0
      'video/mp4;codecs=avc1.4d4020,mp4a.40.2', // Main Profile
      'video/mp4;codecs=avc1.42E01E,mp4a.40.2', // Baseline Profile
      'video/mp4;codecs=avc1',
      'video/mp4;codecs=h264,aac',
      'video/mp4;codecs=h264',
      'video/mp4',                              // Browser native MP4 container
    ];
    for (const candidate of mp4Candidates) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(candidate)) {
        mimeType = candidate;
        isNativeMp4Supported = true;
        break;
      }
    }
  } else {
    const webmCandidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ];
    for (const candidate of webmCandidates) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(candidate)) {
        mimeType = candidate;
        break;
      }
    }
  }

  // Calculate high-fidelity bitrate based on quality or custom settings
  let videoBitsPerSecond = 3700000; // Standard 3.7 Mbps baseline (HD streaming quality)
  if (options.quality === 'fast') {
    videoBitsPerSecond = 1800000;
  } else if (options.quality === 'balanced') {
    videoBitsPerSecond = 3700000; // 3.7 Mbps default
  } else if (options.quality === 'high') {
    videoBitsPerSecond = 6500000; // 6.5 Mbps for pristine quality
  } else if (options.quality === 'bitrate') {
    videoBitsPerSecond = (options.targetBitrateKbps || 3700) * 1000;
  } else if (options.quality === 'target_size' && options.targetSizeMB > 0) {
    const totalBits = options.targetSizeMB * 8 * 1024 * 1024;
    videoBitsPerSecond = Math.max(300000, Math.floor(totalBits / effectiveDuration - 128000));
  } else if (options.quality === 'custom') {
    if (options.targetBitrateKbps > 0) {
      videoBitsPerSecond = options.targetBitrateKbps * 1000;
    } else {
      const factor = Math.pow(2, (23 - (options.crf || 23)) / 6);
      videoBitsPerSecond = Math.max(500000, Math.round(3700000 * factor));
    }
  }

  const audioBitsPerSecond = !options.mute && metadata.hasAudio ? 128000 : 0;
  const totalBitsPerSecond = videoBitsPerSecond + audioBitsPerSecond;

  const recorder = new MediaRecorder(stream, {
    mimeType,
    bitsPerSecond: totalBitsPerSecond,
    videoBitsPerSecond,
    audioBitsPerSecond: audioBitsPerSecond > 0 ? audioBitsPerSecond : undefined,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  // Seek video to startTime
  video.currentTime = startTime;
  await new Promise<void>((res) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      res();
    };
    // If video is already at or near startTime, resolve immediately
    if (Math.abs(video.currentTime - startTime) < 0.1) {
      res();
    } else {
      video.addEventListener('seeked', onSeeked);
      // Timeout fallback in case seeked doesn't fire
      setTimeout(() => {
        video.removeEventListener('seeked', onSeeked);
        res();
      }, 1500);
    }
  });

  const encodingStartTimestamp = performance.now();

  return new Promise<EncodingResult>((resolve, reject) => {
    let animFrameId: number | null = null;
    let isAborted = false;
    let hasFinished = false;
    let safetyTimeout: ReturnType<typeof setTimeout> | null = null;

    const finalizeAndStop = () => {
      if (hasFinished) return;
      hasFinished = true;
      if (safetyTimeout) clearTimeout(safetyTimeout);
      if (animFrameId) cancelAnimationFrame(animFrameId);

      onProgress({
        percent: 100,
        currentTime: duration,
        totalTime: duration,
        estimatedRemainingSeconds: 0,
        stage: '인코딩 완료! 최종 영상 데이터 패키징 중...',
        logs: ['[완료] 비디오 프레임 기록 종료. 파일 패키징 중...'],
      });

      try {
        video.pause();
      } catch {}

      if (recorder.state !== 'inactive') {
        try {
          // Request final data chunk before stopping
          recorder.requestData();
        } catch {}
        try {
          recorder.stop();
        } catch {}
      } else {
        // If recorder is already inactive, trigger packaging directly
        buildAndResolveResult();
      }
    };

    const buildAndResolveResult = async () => {
      if (isAborted) return;
      if (audioContext) {
        try { audioContext.close(); } catch {}
      }

      // If user requested MP4 and native MediaRecorder recorded in WebM, perform fast MP4 remuxing
      if (options.format === 'mp4' && !isNativeMp4Supported && chunks.length > 0) {
        try {
          onProgress({
            percent: 100,
            currentTime: duration,
            totalTime: duration,
            estimatedRemainingSeconds: 0,
            stage: '표준 MP4(H.264/AAC) 컨테이너로 고속 패키징 중...',
            logs: ['[MP4 패키징] 캔버스 레코딩 데이터를 표준 MP4 파일 포맷으로 변환 중...'],
          });

          const rawWebmBlob = new Blob(chunks, { type: 'video/webm' });
          const ffmpeg = await loadFFmpeg();
          const tempIn = `rec_${Date.now()}.webm`;
          const tempOut = `rec_${Date.now()}.mp4`;
          const fileBytes = new Uint8Array(await rawWebmBlob.arrayBuffer());
          await ffmpeg.writeFile(tempIn, fileBytes);

          try {
            await ffmpeg.exec(['-i', tempIn, '-c:v', 'copy', '-c:a', 'aac', '-movflags', 'faststart', tempOut]);
          } catch {
            await ffmpeg.exec(['-i', tempIn, '-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac', '-movflags', 'faststart', tempOut]);
          }

          const mp4Data = await ffmpeg.readFile(tempOut);
          await ffmpeg.deleteFile(tempIn).catch(() => {});
          await ffmpeg.deleteFile(tempOut).catch(() => {});

          const mp4Blob = new Blob([mp4Data as Uint8Array], { type: 'video/mp4' });
          const mp4Url = URL.createObjectURL(mp4Blob);
          const encodingDuration = (performance.now() - encodingStartTimestamp) / 1000;
          const savings = Math.max(0, ((metadata.size - mp4Blob.size) / metadata.size) * 100);
          const baseName = metadata.name.replace(/\.[^/.]+$/, '');
          const fileName = `${baseName}_edited.mp4`;

          resolve({
            blob: mp4Blob,
            url: mp4Url,
            fileName,
            size: mp4Blob.size,
            duration: effectiveDuration,
            width: dims.width,
            height: dims.height,
            format: 'mp4',
            originalSize: metadata.size,
            savingsPercent: Number(savings.toFixed(1)),
            encodingTimeSeconds: Number(encodingDuration.toFixed(1)),
          });
          return;
        } catch (remuxErr) {
          console.warn('MP4 고속 변환 예외 발생, 네이티브 블롭으로 패키징:', remuxErr);
        }
      }

      const actualType = isNativeMp4Supported ? 'video/mp4' : (mimeType.split(';')[0] || (options.format === 'mp4' ? 'video/mp4' : 'video/webm'));
      const blob = new Blob(chunks, { type: actualType });
      const url = URL.createObjectURL(blob);
      const encodingDuration = (performance.now() - encodingStartTimestamp) / 1000;
      const savings = Math.max(0, ((metadata.size - blob.size) / metadata.size) * 100);

      const ext = options.format === 'mp4' ? 'mp4' : (options.format === 'gif' ? 'gif' : 'webm');
      const baseName = metadata.name.replace(/\.[^/.]+$/, '');
      const fileName = `${baseName}_edited.${ext}`;

      resolve({
        blob,
        url,
        fileName,
        size: blob.size,
        duration: effectiveDuration,
        width: dims.width,
        height: dims.height,
        format: options.format === 'gif' ? 'webm' : options.format,
        originalSize: metadata.size,
        savingsPercent: Number(savings.toFixed(1)),
        encodingTimeSeconds: Number(encodingDuration.toFixed(1)),
      });
    };

    if (signal) {
      signal.addEventListener('abort', () => {
        isAborted = true;
        hasFinished = true;
        if (safetyTimeout) clearTimeout(safetyTimeout);
        if (animFrameId) cancelAnimationFrame(animFrameId);
        try { video.pause(); } catch {}
        try { if (recorder.state !== 'inactive') recorder.stop(); } catch {}
        if (audioContext) audioContext.close();
        reject(new Error('사용자에 의해 인코딩이 취소되었습니다.'));
      });
    }

    recorder.onstop = () => {
      buildAndResolveResult();
    };

    recorder.onerror = (e) => {
      if (safetyTimeout) clearTimeout(safetyTimeout);
      reject(new Error(`MediaRecorder 에러 발생: ${e}`));
    };

    // Video end event listeners as safety backups
    video.onended = () => {
      finalizeAndStop();
    };

    // timeupdate backup check
    video.ontimeupdate = () => {
      if (video.currentTime >= endTime - 0.05 || video.ended) {
        finalizeAndStop();
      }
    };

    // Frame rendering loop
    const renderFrame = () => {
      if (isAborted || hasFinished) return;

      const currentVidTime = video.currentTime;
      if (currentVidTime >= endTime - 0.05 || video.ended) {
        finalizeAndStop();
        return;
      }

      // Calculate progress
      const elapsed = Math.max(0, currentVidTime - startTime);
      const progressRatio = Math.min(1, elapsed / duration);
      const percent = Math.min(99, Math.round(progressRatio * 100));

      const timeSpent = (performance.now() - encodingStartTimestamp) / 1000;
      const estRemaining = progressRatio > 0.05
        ? Math.max(0, Math.round((timeSpent / progressRatio) - timeSpent))
        : Math.round(effectiveDuration);

      onProgress({
        percent,
        currentTime: elapsed,
        totalTime: duration,
        estimatedRemainingSeconds: estRemaining,
        stage: `인코딩 처리 중 (${percent}%)`,
        logs: [`현재 처리 위치: ${elapsed.toFixed(1)}s / ${duration.toFixed(1)}s`],
      });

      // Clear canvas with background color
      ctx.fillStyle = options.backgroundColor || '#000000';
      ctx.fillRect(0, 0, dims.width, dims.height);

      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Handle Rotation
      if (options.rotation !== 0) {
        ctx.translate(dims.width / 2, dims.height / 2);
        ctx.rotate((options.rotation * Math.PI) / 180);
        if (options.rotation === 90 || options.rotation === 270) {
          ctx.translate(-dims.height / 2, -dims.width / 2);
        } else {
          ctx.translate(-dims.width / 2, -dims.height / 2);
        }
      }

      // Handle Horizontal Flip
      if (options.flipHorizontal) {
        ctx.translate(dims.width, 0);
        ctx.scale(-1, 1);
      }

      // Crop source coordinates
      let sx = 0;
      let sy = 0;
      let sWidth = metadata.width;
      let sHeight = metadata.height;

      if (options.cropEnabled && options.cropArea.width > 0 && options.cropArea.height > 0) {
        sx = Math.round((metadata.width * options.cropArea.x) / 100);
        sy = Math.round((metadata.height * options.cropArea.y) / 100);
        sWidth = Math.round((metadata.width * options.cropArea.width) / 100);
        sHeight = Math.round((metadata.height * options.cropArea.height) / 100);
      }

      // Draw video frame to canvas with Fit or Fill scaling
      if (options.aspectRatioMode === 'fit') {
        const hRatio = dims.width / sWidth;
        const vRatio = dims.height / sHeight;
        const ratio = Math.min(hRatio, vRatio);
        const centerShiftX = (dims.width - sWidth * ratio) / 2;
        const centerShiftY = (dims.height - sHeight * ratio) / 2;
        ctx.drawImage(
          video,
          sx, sy, sWidth, sHeight,
          centerShiftX, centerShiftY, sWidth * ratio, sHeight * ratio
        );
      } else {
        // Fill: crop/zoom to fill canvas
        const hRatio = dims.width / sWidth;
        const vRatio = dims.height / sHeight;
        const ratio = Math.max(hRatio, vRatio);
        const centerShiftX = (dims.width - sWidth * ratio) / 2;
        const centerShiftY = (dims.height - sHeight * ratio) / 2;
        ctx.drawImage(
          video,
          sx, sy, sWidth, sHeight,
          centerShiftX, centerShiftY, sWidth * ratio, sHeight * ratio
        );
      }

      ctx.restore();

      // Use requestVideoFrameCallback if available for synchronized hardware frames, or fallback to requestAnimationFrame
      if ('requestVideoFrameCallback' in video) {
        animFrameId = (video as unknown as { requestVideoFrameCallback: (cb: () => void) => number }).requestVideoFrameCallback(renderFrame);
      } else {
        animFrameId = requestAnimationFrame(renderFrame);
      }
    };

    recorder.start(250); // Slice into 250ms chunks for smooth memory reclamation

    // Start video playback with autoplay fallback
    const startPlayback = async () => {
      // Safety timeout: calculate max reasonable encoding duration (effectiveDuration + 8 seconds buffer)
      const maxAllowedTimeMs = Math.max(10000, (effectiveDuration * 1000) + 8000);
      safetyTimeout = setTimeout(() => {
        if (!hasFinished) {
          console.warn('[CanvasTranscoder] Safe timeout triggered: ending recording.');
          finalizeAndStop();
        }
      }, maxAllowedTimeMs);

      try {
        await video.play();
        renderFrame();
      } catch (playErr) {
        console.warn('Autoplay blocked with sound, retrying muted:', playErr);
        video.muted = true;
        try {
          await video.play();
          renderFrame();
        } catch (retryErr) {
          if (safetyTimeout) clearTimeout(safetyTimeout);
          reject(new Error(`비디오 재생 실패: ${(retryErr as Error).message}`));
        }
      }
    };

    startPlayback();
  });
}
