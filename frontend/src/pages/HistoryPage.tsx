import { useEffect, useState } from "react";
import { DetectionApi, FeedbackApi } from "@/services/api";
import type { Prediction } from "@/types";
import { useLang } from "@/context/LanguageContext";
import {
  History, RefreshCw, ChevronLeft, ChevronRight,
  MessageSquareWarning, CheckCircle, X, Send,
} from "lucide-react";
import { mockPredictions } from "@/data/mockData";

interface FeedbackState {
  predictionId: number;
  predictedLabel: string;
  correctLabel: string;
  comment: string;
  submitting: boolean;
  submitted: boolean;
  error: string | null;
}

export default function HistoryPage() {
  const { t } = useLang();
  const [rows, setRows] = useState<Prediction[]>([]);
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [submittedIds, setSubmittedIds] = useState<Set<number>>(new Set());
  const limit = 10;

  const load = async () => {
    setBusy(true);
    try {
      const res = await DetectionApi.history({ page, limit, source_type: type || undefined });
      const items = (res as any).items || [];
      const totalCount = (res as any).total || 0;

      if (items.length === 0 && page === 1) {
        setRows(mockPredictions);
        setTotal(mockPredictions.length);
      } else {
        const formatted: Prediction[] = items.map((it: any) => ({
          id: it.id,
          source_type: it.source_type,
          detected_name: it.sign_name,
          confidence: it.confidence,
          created_at: it.created_at,
        }));
        setRows(formatted);
        setTotal(totalCount);
      }
    } catch (err) {
      console.error("Failed to load prediction history", err);
      setRows(mockPredictions);
      setTotal(mockPredictions.length);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { load(); }, [type, page]);

  const openFeedback = (row: Prediction) => {
    setFeedback({
      predictionId: row.id,
      predictedLabel: row.detected_name || "",
      correctLabel: "",
      comment: "",
      submitting: false,
      submitted: false,
      error: null,
    });
  };

  const submitFeedback = async () => {
    if (!feedback || !feedback.correctLabel.trim()) return;
    setFeedback(f => f ? { ...f, submitting: true, error: null } : f);
    try {
      await FeedbackApi.submit({
        prediction_id: feedback.predictionId,
        predicted_label: feedback.predictedLabel,
        correct_label: feedback.correctLabel.trim(),
        comment: feedback.comment.trim() || undefined,
      });
      setFeedback(f => f ? { ...f, submitting: false, submitted: true } : f);
      setSubmittedIds(prev => new Set([...prev, feedback.predictionId]));
      setTimeout(() => setFeedback(null), 2000);
    } catch (err: any) {
      setFeedback(f => f ? { ...f, submitting: false, error: err.message || "Submission failed. Please try again." } : f);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-bold font-display flex items-center gap-2">
          <History className="text-signal" />
          <span>{t("history")}</span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          {t("historyDesc")}
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          className="input max-w-[160px] text-xs py-2"
          value={type}
          onChange={(e) => { setType(e.target.value); setPage(1); }}
        >
          <option value="">{t("allSources")}</option>
          <option value="image">{t("imageUpload")}</option>
          <option value="video">{t("videoUpload")}</option>
          <option value="webcam">{t("liveCamera")}</option>
        </select>

        <button className="btn-ghost flex items-center gap-1.5 py-2 text-xs font-semibold" onClick={load} disabled={busy}>
          <RefreshCw size={12} className={busy ? "animate-spin" : ""} /> {t("refresh")}
        </button>

        <p className="text-xs text-slate-400 ml-auto hidden sm:block">
          {t("clickPrefix")} <MessageSquareWarning size={12} className="inline mx-1 text-signal" /> {t("clickReportSuffix")}
        </p>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500 bg-slate-50 dark:bg-asphalt-800/60 text-xs border-b border-slate-200 dark:border-asphalt-700">
            <tr>
              <th className="p-4 font-semibold uppercase tracking-wider">{t("colId")}</th>
              <th className="p-4 font-semibold uppercase tracking-wider">{t("colDetectedSign")}</th>
              <th className="p-4 font-semibold uppercase tracking-wider">{t("colConfidence")}</th>
              <th className="p-4 font-semibold uppercase tracking-wider">{t("colSource")}</th>
              <th className="p-4 font-semibold uppercase tracking-wider">{t("colDateTime")}</th>
              <th className="p-4 font-semibold uppercase tracking-wider text-center">{t("colFeedback")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-asphalt-700">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-asphalt-750/30 transition duration-150">
                <td className="p-4 font-mono text-xs text-slate-400">#{r.id}</td>
                <td className="p-4 font-bold text-slate-800 dark:text-slate-100">{r.detected_name || t("unknownSign")}</td>
                <td className="p-4">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    r.confidence && r.confidence > 0.8 ? "bg-go/10 text-go" : "bg-signal/10 text-signal"
                  }`}>
                    {r.confidence != null ? `${(r.confidence * 100).toFixed(1)}%` : "—"}
                  </span>
                </td>
                <td className="p-4 text-xs text-slate-600 dark:text-slate-350 capitalize">{r.source_type}</td>
                <td className="p-4 text-xs text-slate-500">{new Date(r.created_at).toLocaleString()}</td>
                <td className="p-4 text-center">
                  {submittedIds.has(r.id) ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-go font-semibold">
                      <CheckCircle size={12} /> {t("reported")}
                    </span>
                  ) : (
                    <button
                      onClick={() => openFeedback(r)}
                      className="inline-flex items-center gap-1 text-[10px] text-signal hover:text-signal/70 font-semibold transition"
                      title={t("wrongReport")}
                    >
                      <MessageSquareWarning size={14} /> {t("report")}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500 text-xs">
                  {t("noRecords")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="flex justify-between items-center text-xs text-slate-500 pt-2 px-1">
          <span>{t("showing")} {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} {t("of")} {total}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost p-1.5 rounded-lg disabled:opacity-40">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => setPage(p => p * limit < total ? p + 1 : p)} disabled={page * limit >= total} className="btn-ghost p-1.5 rounded-lg disabled:opacity-40">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Feedback modal overlay */}
      {feedback && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-asphalt-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5 border border-slate-200 dark:border-asphalt-700">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg font-display flex items-center gap-2">
                <MessageSquareWarning size={18} className="text-signal" />
                {t("reportWrongTitle")}
              </h3>
              <button onClick={() => setFeedback(null)} className="btn-ghost p-1.5 rounded-lg">
                <X size={16} />
              </button>
            </div>

            {feedback.submitted ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <CheckCircle size={40} className="text-go" />
                <p className="font-bold text-go">{t("thankYouFeedback")}</p>
                <p className="text-xs text-slate-400">{t("feedbackHelps")}</p>
              </div>
            ) : (
              <>
                {/* Predicted label (read-only) */}
                <div className="space-y-1.5">
                  <label className="label">{t("systemPredicted")}</label>
                  <div className="input bg-slate-50 dark:bg-asphalt-700 text-sm font-medium text-slate-600 dark:text-slate-300 cursor-not-allowed">
                    {feedback.predictedLabel || t("unknownSign")}
                  </div>
                </div>

                {/* Correct label */}
                <div className="space-y-1.5">
                  <label className="label">{t("correctSignName")} <span className="text-alert">*</span></label>
                  <input
                    type="text"
                    className="input text-sm"
                    placeholder={t("correctSignPlaceholder")}
                    value={feedback.correctLabel}
                    onChange={e => setFeedback(f => f ? { ...f, correctLabel: e.target.value } : f)}
                  />
                </div>

                {/* Comment */}
                <div className="space-y-1.5">
                  <label className="label">{t("additionalComment")} <span className="text-slate-400">{t("optional")}</span></label>
                  <textarea
                    className="input text-sm resize-none h-20"
                    placeholder={t("commentPlaceholder")}
                    value={feedback.comment}
                    onChange={e => setFeedback(f => f ? { ...f, comment: e.target.value } : f)}
                  />
                </div>

                {/* Error */}
                {feedback.error && (
                  <p className="text-xs text-alert font-medium">{feedback.error}</p>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <button className="btn-ghost flex-1 py-2 text-sm" onClick={() => setFeedback(null)}>
                    {t("cancel")}
                  </button>
                  <button
                    className="btn-primary flex-1 py-2 text-sm flex items-center justify-center gap-2"
                    onClick={submitFeedback}
                    disabled={feedback.submitting || !feedback.correctLabel.trim()}
                  >
                    {feedback.submitting ? (
                      <><div className="animate-spin h-4 w-4 border-b-2 border-white rounded-full" /> {t("submitting")}</>
                    ) : (
                      <><Send size={14} /> {t("submitFeedback")}</>
                    )}
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
