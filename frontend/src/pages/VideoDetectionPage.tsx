import { useState } from "react";
import client from "@/services/api";
import { useLang } from "@/context/LanguageContext";
import { useSpeech } from "@/hooks/useSpeech";
import { Play, Sparkles, CheckCircle, RotateCcw } from "lucide-react";
import UploadBox from "@/components/detection/UploadBox";
import DetectionResultCard from "@/components/detection/DetectionResultCard";
import type { Detection } from "@/types";

export default function VideoDetectionPage() {
  const { t, lang } = useLang();
  const { speak } = useSpeech(lang);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [result, setResult] = useState<{
    demo_mode?: boolean;
    engine?: string;
    detections: Detection[];
  } | null>(null);

  const runFile = (selectedFile: File) => {
    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setResult(null);
  };

  const uploadVideo = async () => {
    if (!file) return;
    setBusy(true);
    setProgress(10);
    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await client.post("/predict/video", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const pct = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 100));
          setProgress(Math.max(10, Math.min(pct, 90)));
        },
      });
      setResult(res as any);
      setProgress(100);
    } catch (err: any) {
      console.error(err);
      setResult({ detections: [], engine: undefined, error: err.message || "Failed to process video." } as any);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview("");
    setResult(null);
    setProgress(0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display">{t("videoDetection")}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Upload dashcam or roadside video footage to run AI-powered sign detection.
          </p>
        </div>
        {preview && (
          <button className="btn-ghost text-slate-500 flex items-center gap-2" onClick={reset}>
            <RotateCcw size={16} /> Reset
          </button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column */}
        <div className="lg:col-span-7 space-y-4">
          {!preview ? (
            <UploadBox
              onFileSelected={runFile}
              accept="video/*"
              label={t("dragDrop")}
              sublabel="Supports MP4, AVI, MOV, WEBM up to 50MB"
            />
          ) : (
            <div className="card overflow-hidden p-0 bg-slate-950">
              <video src={preview} controls className="w-full max-h-[450px]" />
              <div className="p-4 bg-white dark:bg-asphalt-800 border-t border-slate-200 dark:border-asphalt-700 flex justify-between items-center text-xs text-slate-500">
                <span>File: {file?.name}</span>
                <span>Size: {file ? (file.size / (1024 * 1024)).toFixed(2) : 0} MB</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="lg:col-span-5 space-y-4">
          <h2 className="text-xl font-bold font-display tracking-tight">Detection Results</h2>

          {preview && !result && !busy && (
            <div className="card space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Click upload to send the video to the AI pipeline. Signs are sampled every 15 frames for optimal processing speed.
              </p>
              <button className="btn-primary w-full flex items-center justify-center gap-2" onClick={uploadVideo}>
                <Play size={16} /> {t("uploadVideo")}
              </button>
            </div>
          )}

          {busy && (
            <div className="card p-6 space-y-4 text-center">
              <div className="flex justify-between text-sm font-semibold mb-1">
                <span>Processing video...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-asphalt-700 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-signal h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-slate-500">
                Analyzing frames for traffic signs. Please wait...
              </p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              {/* Success header */}
              <div className="card border-go/40 bg-go/5 flex gap-3 p-4 items-start">
                <CheckCircle className="text-go shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                    Video Analyzed Successfully
                  </h3>
                  {result.engine && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      Engine: <span className="font-semibold text-go">{result.engine}</span>
                    </p>
                  )}
                </div>
              </div>

              {result.detections.length === 0 && (
                <div className="card text-center p-6 text-slate-500 text-sm">
                  No traffic signs detected in this video.
                </div>
              )}

              {result.detections.map((d, i) => (
                <DetectionResultCard
                  key={i}
                  label={d.label}
                  category={d.category}
                  confidence={d.confidence}
                  meaning={d.meaning}
                  isHovered={false}
                  onMouseEnter={() => {}}
                  onMouseLeave={() => {}}
                  onSpeak={() => speak(`${d.label}. Meaning: ${d.meaning || ""}`)}
                  onReportWrong={() => {}}
                />
              ))}

              <button className="btn-ghost w-full" onClick={reset}>
                Upload Another Video
              </button>
            </div>
          )}

          {!preview && (
            <div className="card p-5 border-l-4 border-l-signal/60 bg-signal/5">
              <div className="flex gap-2">
                <Sparkles size={16} className="text-signal shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  <strong>Real-time detection:</strong> For live detection while driving, use the <strong>Live Camera</strong> page instead.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
