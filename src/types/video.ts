export type OutputFormat = 'mp4' | 'webm' | 'gif';

export type ResolutionPreset = 
  | 'original' 
  | '3840x2160' 
  | '2560x1440' 
  | '1920x1080' 
  | '1280x720' 
  | '854x480' 
  | '640x360' 
  | 'custom';

export type AspectRatioPreset = 
  | 'original' 
  | '16:9' 
  | '9:16' 
  | '4:3' 
  | '1:1' 
  | '4:5' 
  | 'custom';

export type AspectRatioMode = 'fit' | 'fill';

export type QualityPreset = 'fast' | 'balanced' | 'high' | 'bitrate' | 'custom' | 'target_size';

export interface CropArea {
  x: number;      // 0 to 100 percentage
  y: number;      // 0 to 100 percentage
  width: number;  // 0 to 100 percentage
  height: number; // 0 to 100 percentage
}

export interface VideoMetadata {
  file: File;
  name: string;
  size: number;
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  hasAudio: boolean;
  type: string;
  url: string;
  thumbnails: string[];
}

export interface EditOptions {
  // Trimming
  startTime: number;
  endTime: number;

  // Resolution
  resolutionPreset: ResolutionPreset;
  customWidth: number;
  customHeight: number;
  lockAspectRatio: boolean;

  // Aspect ratio & Fit/Fill
  aspectRatioPreset: AspectRatioPreset;
  aspectRatioMode: AspectRatioMode;
  backgroundColor: string;

  // Crop
  cropEnabled: boolean;
  cropArea: CropArea;
  cropAspectConstraint: 'free' | '16:9' | '9:16' | '1:1' | '4:3';

  // Rotation & Flip
  rotation: 0 | 90 | 180 | 270;
  flipHorizontal: boolean;

  // Speed
  speed: number;

  // Audio
  mute: boolean;
  volume: number; // 1.0 is 100%

  // Output Format & Quality
  format: OutputFormat;
  quality: QualityPreset;
  engine?: 'ffmpeg' | 'hardware'; // 'ffmpeg' (x264 고화질 스튜디오 엔진, 타 인코더 100% 동일) or 'hardware' (GPU Canvas 가속)
  crf: number;
  targetBitrateKbps: number;
  x264Preset?: 'ultrafast' | 'veryfast' | 'faster' | 'fast';
  fps: number; // 0 = keep original

  // Target size
  targetSizeMB: number;

  // GIF options
  gifFps: number;
  gifMaxWidth: number;
}

export interface EncodingProgress {
  percent: number;
  currentTime: number;
  totalTime: number;
  estimatedRemainingSeconds: number;
  stage: string;
  logs: string[];
}

export interface EncodingResult {
  blob: Blob;
  url: string;
  fileName: string;
  size: number;
  duration: number;
  width: number;
  height: number;
  format: OutputFormat;
  originalSize: number;
  savingsPercent: number;
  encodingTimeSeconds: number;
}
