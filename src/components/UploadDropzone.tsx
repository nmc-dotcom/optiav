import React, { useState, useRef } from 'react';
import { Upload, ShieldCheck, AlertCircle, Check } from 'lucide-react';

interface UploadDropzoneProps {
  onFileSelect: (file: File) => void;
}

export function UploadDropzone({
  onFileSelect,
}: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const validateAndProcess = (file: File) => {
    setErrorMsg(null);
    const validExtensions = ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.m4v', '.ogv', '.ts'];
    const fileName = file.name.toLowerCase();
    const isValidExt = validExtensions.some((ext) => fileName.endsWith(ext));
    const isVideoMime = file.type.startsWith('video/') || isValidExt;

    if (!isVideoMime) {
      setErrorMsg('동영상 파일(MP4, MOV, WebM, AVI, MKV 등)만 업로드할 수 있습니다.');
      return;
    }

    onFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndProcess(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndProcess(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto my-6 px-4">
      {/* Privacy Guarantee Alert */}
      <div className="mb-4 p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-start gap-3 text-zinc-300">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs">
          <p className="font-semibold text-zinc-200">
            비공개 로컬 샌드박스 인코딩
          </p>
          <p className="text-zinc-400 mt-0.5 leading-relaxed">
            영상이 외부 서버로 전송되지 않으며, 사용자 컴퓨터의 브라우저 WASM 및 GPU 메모리 내에서 100% 로컬로 처리됩니다.
          </p>
        </div>
      </div>

      {/* Main Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-150 ${
          isDragging
            ? 'border-zinc-400 bg-zinc-800/80 scale-[1.005]'
            : 'border-zinc-700/80 hover:border-zinc-500 bg-zinc-900/60 hover:bg-zinc-900'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,.mp4,.mov,.webm,.avi,.mkv,.m4v"
          onChange={handleFileInput}
          className="hidden"
        />

        <div className="flex flex-col items-center">
          <div className="w-14 h-14 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 mb-4 shadow-sm">
            <Upload className="w-6 h-6" />
          </div>

          <h2 className="text-base font-semibold text-zinc-100 mb-1">
            동영상 파일을 이곳에 드래그하거나 클릭하여 열기
          </h2>
          <p className="text-xs text-zinc-400 mb-5 max-w-md">
            MP4, MOV, WebM, AVI, MKV 등 모든 규격의 비디오 파일 지원
          </p>

          {/* Supported format tags */}
          <div className="flex flex-wrap justify-center gap-1.5 mb-6">
            {['MP4 (H.264)', 'MOV (ProRes/H.264)', 'WebM (VP9)', 'MKV', 'AVI', 'GIF 래스터'].map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-[11px] font-mono rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Action button */}
          <button
            type="button"
            className="px-4 py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-900 font-medium text-xs shadow-sm transition pointer-events-none"
          >
            파일 탐색기 열기
          </button>
        </div>
      </div>

      {/* Error message if invalid file */}
      {errorMsg && (
        <div className="mt-3 p-3 rounded-lg bg-zinc-900 border border-red-800/80 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Feature Specs */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center gap-1.5 text-zinc-200 mb-1 font-semibold text-xs">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>프레임 단위 자르기 & 크롭</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            마이크로초 및 프레임 정밀도의 트리밍 및 비율 맞춤 프리셋 크롭
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center gap-1.5 text-zinc-200 mb-1 font-semibold text-xs">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>정밀 비트레이트 (VBR/CBR)</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            x264 High Profile CABAC 인코딩으로 지정 비트레이트 완벽 준수
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center gap-1.5 text-zinc-200 mb-1 font-semibold text-xs">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>다중 포맷 출력</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            H.264 MP4, VP9 WebM, 팔레트 최적화 고해상도 GIF 변환
          </p>
        </div>
      </div>
    </div>
  );
}
