/**
 * Formats bytes to human-readable string (e.g. 34.8 MB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Formats seconds to HH:MM:SS or MM:SS
 */
export function formatTime(seconds: number, includeMs = false): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);

  const formattedMins = String(mins).padStart(2, '0');
  const formattedSecs = String(secs).padStart(2, '0');

  if (hrs > 0) {
    const formattedHrs = String(hrs).padStart(2, '0');
    return includeMs
      ? `${formattedHrs}:${formattedMins}:${formattedSecs}.${ms}`
      : `${formattedHrs}:${formattedMins}:${formattedSecs}`;
  }

  return includeMs
    ? `${formattedMins}:${formattedSecs}.${ms}`
    : `${formattedMins}:${formattedSecs}`;
}

/**
 * Parses time string (HH:MM:SS or MM:SS or S) to seconds
 */
export function parseTimeString(str: string): number {
  const parts = str.trim().split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 1) {
    return parts[0];
  }
  return 0;
}

/**
 * Calculates estimated target bitrate for a given target file size in MB
 * Target Bitrate ≈ Target Size × 8 / Duration - Audio Bitrate
 */
export function calculateTargetBitrate(
  targetSizeMB: number,
  durationSeconds: number,
  audioBitrateKbps = 128
): number {
  if (durationSeconds <= 0) return 2000;
  const totalBits = targetSizeMB * 8 * 1024 * 1024; // bits
  const totalBitrateKbps = totalBits / durationSeconds / 1024;
  const videoBitrateKbps = Math.max(200, Math.floor(totalBitrateKbps - audioBitrateKbps));
  return videoBitrateKbps;
}

/**
 * Computes final output width and height considering crop, aspect ratio presets, and resolution limits
 */
export function computeOutputDimensions(
  origW: number,
  origH: number,
  resolutionPreset: string,
  customW: number,
  customH: number,
  aspectPreset: string,
  aspectMode: 'fit' | 'fill',
  cropEnabled: boolean,
  cropArea: { width: number; height: number },
  rotation: number
): { width: number; height: number } {
  let w = origW;
  let h = origH;

  // Apply crop dimensions first
  if (cropEnabled && cropArea.width > 0 && cropArea.height > 0) {
    w = Math.round((origW * cropArea.width) / 100);
    h = Math.round((origH * cropArea.height) / 100);
  }

  // Account for 90 or 270 degree rotation
  if (rotation === 90 || rotation === 270) {
    const temp = w;
    w = h;
    h = temp;
  }

  // Apply resolution preset
  if (resolutionPreset === 'custom' && customW > 0 && customH > 0) {
    w = customW;
    h = customH;
  } else if (resolutionPreset !== 'original') {
    const [rw, rh] = resolutionPreset.split('x').map(Number);
    if (rw && rh) {
      const scale = Math.min(rw / w, rh / h, 1.0); // Don't artificially upscale unless requested
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }
  }

  // Apply Aspect Ratio
  if (aspectPreset !== 'original' && aspectPreset !== 'custom') {
    let targetRatio = 16 / 9;
    if (aspectPreset === '16:9') targetRatio = 16 / 9;
    else if (aspectPreset === '9:16') targetRatio = 9 / 16;
    else if (aspectPreset === '4:3') targetRatio = 4 / 3;
    else if (aspectPreset === '1:1') targetRatio = 1;
    else if (aspectPreset === '4:5') targetRatio = 4 / 5;

    if (aspectMode === 'fit') {
      // Fit video inside target ratio (add bars/padding)
      const currentRatio = w / h;
      if (currentRatio > targetRatio) {
        h = Math.round(w / targetRatio);
      } else {
        w = Math.round(h * targetRatio);
      }
    } else {
      // Fill: crop to aspect ratio
      const currentRatio = w / h;
      if (currentRatio > targetRatio) {
        w = Math.round(h * targetRatio);
      } else {
        h = Math.round(w / targetRatio);
      }
    }
  }

  // FFmpeg H.264 requires even dimensions (divisible by 2)
  w = Math.max(2, Math.round(w / 2) * 2);
  h = Math.max(2, Math.round(h / 2) * 2);

  return { width: w, height: h };
}

/**
 * Calculates estimated video bitrate in kbps based on settings
 */
export function estimateVideoBitrateKbps(
  quality: string,
  crf: number,
  targetBitrateKbps: number,
  targetSizeMB: number,
  durationSeconds: number,
  width: number,
  height: number
): number {
  if (quality === 'target_size' && targetSizeMB > 0) {
    const dur = Math.max(1, durationSeconds);
    const totalKbps = Math.round((targetSizeMB * 8 * 1024) / dur);
    return Math.max(200, totalKbps - 128);
  }
  if (quality === 'bitrate') {
    return targetBitrateKbps > 0 ? targetBitrateKbps : 3700;
  }
  if (quality === 'custom' && targetBitrateKbps > 0) {
    return targetBitrateKbps;
  }

  const pixelCount = width * height;
  if (quality === 'fast') {
    return Math.round((pixelCount / (1920 * 1080)) * 1800);
  }
  if (quality === 'balanced') {
    return Math.round((pixelCount / (1920 * 1080)) * 3700);
  }
  if (quality === 'high') {
    return Math.round((pixelCount / (1920 * 1080)) * 6500);
  }
  if (quality === 'custom') {
    const factor = Math.pow(2, (23 - crf) / 6);
    return Math.round((pixelCount / (1920 * 1080)) * 3700 * factor);
  }
  return 3700;
}

/**
 * Calculates estimated output size in bytes
 */
export function estimateOutputSize(
  durationSeconds: number,
  format: 'mp4' | 'webm' | 'gif',
  quality: string,
  crf: number,
  targetBitrateKbps: number,
  targetSizeMB: number,
  width: number,
  height: number,
  fps = 30,
  hasAudio = true,
  mute = false
): number {
  if (quality === 'target_size' && targetSizeMB > 0) {
    return targetSizeMB * 1024 * 1024;
  }

  const duration = Math.max(1, durationSeconds);
  const pixelCount = width * height;

  if (format === 'gif') {
    // GIF size estimation based on resolution, duration, and frame rate
    const bytesPerFrame = (pixelCount * 0.45); // approximate compression ratio for GIF
    return Math.round(bytesPerFrame * fps * duration);
  }

  let vBitrateKbps = 3700;
  if (quality === 'fast') {
    // CRF ~28
    vBitrateKbps = Math.round((pixelCount / (1920 * 1080)) * 1800);
  } else if (quality === 'balanced') {
    // CRF ~23
    vBitrateKbps = Math.round((pixelCount / (1920 * 1080)) * 3700);
  } else if (quality === 'high') {
    // CRF ~18
    vBitrateKbps = Math.round((pixelCount / (1920 * 1080)) * 6500);
  } else if (quality === 'bitrate') {
    vBitrateKbps = targetBitrateKbps > 0 ? targetBitrateKbps : 3700;
  } else if (quality === 'custom') {
    if (targetBitrateKbps > 0) {
      vBitrateKbps = targetBitrateKbps;
    } else {
      // derive from CRF
      const factor = Math.pow(2, (23 - crf) / 6);
      vBitrateKbps = Math.round((pixelCount / (1920 * 1080)) * 3700 * factor);
    }
  }

  const audioBitrateKbps = !mute && hasAudio ? 128 : 0;
  const totalBitrateKbps = Math.max(200, vBitrateKbps + audioBitrateKbps);

  return Math.round((totalBitrateKbps * 1024 * duration) / 8);
}
