import { useEffect, useState } from "react";
import { ModelApi } from "@/services/api";
import { Brain, Database, BarChart3, TrendingUp, Cpu, Layers, FlaskConical } from "lucide-react";
import ModelComparison from "@/components/model/ModelComparison";

function MetricBadge({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card text-center p-4 space-y-1">
      <div className="text-2xl font-bold text-signal font-display">{value}</div>
      <div className="text-xs font-bold text-slate-700 dark:text-slate-200">{label}</div>
      {sub && <div className="text-[10px] text-slate-400">{sub}</div>}
    </div>
  );
}

// Tiny SVG line chart for training curves
function TrainingChart({ history }: { history: any[] }) {
  const W = 520, H = 140, PAD = 30;
  const epochs = history.map(h => h.epoch);
  const trainAcc = history.map(h => h.train_acc);
  const valAcc = history.map(h => h.val_acc);
  const trainLoss = history.map(h => h.train_loss);
  const valLoss = history.map(h => h.val_loss);

  const maxAcc = 100, minAcc = 40;
  const maxLoss = 2.0, minLoss = 0;
  const n = epochs.length;

  const xScale = (i: number) => PAD + (i / (n - 1)) * (W - PAD * 2);
  const yScaleAcc = (v: number) => H - PAD - ((v - minAcc) / (maxAcc - minAcc)) * (H - PAD * 2);
  const yScaleLoss = (v: number) => H - PAD - ((v - minLoss) / (maxLoss - minLoss)) * (H - PAD * 2);

  const polyline = (vals: number[], scale: (v: number) => number) =>
    vals.map((v, i) => `${xScale(i)},${scale(v)}`).join(" ");

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Accuracy chart */}
      <div className="card p-3 space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Accuracy (%) per Epoch</h4>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
          {/* Grid lines */}
          {[50, 60, 70, 80, 90, 100].map(v => (
            <g key={v}>
              <line x1={PAD} y1={yScaleAcc(v)} x2={W - PAD} y2={yScaleAcc(v)} stroke="currentColor" strokeOpacity="0.1" strokeWidth="1" />
              <text x={PAD - 4} y={yScaleAcc(v) + 3} fontSize="9" textAnchor="end" fill="currentColor" fillOpacity="0.4">{v}</text>
            </g>
          ))}
          {/* Epoch labels */}
          {history.map((h, i) => (
            <text key={i} x={xScale(i)} y={H - 4} fontSize="9" textAnchor="middle" fill="currentColor" fillOpacity="0.4">{h.epoch}</text>
          ))}
          <polyline points={polyline(trainAcc, yScaleAcc)} fill="none" stroke="#f5a623" strokeWidth="2.5" strokeLinejoin="round" />
          <polyline points={polyline(valAcc, yScaleAcc)} fill="none" stroke="#22c55e" strokeWidth="2.5" strokeDasharray="5,3" strokeLinejoin="round" />
        </svg>
        <div className="flex gap-4 text-[10px]">
          <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 bg-signal" /> Train Acc</span>
          <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 bg-go" style={{ borderTop: "2px dashed" }} /> Val Acc</span>
        </div>
      </div>

      {/* Loss chart */}
      <div className="card p-3 space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Loss per Epoch</h4>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
          {[0, 0.5, 1.0, 1.5, 2.0].map(v => (
            <g key={v}>
              <line x1={PAD} y1={yScaleLoss(v)} x2={W - PAD} y2={yScaleLoss(v)} stroke="currentColor" strokeOpacity="0.1" strokeWidth="1" />
              <text x={PAD - 4} y={yScaleLoss(v) + 3} fontSize="9" textAnchor="end" fill="currentColor" fillOpacity="0.4">{v}</text>
            </g>
          ))}
          {history.map((h, i) => (
            <text key={i} x={xScale(i)} y={H - 4} fontSize="9" textAnchor="middle" fill="currentColor" fillOpacity="0.4">{h.epoch}</text>
          ))}
          <polyline points={polyline(trainLoss, yScaleLoss)} fill="none" stroke="#f5a623" strokeWidth="2.5" strokeLinejoin="round" />
          <polyline points={polyline(valLoss, yScaleLoss)} fill="none" stroke="#22c55e" strokeWidth="2.5" strokeDasharray="5,3" strokeLinejoin="round" />
        </svg>
        <div className="flex gap-4 text-[10px]">
          <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 bg-signal" /> Train Loss</span>
          <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 bg-go" /> Val Loss</span>
        </div>
      </div>
    </div>
  );
}

// Horizontal bar chart for class accuracy
function ClassAccuracyChart({ classes }: { classes: any[] }) {
  return (
    <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
      {classes.map((c) => (
        <div key={c.id} className="flex items-center gap-2 text-xs">
          <span className="w-44 text-slate-600 dark:text-slate-300 truncate shrink-0">{c.name}</span>
          <div className="flex-1 bg-slate-100 dark:bg-asphalt-700 rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all ${c.accuracy >= 97 ? "bg-go" : c.accuracy >= 93 ? "bg-signal" : "bg-alert/70"}`}
              style={{ width: `${c.accuracy}%` }}
            />
          </div>
          <span className={`w-10 text-right font-semibold shrink-0 ${c.accuracy >= 97 ? "text-go" : c.accuracy >= 93 ? "text-signal" : "text-alert"}`}>
            {c.accuracy}%
          </span>
        </div>
      ))}
    </div>
  );
}

export default function ModelPage() {
  const [data, setData] = useState<any>(null);
  const [datasetInfo, setDatasetInfo] = useState<any>(null);
  const [busy, setBusy] = useState(true);
  const [tab, setTab] = useState<"resnet50" | "yolov8" | "dataset">("resnet50");

  useEffect(() => {
    Promise.all([ModelApi.metrics(), ModelApi.dataset()])
      .then(([metrics, ds]) => { setData(metrics); setDatasetInfo(ds); })
      .catch(console.error)
      .finally(() => setBusy(false));
  }, []);

  if (busy) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="animate-spin h-10 w-10 rounded-full border-b-2 border-signal" />
        <p className="text-slate-500 text-sm">Loading model performance data...</p>
      </div>
    );
  }

  const r = data?.resnet50;
  const y = data?.yolov8;

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold font-display flex items-center gap-2">
          <Brain className="text-signal" size={28} />
          AI Model Performance & Training
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Training metrics, per-class accuracy, dataset statistics, and model architecture details for ResNet50 and YOLOv8.
        </p>
      </div>

      {/* Side-by-side comparison and a latency benchmark measured on this machine */}
      <ModelComparison />

      {/* Tab selector */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-asphalt-700">
        {[
          { key: "resnet50", icon: Layers, label: "ResNet50 Classifier" },
          { key: "yolov8",   icon: Cpu,    label: "YOLOv8 Detector" },
          { key: "dataset",  icon: Database, label: "Datasets & Preprocessing" },
        ].map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setTab(key as any)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              tab === key
                ? "border-signal text-signal"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* ── ResNet50 Tab ── */}
      {tab === "resnet50" && r && (
        <div className="space-y-6">
          {/* Summary metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricBadge
              label="Test Accuracy"
              value={r.measured ? `${r.test_acc}%` : "Not measured"}
              sub={r.measured ? `${(12630).toLocaleString()} test images` : "run measure_resnet"}
            />
            <MetricBadge label="Best Val Acc" value={`${r.best_val_acc}%`} sub={`epoch ${r.epochs_completed}`} />
            <MetricBadge label="Classes" value={r.num_classes} sub="43 sign types" />
            <MetricBadge label="Training Images" value={r.train_images.toLocaleString()} sub="GTSRB dataset" />
          </div>

          {/* Where the accuracy number comes from — the page used to carry a figure
              from a different training run than the weights the backend loads. */}
          {r.accuracy_note && (
            <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              {r.accuracy_note}
              {r.measured_at && <> Measured {r.measured_at} on {r.measured_on}.</>}
            </p>
          )}

          {/* Architecture info */}
          <div className="card space-y-3">
            <h3 className="font-bold font-display flex items-center gap-2"><Layers size={16} className="text-signal" /> Model Architecture</h3>
            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              {[
                ["Base Model",    r.architecture],
                ["Input Size",    r.input_size],
                ["Epochs",        `${r.epochs_completed} completed of ${r.epochs_configured} configured`],
                ["Batch Size",    r.batch_size],
                ["Optimizer",     r.optimizer],
                ["LR Scheduler",  r.scheduler],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-slate-50 dark:border-asphalt-700 pb-1">
                  <span className="text-slate-500">{k}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100 text-right max-w-[60%]">{v}</span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1.5">Data Augmentation</p>
              <div className="flex flex-wrap gap-2">
                {r.augmentation.map((a: string) => (
                  <span key={a} className="bg-signal/10 text-signal text-[10px] font-semibold px-2 py-1 rounded-full">{a}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Training curves — one epoch completed, so this is a point, not a curve.
              Shown anyway because it is what the training log records. */}
          <div className="space-y-3">
            <h3 className="font-bold font-display flex items-center gap-2"><TrendingUp size={16} className="text-signal" /> Training Curves</h3>
            {r.training_note && (
              <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{r.training_note}</p>
            )}
            {r.training_history.length > 1
              ? <TrainingChart history={r.training_history} />
              : <p className="text-xs text-slate-500">
                  Only one epoch completed, so there is no curve to plot — the figures are in the table below.
                </p>}
          </div>

          {/* Per-epoch table */}
          <div className="card p-0 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-asphalt-800 text-slate-500 uppercase tracking-wider">
                <tr>
                  {["Epoch", "Train Loss", "Val Loss", "Train Acc", "Val Acc"].map(h => (
                    <th key={h} className="p-3 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-asphalt-700">
                {r.training_history.map((row: any) => (
                  <tr key={row.epoch} className="hover:bg-slate-50/50 dark:hover:bg-asphalt-750/20">
                    <td className="p-3 font-mono font-bold text-signal">{row.epoch}</td>
                    <td className="p-3 font-mono">{row.train_loss.toFixed(4)}</td>
                    <td className="p-3 font-mono">{row.val_loss.toFixed(4)}</td>
                    <td className="p-3">
                      <span className="text-signal font-semibold">{row.train_acc.toFixed(2)}%</span>
                    </td>
                    <td className="p-3">
                      <span className={`font-semibold ${row.val_acc >= 96 ? "text-go" : "text-signal"}`}>{row.val_acc.toFixed(2)}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Per-class accuracy */}
          <div className="space-y-3">
            <h3 className="font-bold font-display flex items-center gap-2"><BarChart3 size={16} className="text-signal" /> Per-Class Test Accuracy (43 GTSRB Classes)</h3>
            <div className="card">
              {r.class_accuracy?.length
                ? <ClassAccuracyChart classes={r.class_accuracy} />
                : <p className="text-xs text-slate-500">
                    Per-class figures appear once the weights have been measured on the test set.
                  </p>}
            </div>
          </div>
        </div>
      )}

      {/* ── YOLOv8 Tab ── */}
      {tab === "yolov8" && y && (
        <div className="space-y-6">
          {/* The validation set behind these numbers is two images. Say so before
              showing them, not in a footnote underneath. */}
          <div className="card border-l-4 border-caution space-y-1">
            <h3 className="font-bold font-display text-sm flex items-center gap-2">
              <Cpu size={15} className="text-caution" /> Read these numbers with care
            </h3>
            <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">{y.validation.caveat}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricBadge label="mAP@50"    value={`${(y.validation.mAP50 * 100).toFixed(1)}%`}    sub={`${y.validation.val_images} val images`} />
            <MetricBadge label="mAP@50:95" value={`${(y.validation.mAP50_95 * 100).toFixed(1)}%`} sub="stricter IoU" />
            <MetricBadge label="Precision" value={`${(y.validation.precision * 100).toFixed(1)}%`} sub="positive predictive" />
            <MetricBadge label="Recall"    value={`${(y.validation.recall * 100).toFixed(1)}%`}    sub="sensitivity" />
          </div>

          {/* Per-category detection scores, once a run big enough to have them exists */}
          {y.validation.per_class?.length > 0 && (
            <div className="card space-y-2">
              <h3 className="font-bold font-display text-sm">Per-category detection</h3>
              <div className="grid sm:grid-cols-2 gap-2 text-xs">
                {y.validation.per_class.map((c: any) => (
                  <div key={c.name} className="flex justify-between border-b border-slate-50 dark:border-asphalt-700 pb-1">
                    <span className="text-slate-500 capitalize">{c.name}</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                      mAP@50 {(c.mAP50 * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card space-y-3">
            <h3 className="font-bold font-display flex items-center gap-2"><Cpu size={16} className="text-signal" /> Model Architecture</h3>
            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              {[
                ["Architecture",       y.architecture],
                ["Task",               y.task],
                ["Input Size",         y.input_size],
                ["Detection classes",  `${y.num_classes} — ${y.class_names.join(", ")}`],
                ["Validation set",     `${y.validation.val_images} images, ${y.validation.val_instances} instances`],
                ["Epochs",             y.epochs],
                ["Batch Size",         y.batch_size],
                ["Fine-tuned at",      y.train_input_size],
                ["Trained on",         y.trained_on],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-slate-50 dark:border-asphalt-700 pb-1">
                  <span className="text-slate-500">{k}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100 text-right max-w-[60%]">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Metric bars */}
          <div className="card space-y-4">
            <h3 className="font-bold font-display">Detection Metrics Visualised</h3>
            <p className="text-[11px] text-slate-500">
              From {y.validation.val_images} validation images — see the note above.
            </p>
            {[
              { label: "mAP@50",       val: y.validation.mAP50,     color: "bg-signal" },
              { label: "mAP@50:95",    val: y.validation.mAP50_95,  color: "bg-go" },
              { label: "Precision",    val: y.validation.precision, color: "bg-blue-500" },
              { label: "Recall",       val: y.validation.recall,    color: "bg-purple-500" },
            ].map(({ label, val, color }) => (
              <div key={label} className="flex items-center gap-3 text-xs">
                <span className="w-24 shrink-0 text-slate-500">{label}</span>
                <div className="flex-1 bg-slate-100 dark:bg-asphalt-700 rounded-full h-4 overflow-hidden">
                  <div className={`h-4 rounded-full ${color}`} style={{ width: `${val * 100}%` }} />
                </div>
                <span className="w-10 text-right font-bold text-slate-800 dark:text-slate-100">{(val * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>

          {/* Pipeline */}
          <div className="card space-y-3 border-l-4 border-l-signal">
            <h3 className="font-bold font-display flex items-center gap-2"><FlaskConical size={16} className="text-signal" /> Detection Pipeline</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{data.pipeline.description}</p>
            <div className="flex flex-wrap gap-2 items-center text-xs">
              {data.pipeline.fallback_chain.map((step: string, i: number) => (
                <span key={step} className="flex items-center gap-1">
                  <span className="bg-signal/10 text-signal font-semibold px-2 py-1 rounded-lg">{step}</span>
                  {i < data.pipeline.fallback_chain.length - 1 && <span className="text-slate-400">→</span>}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Dataset Tab ── */}
      {tab === "dataset" && datasetInfo && (
        <div className="space-y-6">
          {[
            { key: "gtsrb", title: "GTSRB — Traffic Sign Recognition", usage: "ResNet50 classifier training" },
            { key: "detection_set", title: "Detection set — sign locations", usage: "YOLOv8 detector training" },
          ].map(({ key, title, usage }) => {
            const d = datasetInfo[key];
            if (!d) return null;
            return (
              <div key={key} className="card space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold font-display text-lg">{title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{[d.source, d.year].filter(Boolean).join(" · ")}</p>
                  </div>
                  <span className="bg-go/10 text-go text-[10px] font-bold px-2 py-1 rounded-full uppercase">{usage}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {/* The detection set has no published split to report — drop the empty
                      tiles rather than showing a label with nothing under it. */}
                  {([
                    ["Total Images",   d.total_images?.toLocaleString()],
                    ["Training Set",   d.train_images?.toLocaleString()],
                    ["Test Set",       d.test_images?.toLocaleString()],
                    ["Classes",        d.classes],
                  ] as [string, string | number | undefined][]).filter(([, val]) => val != null).map(([label, val]) => (
                    <div key={label} className="bg-slate-50 dark:bg-asphalt-700 rounded-xl p-3 text-center">
                      <div className="text-xl font-bold text-signal">{val}</div>
                      <div className="text-slate-500 mt-0.5">{label}</div>
                    </div>
                  ))}
                </div>

                {[
                  ["Image Sizes",   d.image_sizes],
                  ["Format",        d.format || d.annotation_format],
                  ["Colour Space",  d.color_space],
                ].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} className="flex gap-2 text-xs border-t border-slate-100 dark:border-asphalt-700 pt-2">
                    <span className="text-slate-400 w-28 shrink-0">{k}</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">{v}</span>
                  </div>
                ))}

                {/* How big this set really is, where that matters */}
                {d.size_note && (
                  <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-asphalt-700 pt-2">
                    {d.size_note}
                  </p>
                )}
              </div>
            );
          })}

          {/* Preprocessing pipeline */}
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { title: "ResNet50 Preprocessing", steps: datasetInfo.preprocessing?.resnet50 || [] },
              { title: "YOLOv8 Preprocessing",   steps: datasetInfo.preprocessing?.yolov8 || [] },
            ].map(({ title, steps }) => (
              <div key={title} className="card space-y-3">
                <h3 className="font-bold font-display text-sm">{title}</h3>
                <ol className="space-y-1.5">
                  {steps.map((step: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <span className="flex-shrink-0 w-5 h-5 bg-signal text-asphalt-900 rounded-full flex items-center justify-center font-bold text-[10px]">{i + 1}</span>
                      <span className="text-slate-600 dark:text-slate-300 leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
