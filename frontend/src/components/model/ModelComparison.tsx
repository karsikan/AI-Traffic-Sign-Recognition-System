import { useEffect, useState } from "react";
import { ModelApi } from "@/services/api";
import { useLang } from "@/context/LanguageContext";
import { Cpu, Timer, Play, AlertTriangle, Info, Zap } from "lucide-react";

/**
 * YOLOv8 against ResNet50 — what each is for, and how fast each actually is.
 *
 * Accuracy is quoted from training; latency is measured on this machine when the button
 * is pressed. Keeping that distinction visible matters more than the numbers themselves.
 */

const L = {
  compare:   { en: "YOLOv8 vs ResNet50", ta: "YOLOv8 vs ResNet50", si: "YOLOv8 vs ResNet50" },
  aspect:    { en: "Aspect", ta: "அம்சம்", si: "අංගය" },
  latency:   { en: "Measured latency on this machine", ta: "இந்த கணினியில் அளக்கப்பட்ட நேரம்", si: "මෙම යන්ත්‍රයේ මනින ලද කාලය" },
  run:       { en: "Run benchmark", ta: "Benchmark ஓட்டு", si: "Benchmark ධාවනය" },
  running:   { en: "Measuring… (weights load on the first run)", ta: "அளக்கப்படுகிறது… (முதல் முறை weights ஏற்றப்படும்)", si: "මනිමින්… (පළමු වර weights පූරණය වේ)" },
  mean:      { en: "Mean", ta: "சராசரி", si: "සාමාන්‍ය" },
  median:    { en: "Median", ta: "இடைநிலை", si: "මධ්‍යස්ථ" },
  range:     { en: "Range", ta: "வரம்பு", si: "පරාසය" },
  combined:  { en: "Detection + classification", ta: "Detection + classification", si: "Detection + classification" },
  env:       { en: "Environment", ta: "சூழல்", si: "පරිසරය" },
  failed:    { en: "Benchmark failed.", ta: "Benchmark தோல்வி.", si: "Benchmark අසාර්ථකයි." },
};

export default function ModelComparison() {
  const { lang } = useLang();
  const key = lang as "en" | "ta" | "si";
  const tr = (k: keyof typeof L) => L[k][key] ?? L[k].en;

  const [comparison, setComparison] = useState<any>(null);
  const [bench, setBench] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { ModelApi.comparison().then(setComparison).catch(() => {}); }, []);

  const run = async () => {
    setBusy(true);
    setError("");
    try {
      setBench(await ModelApi.benchmark(8));
    } catch (e: any) {
      setError(e.message || tr("failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Side-by-side */}
      {comparison && (
        <div className="card p-0 overflow-hidden">
          <div className="p-4 pb-3">
            <p className="font-bold font-display flex items-center gap-2">
              <Cpu size={16} className="text-signal" /> {tr("compare")}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[520px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-asphalt-700/40 text-left">
                  <th className="px-4 py-2 font-bold text-slate-500">{tr("aspect")}</th>
                  <th className="px-4 py-2 font-bold text-signal">YOLOv8</th>
                  <th className="px-4 py-2 font-bold text-go">ResNet50</th>
                </tr>
              </thead>
              <tbody>
                {comparison.rows.map((r: any) => (
                  <tr key={r.aspect} className="border-t border-slate-100 dark:border-asphalt-700 align-top">
                    <td className="px-4 py-2.5 font-medium text-slate-500 whitespace-nowrap">{r.aspect}</td>
                    <td className="px-4 py-2.5">{r.yolov8}</td>
                    <td className="px-4 py-2.5">{r.resnet50}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-500 px-4 py-3 border-t border-slate-100 dark:border-asphalt-700">
            {comparison.note}
          </p>
        </div>
      )}

      {/* Live latency */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="font-bold font-display text-sm flex items-center gap-2">
            <Timer size={15} className="text-signal" /> {tr("latency")}
          </p>
          <button className="btn-primary py-1.5 text-xs shrink-0" onClick={run} disabled={busy}>
            <Play size={13} /> {busy ? tr("running") : tr("run")}
          </button>
        </div>

        {error && (
          <p className="text-xs text-alert flex items-center gap-1.5">
            <AlertTriangle size={13} /> {error}
          </p>
        )}

        {bench && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(bench.models).map(([name, m]: [string, any]) => (
                <div key={name} className="rounded-xl border border-slate-200 dark:border-asphalt-700 p-3 space-y-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-bold">{name === "yolov8" ? "YOLOv8" : "ResNet50"}</p>
                    {m.fps && <span className="text-[11px] text-slate-400">~{m.fps} fps</span>}
                  </div>
                  {m.error ? (
                    <p className="text-xs text-alert">{m.error}</p>
                  ) : (
                    <>
                      <p className="text-[11px] text-slate-500">{m.task} · {m.input_size}</p>
                      <p className="display text-2xl font-bold text-signal">{m.mean_ms} ms</p>
                      <dl className="grid grid-cols-3 gap-1.5 text-[10px]">
                        {[
                          [tr("median"), `${m.median_ms} ms`],
                          [tr("range"), `${m.min_ms}–${m.max_ms}`],
                          ["σ", `${m.stdev_ms} ms`],
                        ].map(([k, v]) => (
                          <div key={String(k)} className="rounded-lg bg-slate-50 dark:bg-asphalt-700/40 p-1.5">
                            <dt className="font-bold uppercase tracking-wider text-slate-400">{k}</dt>
                            <dd className="font-bold text-slate-700 dark:text-slate-200">{v}</dd>
                          </div>
                        ))}
                      </dl>
                    </>
                  )}
                </div>
              ))}
            </div>

            {bench.combined_mean_ms && (
              <div className="rounded-xl border border-signal/30 bg-signal/5 p-3 flex items-start gap-2.5">
                <Zap size={15} className="text-signal shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold">
                    {tr("combined")}: {bench.combined_mean_ms} ms
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">{bench.combined_note}</p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 text-[10px]">
              {Object.entries(bench.environment).map(([k, v]: [string, any]) => (
                <span key={k} className="rounded-full bg-slate-100 dark:bg-asphalt-700 px-2 py-1 text-slate-500">
                  {k.replace(/_/g, " ")}: <b>{String(v)}</b>
                </span>
              ))}
              <span className="rounded-full bg-slate-100 dark:bg-asphalt-700 px-2 py-1 text-slate-500">
                measured: <b>{bench.measured_at}</b>
              </span>
            </div>

            <p className="text-[11px] text-slate-500 flex items-start gap-1.5">
              <Info size={12} className="shrink-0 mt-0.5" /> {bench.note}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
