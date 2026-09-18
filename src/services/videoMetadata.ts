import { VideoMetadata } from '../types/video';

/**
 * Extracts metadata and generates timeline thumbnails from a video File
 */
export async function extractVideoMetadata(file: File): Promise<VideoMetadata> {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.preload = 'metadata';
  video.src = url;
  video.muted = true;
  video.playsInline = true;

  return new Promise((resolve, reject) => {
    video.onloadedmetadata = async () => {
      try {
        const duration = video.duration || 0;
        const width = video.videoWidth || 1280;
        const height = video.videoHeight || 720;

        // Check audio presence
        let hasAudio = false;
        try {
          // Check webkitAudioDecodedByteCount or audioTracks if available
          // @ts-expect-error webkit specific
          if (typeof video.webkitAudioDecodedByteCount !== 'undefined') {
            // @ts-expect-error webkit specific
            hasAudio = video.webkitAudioDecodedByteCount > 0;
          } else if ('audioTracks' in video) {
            // @ts-expect-error audioTracks standard
            hasAudio = video.audioTracks && video.audioTracks.length > 0;
          } else {
            // Default to true for mp4, webm, mov, mkv
            hasAudio = true;
          }
        } catch {
          hasAudio = true;
        }

        // Detect video codec / type
        let codec = 'H.264 / AAC';
        if (file.type.includes('webm')) codec = 'VP9 / Opus';
        else if (file.type.includes('ogg')) codec = 'Theora / Vorbis';
        else if (file.name.endsWith('.mov')) codec = 'ProRes / H.264';
        else if (file.name.endsWith('.mkv')) codec = 'Matroska / H.264';

        // Extract thumbnail filmstrip (6 to 10 thumbnails)
        const thumbnails = await generateThumbnailStrip(video, duration, 8);

        resolve({
          file,
          name: file.name,
          size: file.size,
          duration,
          width,
          height,
          fps: 30, // standard baseline
          codec,
          hasAudio,
          type: file.type || 'video/mp4',
          url,
          thumbnails,
        });
      } catch (err) {
        console.warn('Failed to extract full thumbnails, fallback:', err);
        resolve({
          file,
          name: file.name,
          size: file.size,
          duration: video.duration || 10,
          width: video.videoWidth || 1280,
          height: video.videoHeight || 720,
          fps: 30,
          codec: 'H.264 / AAC',
          hasAudio: true,
          type: file.type || 'video/mp4',
          url,
          thumbnails: [],
        });
      }
    };

    video.onerror = () => {
      reject(new Error('동영상 메타데이터를 불러오는 중 오류가 발생했습니다. 브라우저에서 지원되지 않는 형식이거나 손상된 파일일 수 있습니다.'));
    };
  });
}

/**
 * Extracts a sequence of thumbnail frames across the video duration
 */
async function generateThumbnailStrip(
  video: HTMLVideoElement,
  duration: number,
  count = 8
): Promise<string[]> {
  if (duration <= 0) return [];
  const thumbnails: string[] = [];
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 90;
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  const step = duration / (count + 1);

  for (let i = 1; i <= count; i++) {
    const time = step * i;
    try {
      await seekVideo(video, time);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      thumbnails.push(canvas.toDataURL('image/jpeg', 0.6));
    } catch (e) {
      console.warn(`Error generating thumb at ${time}s:`, e);
    }
  }

  return thumbnails;
}

function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      resolve();
    };
    video.addEventListener('seeked', onSeeked);
    video.currentTime = Math.min(time, video.duration - 0.1);
  });
}

/**
 * Generates an HD Sample Video using HTML5 Canvas & MediaRecorder
 * Complete with animation, timecode, and synthesized audio beep so users can test immediately.
 */
export async function createSampleVideo(): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d')!;

  const durationSeconds = 6;
  const fps = 30;
  const totalFrames = durationSeconds * fps;

  // Audio Context for synthetic sound
  const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  const dest = audioCtx.createMediaStreamDestination();

  // Create oscillator for tone
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  osc.connect(gain);
  gain.connect(dest);
  osc.start();

  const stream = canvas.captureStream(fps);
  const audioTrack = dest.stream.getAudioTracks()[0];
  if (audioTrack) {
    stream.addTrack(audioTrack);
  }

  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm';

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 2500000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  return new Promise((resolve) => {
    recorder.onstop = () => {
      osc.stop();
      audioCtx.close();
      const blob = new Blob(chunks, { type: 'video/webm' });
      const file = new File([blob], 'optiav_sample_hd.webm', { type: 'video/webm' });
      resolve(file);
    };

    recorder.start(100);

    let frame = 0;
    const interval = setInterval(() => {
      if (frame >= totalFrames) {
        clearInterval(interval);
        recorder.stop();
        return;
      }

      const progress = frame / totalFrames;
      const secondsRemaining = (durationSeconds - (frame / fps)).toFixed(1);

      // Draw background gradient
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#1e293b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 80) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 80) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Animated orbiting circles
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const angle = progress * Math.PI * 4;

      // Outer ring
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, cy, 160, 0, Math.PI * 2);
      ctx.stroke();

      // Orbiting orb
      const orbX = cx + Math.cos(angle) * 160;
      const orbY = cy + Math.sin(angle) * 160;
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(orbX, orbY, 18, 0, Math.PI * 2);
      ctx.fill();

      // Inner progress arc
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(cx, cy, 120, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
      ctx.stroke();

      // Title & Text
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('OPTIAV Sample Video', cx, cy - 30);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '20px sans-serif';
      ctx.fillText('1280 × 720 • 30 FPS • Stereo Audio', cx, cy + 15);

      // Countdown display
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 42px monospace';
      ctx.fillText(`${secondsRemaining}s`, cx, cy + 70);

      // Top badge
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(40, 40, 200, 36);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('● TEST FOOTAGE', 55, 64);

      frame++;
    }, 1000 / fps);
  });
}
