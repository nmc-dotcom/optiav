import { useState } from 'react';
import { EncodingResult } from '../types/video';
import { formatBytes } from '../utils/formatters';
import { loadFFmpeg } from '../services/ffmpegService';
import {
  Download,
  RotateCcw,
  PlusCircle,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  Clock,
  Maximize,
  FileVideo,
  FileDown,
  Loader2,
} from 'lucide-react';

interface ResultViewProps {
  result: EncodingResult;
  onReEdit: () => void;
  onNewVideo: () => void;
}

export function ResultView({ result, onReEdit, onNewVideo }: ResultViewProps) {
  const [isConvertingMp4, setIsConvertingMp4] = useState(false);
  const isReduced = result.size < result.originalSize;
  const sizeDiff = Math.abs(result.originalSize - result.size);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = result.url;
    a.download = result.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadMp4 = async () => {
    if (result.format === 'mp4' && result.fileName.endsWith('.mp4')) {
      handleDownload();
      return;
    }

    try {
      setIsConvertingMp4(true);
      const ffmpeg = await loadFFmpeg();
      const inName = `input_${Date.now()}.${result.format}`;
      const outName = `output_${Date.now()}.mp4`;
      const rawBytes = new Uint8Array(await result.blob.arrayBuffer());
      await ffmpeg.writeFile(inName, rawBytes);
      try {
        await ffmpeg.exec(['-i', inName, '-c:v', 'copy', '-c:a', 'aac', '-movflags', 'faststart', outName]);
      } catch {
        await ffmpeg.exec(['-i', inName, '-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac', '-movflags', 'faststart', outName]);
      }
      const data = await ffmpeg.readFile(outName);
      await ffmpeg.deleteFile(inName).catch(() => {});
      await ffmpeg.deleteFile(outName).catch(() => {});

      const mp4Blob = new Blob([data as Uint8Array], { type: 'video/mp4' });
      const mp4Url = URL.createObjectURL(mp4Blob);
      const baseName = result.fileName.replace(/\.[^/.]+$/, '');
      const a = document.createElement('a');
      a.href = mp4Url;
      a.download = `${baseName}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.warn('MP4 즉시 변환 다운로드 실패, 기본 다운로드 수행:', e);
      handleDownload();
    } finally {
      setIsConvertingMp4(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto my-6 px-4 space-y-4 animate-in fade-in zoom-in-95 duration-200">
      {/* Success Banner */}
      <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-3 text-zinc-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-zinc-100">
              인코딩 작업 완료
            </h2>
            <p className="text-[11px] text-zinc-400">
              로컬 브라우저에서 인코딩된 파일이 준비되었습니다.
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
          <Clock className="w-3.5 h-3.5 text-zinc-400" />
          <span>소요: {result.encodingTimeSeconds}초</span>
        </div>
      </div>

      {/* Result Video Player */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        <div className="w-full aspect-video bg-black flex items-center justify-center">
          {result.format === 'gif' ? (
            <img
              src={result.url}
              alt="변환된 GIF"
              className="max-w-full max-h-[480px] object-contain"
            />
          ) : (
            <video
              src={result.url}
              controls
              autoPlay
              loop
              playsInline
              className="max-w-full max-h-[480px] object-contain"
            />
          )}
        </div>
      </div>

      {/* Specs Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Original Size Card */}
        <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800">
          <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">
            원본 파일 크기
          </span>
          <div className="text-xl font-bold font-mono text-zinc-300">
            {formatBytes(result.originalSize)}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1.5 flex items-center gap-1.5">
            <FileVideo className="w-3.5 h-3.5 text-zinc-500" />
            <span>변환 전 원본</span>
          </div>
        </div>

        {/* Result Size Card */}
        <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-700">
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
            최종 파일 크기
          </span>
          <div className="text-xl font-bold font-mono text-zinc-100">
            {formatBytes(result.size)}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1.5 flex items-center gap-1.5">
            <Maximize className="w-3.5 h-3.5 text-zinc-400" />
            <span className="font-mono">{result.width} × {result.height} ({result.format.toUpperCase()})</span>
          </div>
        </div>

        {/* Savings Card */}
        <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800">
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
            {isReduced ? '용량 절감율' : '용량 변화'}
          </span>
          <div className="flex items-center gap-2">
            <div className={`text-xl font-bold font-mono ${
              isReduced ? 'text-emerald-400' : 'text-zinc-300'
            }`}>
              {isReduced ? `-${result.savingsPercent}%` : `+${formatBytes(sizeDiff)}`}
            </div>
            {isReduced ? (
              <TrendingDown className="w-4 h-4 text-emerald-400" />
            ) : (
              <TrendingUp className="w-4 h-4 text-zinc-400" />
            )}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1.5 font-mono">
            {isReduced ? (
              <span>{formatBytes(sizeDiff)} 절약</span>
            ) : (
              <span>고화질/확대 모드</span>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={onReEdit}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 flex items-center justify-center gap-1.5 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>재편집</span>
          </button>

          <button
            type="button"
            onClick={onNewVideo}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 flex items-center justify-center gap-1.5 transition"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>새 동영상</span>
          </button>
        </div>

        {/* Download Buttons Group */}
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          {result.format !== 'mp4' && (
            <button
              type="button"
              disabled={isConvertingMp4}
              onClick={handleDownloadMp4}
              className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs border border-zinc-700 transition flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isConvertingMp4 ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>MP4 변환 중...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-3.5 h-3.5 text-amber-400" />
                  <span>MP4로 변환 다운로드</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={handleDownload}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-900 font-semibold text-xs transition shadow-sm flex items-center justify-center gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            <span>
              {result.fileName.endsWith('.mp4') ? 'MP4 다운로드' : '결과 파일 다운로드'} ({formatBytes(result.size)})
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
