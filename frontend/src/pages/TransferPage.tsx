import { useEffect, useState } from "react";
import { useLang } from "@/context/LanguageContext";
import { VehicleApi } from "@/services/api";
import {
  FileText, ExternalLink, AlertTriangle, Info, ClipboardList,
  ShieldAlert, CheckCircle2, Circle, Clock, RotateCcw,
} from "lucide-react";

/**
 * Buying or selling a vehicle in Sri Lanka.
 *
 * The checklist is the point of this page. Open papers and an undischarged lease are the
 * two ways people lose money here, so those items are flagged hardest and the tally
 * refuses to look "done" while a critical item is unticked.
 */

const UI = {
  en: {
    title: "Vehicle Transfer",
    sub: "Buying second-hand, or selling. The forms, the sequence, and the checks that stop you losing money.",
    tabs: ["Buyer's checklist", "Forms & process"],
    checklist: "Check before you pay",
    progress: "Checked",
    criticalLeft: "critical check(s) still unticked — do not pay yet",
    allClear: "All critical checks ticked. Still verify the documents in person.",
    reset: "Reset",
    forms: "The forms", documents: "Documents needed", steps: "The sequence",
    hours: "Counter hours", dmtSite: "DMT transfer page", dmtForms: "Download forms",
    copies: "Copies", who: "Completed by",
    dataNote: "About this information",
    loading: "Loading…",
    failed: "Could not reach the backend on port 8000.",
    riskCritical: "Critical", riskImportant: "Important", riskAdvisory: "Advisory",
  },
  ta: {
    title: "வாகன மாற்றம்",
    sub: "செகண்ட் ஹேண்ட் வாங்குதல் அல்லது விற்றல். படிவங்கள், வரிசை, பணம் இழக்காமல் இருக்கச் சரிபார்ப்புகள்.",
    tabs: ["வாங்குபவர் சரிபார்ப்பு", "படிவங்கள் & நடைமுறை"],
    checklist: "பணம் கொடுக்கும் முன் சரிபார்க்கவும்",
    progress: "சரிபார்த்தது",
    criticalLeft: "முக்கியச் சரிபார்ப்பு மீதம் — இன்னும் பணம் கொடுக்காதீர்கள்",
    allClear: "முக்கியச் சரிபார்ப்புகள் முடிந்தது. ஆவணங்களை நேரில் பாருங்கள்.",
    reset: "மீட்டமை",
    forms: "படிவங்கள்", documents: "தேவையான ஆவணங்கள்", steps: "வரிசை",
    hours: "கவுண்டர் நேரம்", dmtSite: "DMT பக்கம்", dmtForms: "படிவங்களைப் பதிவிறக்கு",
    copies: "பிரதிகள்", who: "நிரப்ப வேண்டியவர்",
    dataNote: "இந்தத் தகவல் பற்றி",
    loading: "ஏற்றப்படுகிறது…",
    failed: "Backend port 8000-ஐ அணுக முடியவில்லை.",
    riskCritical: "மிக முக்கியம்", riskImportant: "முக்கியம்", riskAdvisory: "ஆலோசனை",
  },
  si: {
    title: "වාහන හිමිකම් මාරුව",
    sub: "පාවිච්චි කළ වාහනයක් ගැනීම හෝ විකිණීම. පෝරම, පිළිවෙළ, සහ මුදල් නැති නොවීමට පරීක්ෂා.",
    tabs: ["ගැනුම්කරුගේ ලැයිස්තුව", "පෝරම සහ ක්‍රියාවලිය"],
    checklist: "ගෙවීමට පෙර පරීක්ෂා කරන්න",
    progress: "පරීක්ෂා කළා",
    criticalLeft: "තීරණාත්මක පරීක්ෂා ඉතිරියි — තවම ගෙවන්න එපා",
    allClear: "තීරණාත්මක පරීක්ෂා සම්පූර්ණයි. ලේඛන පෞද්ගලිකව බලන්න.",
    reset: "යළි පිහිටුවන්න",
    forms: "පෝරම", documents: "අවශ්‍ය ලේඛන", steps: "පිළිවෙළ",
    hours: "කවුන්ටර් වේලාව", dmtSite: "DMT පිටුව", dmtForms: "පෝරම බාගන්න",
    copies: "පිටපත්", who: "සම්පූර්ණ කරන්නේ",
    dataNote: "මෙම තොරතුරු ගැන",
    loading: "පූරණය වෙමින්…",
    failed: "Backend port 8000 වෙත ළඟා විය නොහැක.",
    riskCritical: "තීරණාත්මක", riskImportant: "වැදගත්", riskAdvisory: "උපදෙස්",
  },
};

type LabelKey = Exclude<keyof typeof UI.en, "tabs">;

const RISK_STYLE: Record<string, { cls: string; labelKey: LabelKey }> = {
  critical:  { cls: "bg-alert/10 text-alert border-alert/30",     labelKey: "riskCritical" },
  important: { cls: "bg-signal/10 text-signal border-signal/30",  labelKey: "riskImportant" },
  advisory:  { cls: "bg-slate-100 text-slate-500 border-slate-300 dark:bg-asphalt-700 dark:border-asphalt-700", labelKey: "riskAdvisory" },
};

export default function TransferPage() {
  const { lang } = useLang();
  const key = lang as "en" | "ta" | "si";
  const tr = (k: LabelKey): string => UI[key]?.[k] ?? UI.en[k];
  const tabs = UI[key]?.tabs ?? UI.en.tabs;

  const [data, setData] = useState<any>(null);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState(0);
  const [ticked, setTicked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    VehicleApi.transfer().then(setData).catch(() => setError(true));
  }, []);

  if (error) {
    return (
      <div className="card border-alert/30 bg-alert/5 flex items-start gap-3">
        <AlertTriangle className="text-alert shrink-0 mt-0.5" size={18} />
        <p className="text-sm text-slate-600 dark:text-slate-300">{tr("failed")}</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="card flex flex-col items-center justify-center p-10 space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-signal" />
        <p className="text-slate-600 dark:text-slate-300 font-medium">{tr("loading")}</p>
      </div>
    );
  }

  const list = data.buyer_checklist;
  const done = list.filter((c: any) => ticked[c.key]).length;
  const criticalLeft = list.filter((c: any) => c.risk === "critical" && !ticked[c.key]).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display">{tr("title")}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">{tr("sub")}</p>
      </div>

      <div className="flex gap-1.5">
        {tabs.map((label: string, i: number) => (
          <button key={label} onClick={() => setTab(i)}
            className={`text-xs font-semibold px-3.5 py-2 rounded-full border transition ${
              tab === i
                ? "bg-signal text-asphalt-900 border-signal"
                : "border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-asphalt-700 dark:text-slate-300 dark:hover:bg-asphalt-700"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Buyer's checklist ── */}
      {tab === 0 && (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8 space-y-3">
            <div className="card flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold">
                  {tr("progress")} {done}/{list.length}
                </p>
                <p className={`text-xs mt-0.5 ${criticalLeft ? "text-alert font-medium" : "text-go"}`}>
                  {criticalLeft ? `${criticalLeft} ${tr("criticalLeft")}` : tr("allClear")}
                </p>
              </div>
              <button className="btn-ghost py-1.5 text-xs shrink-0" onClick={() => setTicked({})}>
                <RotateCcw size={12} /> {tr("reset")}
              </button>
            </div>

            {list.map((c: any) => {
              const style = RISK_STYLE[c.risk] ?? RISK_STYLE.advisory;
              const on = !!ticked[c.key];
              return (
                <button key={c.key}
                  onClick={() => setTicked((t) => ({ ...t, [c.key]: !t[c.key] }))}
                  className={`card w-full text-left flex gap-3 transition ${
                    on ? "border-go/40 bg-go/5" : "hover:bg-slate-50 dark:hover:bg-asphalt-700/40"}`}>
                  {on
                    ? <CheckCircle2 size={18} className="text-go shrink-0 mt-0.5" />
                    : <Circle size={18} className="text-slate-300 dark:text-asphalt-700 shrink-0 mt-0.5" />}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-semibold ${on ? "text-slate-400 line-through" : ""}`}>
                        {c.label}
                      </p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${style.cls}`}>
                        {tr(style.labelKey)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{c.detail}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-4 space-y-4">
            <div className="card border-alert/40 bg-alert/5 flex gap-3">
              <ShieldAlert className="text-alert shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-xs font-bold mb-1">Open papers</p>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {list.find((c: any) => c.key === "open_papers")?.detail}
                </p>
              </div>
            </div>

            <div className="card space-y-2">
              <p className="font-bold font-display text-sm flex items-center gap-2">
                <FileText size={15} className="text-signal" /> {tr("documents")}
              </p>
              <ul className="space-y-1.5">
                {data.documents.map((d: string) => (
                  <li key={d} className="flex gap-2 text-xs">
                    <span className="text-signal mt-0.5">•</span>
                    <span className="text-slate-600 dark:text-slate-300">{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ── Forms and process ── */}
      {tab === 1 && (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7 space-y-4">
            <div className="card space-y-3">
              <p className="font-bold font-display text-sm flex items-center gap-2">
                <FileText size={15} className="text-signal" /> {tr("forms")}
              </p>
              {data.forms.map((f: any) => (
                <div key={f.code} className="rounded-xl border border-slate-200 dark:border-asphalt-700 p-3 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-signal">{f.code}</p>
                    <span className="text-[10px] text-slate-400 shrink-0">{f.copies}</span>
                  </div>
                  <p className="text-xs font-medium">{f.name}</p>
                  <p className="text-[11px] text-slate-500">
                    <span className="font-semibold">{tr("who")}:</span> {f.who}
                  </p>
                  <p className="text-[11px] text-slate-500">{f.detail}</p>
                </div>
              ))}
            </div>

            <div className="card space-y-3">
              <p className="font-bold font-display text-sm flex items-center gap-2">
                <ClipboardList size={15} className="text-signal" /> {tr("steps")}
              </p>
              <ol className="space-y-2.5">
                {data.steps.map((s: any) => (
                  <li key={s.step} className="flex gap-3">
                    <span className="shrink-0 h-5 w-5 rounded-full bg-signal/15 text-signal text-[11px] font-bold flex items-center justify-center">
                      {s.step}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{s.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{s.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="card space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Clock size={15} className="text-signal shrink-0" />
                <span className="font-semibold">{tr("hours")}:</span>
                <span className="text-slate-600 dark:text-slate-300">{data.counter_hours}</span>
              </div>
              <a href={data.dmt_forms_url} target="_blank" rel="noopener noreferrer"
                className="btn-primary w-full py-2 text-xs">
                <ExternalLink size={13} /> {tr("dmtForms")}
              </a>
              <a href={data.dmt_transfer_url} target="_blank" rel="noopener noreferrer"
                className="btn-ghost w-full py-2 text-xs">
                <ExternalLink size={13} /> {tr("dmtSite")}
              </a>
            </div>

            <div className="card border-slate-200 dark:border-asphalt-700 flex gap-3">
              <Info className="text-slate-400 shrink-0 mt-0.5" size={16} />
              <div>
                <p className="text-xs font-bold mb-1">{tr("dataNote")}</p>
                <p className="text-xs text-slate-500">{data.data_note}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
