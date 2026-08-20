import { useEffect, useState } from "react";
import { DetectionApi } from "@/services/api";
import { BarChart3, TrendingUp, Target, Zap, RefreshCw, Image, Film, Camera } from "lucide-react";

function StatCard({ icon: Icon, label, value, sub, color = "text-signal" }: {
  icon: any; label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <div className={`p-3 rounded-xl bg-slate-100 dark:bg-asphalt-700 ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <div className="text-2xl font-bold font-display text-slate-800 dark:text-slate-100">{value}</div>
        <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">{label}</div>
        {sub && <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

// SVG bar chart for top signs
function TopSignsChart({ signs }: { signs: { name: string; count: number }[] }) {
  if (!signs.length) return <p className="text-slate-400 text-xs text-center py-8">No data yet</p>;
  const max = Math.max(...signs.map(s => s.count));
  return (
    <div className="space-y-2">
      {signs.map((s, i) => (
        <div key={i} className="flex items-center gap-3 text-xs">
          <span className="w-5 text-slate-400 shrink-0 text-right font-mono">{i + 1}</span>
          <span className="w-40 text-slate-600 dark:text-slate-300 truncate shrink-0">{s.name}</span>
          <div className="flex-1 bg-slate-100 dark:bg-asphalt-700 rounded-full h-4 overflow-hidden">
            <div
              className="h-4 rounded-full bg-gradient-to-r from-signal to-go transition-all"
              style={{ width: max > 0 ? `${(s.count / max) * 100}%` : "0%" }}
            />
          </div>
          <span className="w-6 text-right font-bold text-signal shrink-0">{s.count}</span>
        </div>
      ))}
    </div>
  );
}

// SVG daily activity sparkline
function ActivityChart({ daily }: { daily: { date: string; count: number }[] }) {
  if (!daily.length) return <p className="text-slate-400 text-xs text-center py-8">No activity yet</p>;
  const W = 500, H = 100, PAD = 20;
  const max = Math.max(...daily.map(d => d.count), 1);
  const n = daily.length;
  const xS = (i: number) => PAD + (i / Math.max(n - 1, 1)) * (W - PAD * 2);
  const yS = (v: number) => H - PAD - (v / max) * (H - PAD * 2);
  const pts = daily.map((d, i) => `${xS(i)},${yS(d.count)}`).join(" ");
  const area = `M${xS(0)},${yS(daily[0].count)} ` + daily.map((d, i) => `L${xS(i)},${yS(d.count)}`).join(" ") + ` L${xS(n - 1)},${H - PAD} L${xS(0)},${H - PAD} Z`;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <defs>
          <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f5a623" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#f5a623" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#actGrad)" />
        <polyline points={pts} fill="none" stroke="#f5a623" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {daily.map((d, i) => (
          <circle key={i} cx={xS(i)} cy={yS(d.count)} r="3" fill="#f5a623" />
        ))}
      </svg>
      <div className="flex justify-between text-[9px] text-slate-400 mt-1 px-5">
        <span>{daily[0]?.date}</span>
        <span>{daily[daily.length - 1]?.date}</span>
      </div>
    </div>
  );
}

const SOURCE_ICONS: Record<string, any> = { image: Image, video: Film, webcam: Camera };
const SOURCE_COLORS: Record<string, string> = {
  image: "bg-signal/10 text-signal",
  video: "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
  webcam: "bg-go/10 text-go",
};

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(true);

  const load = async () => {
    setBusy(true);
    try {
      const res = await DetectionApi.analytics();
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display flex items-center gap-2">
            <BarChart3 className="text-signal" size={28} />
            Detection Analytics
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Aggregated statistics from all traffic sign detections stored in this system.
          </p>
        </div>
        <button onClick={load} disabled={busy} className="btn-ghost flex items-center gap-2 py-2 text-sm">
          <RefreshCw size={14} className={busy ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {busy && (
        <div className="flex items-center justify-center h-40 gap-3 text-slate-400">
          <div className="animate-spin h-6 w-6 rounded-full border-b-2 border-signal" />
          Loading analytics...
        </div>
      )}

      {!busy && !data && (
        <div className="card text-center p-12 text-slate-400 space-y-2">
          <BarChart3 size={40} className="mx-auto opacity-30" />
          <p>No analytics data available yet. Start detecting traffic signs to populate this dashboard.</p>
        </div>
      )}

      {!busy && data && (
        <>
          {/* Top KPI cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Target}   label="Total Detections"    value={data.total_predictions ?? 0} sub="all time" />
            <StatCard icon={TrendingUp} label="Avg Confidence"   value={`${((data.average_confidence || 0) * 100).toFixed(1)}%`} sub="across all predictions" color="text-go" />
            <StatCard icon={Zap}      label="High Confidence"    value={data.high_confidence_count ?? 0} sub={`≥ 80% · ${data.high_confidence_pct ?? 0}% of total`} color="text-blue-500" />
            <StatCard icon={BarChart3} label="Unique Sign Types" value={data.top_signs?.length ?? 0} sub="distinct signs detected" color="text-purple-500" />
          </div>

          {/* Source breakdown */}
          {data.by_source && Object.keys(data.by_source).length > 0 && (
            <div className="card space-y-4">
              <h3 className="font-bold font-display">Detections by Source</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                {Object.entries(data.by_source).map(([src, cnt]: any) => {
                  const Icon = SOURCE_ICONS[src] || Image;
                  return (
                    <div key={src} className={`flex items-center gap-3 rounded-xl p-4 ${SOURCE_COLORS[src] || "bg-slate-100 dark:bg-asphalt-700 text-slate-600"}`}>
                      <Icon size={20} />
                      <div>
                        <div className="text-xl font-bold">{cnt}</div>
                        <div className="text-xs font-semibold capitalize">{src} Upload</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Top detected signs */}
            <div className="card space-y-4">
              <h3 className="font-bold font-display flex items-center gap-2">
                <BarChart3 size={16} className="text-signal" />
                Top Detected Signs
              </h3>
              <TopSignsChart signs={data.top_signs || []} />
              {(!data.top_signs || data.top_signs.length === 0) && (
                <p className="text-xs text-slate-400 text-center py-4">No detections recorded yet</p>
              )}
            </div>

            {/* Daily activity */}
            <div className="card space-y-4">
              <h3 className="font-bold font-display flex items-center gap-2">
                <TrendingUp size={16} className="text-signal" />
                Daily Activity (Last 14 Days)
              </h3>
              <ActivityChart daily={data.daily_activity || []} />
            </div>
          </div>

          {/* No data placeholder */}
          {data.total_predictions === 0 && (
            <div className="card text-center p-10 text-slate-400 space-y-3 border-dashed">
              <BarChart3 size={36} className="mx-auto opacity-30" />
              <p className="text-sm font-medium">No detection data yet</p>
              <p className="text-xs">Upload traffic sign images or use the webcam to start detecting. Statistics will appear here automatically.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
