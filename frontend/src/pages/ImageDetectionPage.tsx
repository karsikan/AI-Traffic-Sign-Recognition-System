import { useState } from "react";
import { DetectionApi, FeedbackApi } from "@/services/api";
import type { DetectionResult } from "@/types";
import { useLang } from "@/context/LanguageContext";
import { AlertTriangle, RotateCcw, XCircle, Send, X } from "lucide-react";
import { useSpeech } from "@/hooks/useSpeech";
import UploadBox from "@/components/detection/UploadBox";
import BoundingBoxPreview from "@/components/detection/BoundingBoxPreview";
import DetectionResultCard from "@/components/detection/DetectionResultCard";
import SignPriorityAlert from "@/components/detection/SignPriorityAlert";

interface FeedbackModal {
  label: string;
  correctLabel: string;
  submitting: boolean;
  done: boolean;
}

export default function ImageDetectionPage() {
  const { t, lang } = useLang();
  const { speak } = useSpeech(lang);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [fbModal, setFbModal] = useState<FeedbackModal | null>(null);

  const runFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setResult(null);
    setError(null);
    setBusy(true);
    try {
      const res = await DetectionApi.image(selectedFile);
      setResult(res);
      // Auto-speak critical sign if found
      if (res.detections?.length) {
        const top = res.detections[0];
        speak(`Detected: ${top.label}. ${top.meaning || ""}`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to analyze image. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const openFeedback = (label: string) => {
    setFbModal({ label, correctLabel: "", submitting: false, done: false });
  };

  const submitFeedback = async () => {
    if (!fbModal || !result?.prediction_id || !fbModal.correctLabel.trim()) return;
    setFbModal(f => f ? { ...f, submitting: true } : f);
    try {
      await FeedbackApi.submit({
        prediction_id: result.prediction_id,
        predicted_label: fbModal.label,
        correct_label: fbModal.correctLabel.trim(),
      });
      setFbModal(f => f ? { ...f, submitting: false, done: true } : f);
      setFeedbackMsg(t("feedbackSavedThanks"));
      setTimeout(() => { setFeedbackMsg(null); setFbModal(null); }, 2000);
    } catch {
      setFbModal(f => f ? { ...f, submitting: false } : f);
      setFeedbackMsg("Failed to save feedback.");
      setTimeout(() => setFeedbackMsg(null), 3000);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview("");
    setResult(null);
    setError(null);
    setFeedbackMsg(null);
    setFbModal(null);
  };

  const detectedLabels = result?.detections?.map(d => d.label) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display">{t("imageDetection")}</h1>
        </div>
        {preview && (
          <button className="btn-ghost text-slate-500 flex items-center gap-2" onClick={reset}>
            <RotateCcw size={16} /> {t("resetBtn")}
          </button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Upload / Preview */}
        <div className="lg:col-span-7 space-y-4">
          {!preview ? (
            <UploadBox
              onFileSelected={runFile}
              accept="image/*"
              label={t("dragDrop")}
              sublabel={t("supportsFormat")}
            />
          ) : (
            <BoundingBoxPreview
              imageSrc={preview}
              detections={result?.detections || []}
              hoveredIdx={hoveredIdx}
              setHoveredIdx={setHoveredIdx}
              fileName={file?.name}
              fileSizeKB={file ? file.size / 1024 : undefined}
            />
          )}
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-5 space-y-4">
          <h2 className="text-xl font-bold font-display tracking-tight">{t("analysisResults")}</h2>

          {/* Feedback toast */}
          {feedbackMsg && (
            <div className="card border-go/30 bg-go/5 text-go text-sm font-medium py-2 px-4 text-center">
              {feedbackMsg}
            </div>
          )}

          {/* Error state */}
          {!busy && error && (
            <div className="card border-alert/30 bg-alert/5 flex items-start gap-3 p-4">
              <XCircle className="text-alert shrink-0 mt-0.5" size={18} />
              <div>
                <p className="font-semibold text-alert text-sm">{t("detectionFailed")}</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{error}</p>
                <p className="text-xs text-slate-500 mt-1">{t("tryClearerImage")}</p>
              </div>
            </div>
          )}

          {busy && (
            <div className="card flex flex-col items-center justify-center p-8 space-y-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-signal"></div>
              <p className="text-slate-600 dark:text-slate-300 font-medium">{t("detecting")}</p>
            </div>
          )}

          {!busy && !result && !preview && (
            <div className="card text-center p-8 text-slate-500 text-sm">
              {t("uploadToStart")}
            </div>
          )}

          {!busy && result && (
            <div className="space-y-4">
              {/* Priority Alert + Safety Tips — Feature #6 & #7 */}
              <SignPriorityAlert
                labels={detectedLabels}
                onSpeak={speak}
              />

              {/* Demo Mode warning */}
              {result.demo_mode && (
                <div className="card flex gap-3 border-signal/40 bg-signal/5">
                  <AlertTriangle className="text-signal shrink-0" />
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {result.detections[0]?.label || "Add a GEMINI_API_KEY for instant AI recognition."}
                  </p>
                </div>
              )}

              {/* Which model actually answered. The pipeline has three routes — detector
                  plus classifier, classifier alone on an already-cropped sign, or Gemini
                  Vision — and the answer means different things depending on which ran. */}
              {!result.demo_mode && result.engine && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
                  Answered by <span className="font-semibold text-go">{result.engine}</span>
                </p>
              )}

              {!result.demo_mode && result.detections.length === 0 && (
                <div className="card text-center p-6 text-slate-500 text-sm">
                  {t("noSignsDetected")}
                </div>
              )}

              {!result.demo_mode &&
                result.detections.map((d, i) => (
                  <DetectionResultCard
                    key={i}
                    label={d.label}
                    category={d.category}
                    confidence={d.confidence}
                    meaning={d.meaning}
                    isHovered={hoveredIdx === i}
                    onMouseEnter={() => setHoveredIdx(i)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    onSpeak={() => speak(`${d.label}. Meaning: ${d.meaning || ""}`)}
                    onReportWrong={() => openFeedback(d.label)}
                  />
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Inline Feedback Modal */}
      {fbModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-asphalt-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 border border-slate-200 dark:border-asphalt-700">
            <div className="flex items-center justify-between">
              <h3 className="font-bold font-display">{t("reportWrongTitle")}</h3>
              <button onClick={() => setFbModal(null)} className="btn-ghost p-1.5 rounded-lg"><X size={16} /></button>
            </div>

            {fbModal.done ? (
              <p className="text-go font-semibold text-center py-4">{t("thankYouSaved")}</p>
            ) : (
              <>
                <div className="space-y-1">
                  <label className="label">{t("systemPredicted")}</label>
                  <div className="input bg-slate-50 dark:bg-asphalt-700 text-sm text-slate-500 cursor-not-allowed">{fbModal.label}</div>
                </div>
                <div className="space-y-1">
                  <label className="label">{t("correctSignName")} <span className="text-alert">*</span></label>
                  <input className="input text-sm" placeholder={t("correctSignPlaceholder")} value={fbModal.correctLabel}
                    onChange={e => setFbModal(f => f ? { ...f, correctLabel: e.target.value } : f)} />
                </div>
                <div className="flex gap-3">
                  <button className="btn-ghost flex-1 py-2 text-sm" onClick={() => setFbModal(null)}>{t("cancel")}</button>
                  <button className="btn-primary flex-1 py-2 text-sm flex items-center justify-center gap-2"
                    onClick={submitFeedback} disabled={fbModal.submitting || !fbModal.correctLabel.trim()}>
                    {fbModal.submitting
                      ? <><div className="animate-spin h-3 w-3 border-b-2 border-white rounded-full" /> {t("saving")}</>
                      : <><Send size={13} /> {t("submit")}</>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
