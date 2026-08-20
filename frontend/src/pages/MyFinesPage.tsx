import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLang } from "@/context/LanguageContext";
import { ComputeApi, MyFinesApi } from "@/services/api";
import { localStore, onStoreChange } from "@/services/localStore";
import PaymentChannels from "@/components/fines/PaymentChannels";
import DriverReportCard from "@/components/reports/DriverReportCard";
import {
  Plus, Banknote, Clock, Gavel, AlertTriangle, CheckCircle2, Trash2,
  MapPin, CreditCard, Calculator, Info, X, ScanLine, CalendarClock, ChevronDown,
} from "lucide-react";

// ── Trilingual UI labels ─────────────────────────────────────────────────────
const UI = {
  en: {
    title: "My Fines",
    sub: "Keep every spot-fine charge sheet in one place. The countdown to the 14-day deadline, what it costs today, and how to get a withheld licence back.",
    add: "Add a fine", addTitle: "New charge sheet", cancel: "Cancel", save: "Save fine",
    offence: "Offence", amount: "Fine amount (LKR)", issued: "Date issued", due: "Pay before (if printed)",
    reference: "Charge sheet no", section: "Section", station: "Police station", officer: "Officer's no",
    vehicle: "Vehicle no", place: "Place of offence", court: "Court", courtDate: "Court date",
    withheld: "The officer kept my driving licence", notes: "Notes",
    pending: "Pending", paid: "Paid", allTab: "All",
    sumPending: "Pending fines", sumPayable: "Payable today", sumNext: "Next deadline", sumLicence: "Licences held",
    empty: "No fines saved. Add one by hand, or scan the charge sheet on the Document Scanner.",
    scanCta: "Scan a charge sheet",
    payableNow: "Payable today", printed: "Printed amount", daysLeft: "days left",
    markPaid: "Mark as paid", receipt: "Post office receipt no", paidOn: "Paid on",
    confirmPaid: "Record payment", delete: "Delete", confirmDelete: "Delete this fine?",
    licenceTitle: "Getting your licence back", licenceDone: "Licence collected",
    licenceRecovered: "Licence recovered",
    guideTitle: "Where to pay", nearestTitle: "Nearest post office & police station",
    nearestCta: "Find on the map",
    calcTitle: "Late payment calculator", calcSub: "Check what a fine costs today without saving it.",
    calcRun: "Calculate", calcAmount: "Amount on the charge sheet (LKR)", calcIssued: "Date issued",
    timeline: "Payment timeline",
    stageNormal: "Normal fine", stageDouble: "Double fine", stageCourt: "Court action", stagePaid: "Settled",
    loading: "Loading your fines…",
    failed: "Could not load. Is the backend running on port 8000?",
    saveFailed: "Could not save the fine.",
    required: "Offence, amount and the date issued are required.",
  },
  ta: {
    title: "எனது அபராதங்கள்",
    sub: "ஒவ்வொரு அபராதத் தாளையும் ஒரே இடத்தில் வையுங்கள். 14 நாள் கெடுவுக்கான countdown, இன்று எவ்வளவு செலுத்த வேண்டும், பறிமுதலான உரிமத்தை எப்படி மீளப்பெறுவது.",
    add: "அபராதம் சேர்", addTitle: "புதிய அபராதத் தாள்", cancel: "ரத்து", save: "சேமி",
    offence: "குற்றம்", amount: "அபராதத் தொகை (LKR)", issued: "வழங்கிய திகதி", due: "இதற்குள் செலுத்த (அச்சிட்டிருந்தால்)",
    reference: "அபராதத் தாள் இலக்கம்", section: "பிரிவு", station: "பொலிஸ் நிலையம்", officer: "அதிகாரி இலக்கம்",
    vehicle: "வாகன இலக்கம்", place: "குற்றம் நடந்த இடம்", court: "நீதிமன்றம்", courtDate: "நீதிமன்ற திகதி",
    withheld: "அதிகாரி எனது சாரதி அனுமதிப்பத்திரத்தை வைத்துக்கொண்டார்", notes: "குறிப்புகள்",
    pending: "நிலுவை", paid: "செலுத்தப்பட்டது", allTab: "அனைத்தும்",
    sumPending: "நிலுவை அபராதங்கள்", sumPayable: "இன்று செலுத்த வேண்டியது", sumNext: "அடுத்த கெடு", sumLicence: "பறிமுதலான உரிமங்கள்",
    empty: "அபராதம் எதுவும் சேமிக்கப்படவில்லை. கையால் சேர்க்கவும், அல்லது Document Scanner-ல் தாளை ஸ்கேன் செய்யவும்.",
    scanCta: "அபராதத் தாளை ஸ்கேன் செய்",
    payableNow: "இன்று செலுத்த வேண்டியது", printed: "அச்சிட்ட தொகை", daysLeft: "நாட்கள் மீதம்",
    markPaid: "செலுத்தியதாகக் குறி", receipt: "தபால் அலுவலக ரசீது இலக்கம்", paidOn: "செலுத்திய திகதி",
    confirmPaid: "பதிவு செய்", delete: "நீக்கு", confirmDelete: "இந்த அபராதத்தை நீக்கவா?",
    licenceTitle: "உரிமத்தை மீளப்பெறுதல்", licenceDone: "உரிமம் பெறப்பட்டது",
    licenceRecovered: "உரிமம் மீட்கப்பட்டது",
    guideTitle: "எங்கே செலுத்துவது", nearestTitle: "அருகிலுள்ள தபால் & பொலிஸ் நிலையம்",
    nearestCta: "வரைபடத்தில் காண்",
    calcTitle: "காலதாமதக் கட்டணக் கணிப்பான்", calcSub: "சேமிக்காமலே இன்றைய தொகையைப் பாருங்கள்.",
    calcRun: "கணக்கிடு", calcAmount: "தாளில் உள்ள தொகை (LKR)", calcIssued: "வழங்கிய திகதி",
    timeline: "கட்டண காலவரிசை",
    stageNormal: "சாதாரண அபராதம்", stageDouble: "இரட்டிப்பு அபராதம்", stageCourt: "நீதிமன்ற நடவடிக்கை", stagePaid: "தீர்க்கப்பட்டது",
    loading: "உங்கள் அபராதங்கள் ஏற்றப்படுகிறது…",
    failed: "ஏற்ற முடியவில்லை. Backend port 8000-ல் இயங்குகிறதா?",
    saveFailed: "அபராதத்தைச் சேமிக்க முடியவில்லை.",
    required: "குற்றம், தொகை, வழங்கிய திகதி அவசியம்.",
  },
  si: {
    title: "මගේ දඩ",
    sub: "සෑම දඩ පත්‍රිකාවක්ම එක තැනක. දින 14 කාලසීමාවට ඉතිරි කාලය, අද ගෙවිය යුතු මුදල, සහ රඳවාගත් බලපත්‍රය ලබාගන්නා ආකාරය.",
    add: "දඩයක් එක් කරන්න", addTitle: "නව දඩ පත්‍රිකාව", cancel: "අවලංගු", save: "සුරකින්න",
    offence: "වරද", amount: "දඩ මුදල (LKR)", issued: "නිකුත් කළ දිනය", due: "ගෙවිය යුතු දිනය (මුද්‍රිත නම්)",
    reference: "දඩ පත්‍රිකා අංකය", section: "වගන්තිය", station: "පොලිස් ස්ථානය", officer: "නිලධාරි අංකය",
    vehicle: "වාහන අංකය", place: "වරද සිදුවූ ස්ථානය", court: "අධිකරණය", courtDate: "අධිකරණ දිනය",
    withheld: "නිලධාරියා මගේ බලපත්‍රය රඳවා ගත්තා", notes: "සටහන්",
    pending: "විසඳා නැති", paid: "ගෙවා ඇත", allTab: "සියල්ල",
    sumPending: "විසඳා නැති දඩ", sumPayable: "අද ගෙවිය යුතු", sumNext: "ඊළඟ කාලසීමාව", sumLicence: "රඳවාගත් බලපත්‍ර",
    empty: "දඩ සුරකා නැත. අතින් එක් කරන්න, නැතහොත් Document Scanner හි පත්‍රිකාව ස්කෑන් කරන්න.",
    scanCta: "දඩ පත්‍රිකාව ස්කෑන් කරන්න",
    payableNow: "අද ගෙවිය යුතු", printed: "මුද්‍රිත මුදල", daysLeft: "දින ඉතිරියි",
    markPaid: "ගෙවූ බව සලකුණු කරන්න", receipt: "තැපැල් රිසිට් අංකය", paidOn: "ගෙවූ දිනය",
    confirmPaid: "වාර්තා කරන්න", delete: "මකන්න", confirmDelete: "මෙම දඩය මකන්නද?",
    licenceTitle: "බලපත්‍රය ලබාගැනීම", licenceDone: "බලපත්‍රය ලබාගත්තා",
    licenceRecovered: "බලපත්‍රය ලබාගෙන ඇත",
    guideTitle: "ගෙවිය හැකි ස්ථාන", nearestTitle: "ළඟම තැපැල් හා පොලිස් ස්ථානය",
    nearestCta: "සිතියමේ සොයන්න",
    calcTitle: "ප්‍රමාද ගෙවීම් ගණකය", calcSub: "සුරකින්නේ නැතිව අද මුදල බලන්න.",
    calcRun: "ගණනය", calcAmount: "පත්‍රිකාවේ මුදල (LKR)", calcIssued: "නිකුත් කළ දිනය",
    timeline: "ගෙවීම් කාලරේඛාව",
    stageNormal: "සාමාන්‍ය දඩය", stageDouble: "දෙගුණ දඩය", stageCourt: "අධිකරණ ක්‍රියාමාර්ග", stagePaid: "විසඳා ඇත",
    loading: "ඔබේ දඩ පූරණය වෙමින්…",
    failed: "පූරණය කළ නොහැකි විය. Backend port 8000 හි ක්‍රියාත්මකද?",
    saveFailed: "දඩය සුරැකීමට නොහැකි විය.",
    required: "වරද, මුදල සහ නිකුත් කළ දිනය අවශ්‍යයි.",
  },
};

type LabelKey = keyof typeof UI.en;

const URGENCY_STYLE: Record<string, { box: string; tone: string; bar: string }> = {
  safe:     { box: "border-go/40 bg-go/5",         tone: "text-go",     bar: "bg-go" },
  warning:  { box: "border-signal/40 bg-signal/5", tone: "text-signal", bar: "bg-signal" },
  critical: { box: "border-orange-500/40 bg-orange-500/5", tone: "text-orange-500", bar: "bg-orange-500" },
  overdue:  { box: "border-alert/40 bg-alert/5",   tone: "text-alert",  bar: "bg-alert" },
};

const STAGE_ICON: Record<string, any> = {
  normal: Clock, double: AlertTriangle, court: Gavel, paid: CheckCircle2,
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// Written out in full — Tailwind only picks up class names it can see as literals.
const STAGE_STYLE: Record<string, { box: string; text: string }> = {
  normal: { box: "border-go/50 bg-go/10",                   text: "text-go" },
  double: { box: "border-orange-500/50 bg-orange-500/10",   text: "text-orange-500" },
  court:  { box: "border-alert/50 bg-alert/10",             text: "text-alert" },
};

// ── The 3-stage strip shown under each fine ──────────────────────────────────
function Timeline({ timeline, current, tr }: { timeline: any[]; current: string; tr: (k: LabelKey) => string }) {
  const stageLabel: Record<string, LabelKey> = {
    normal: "stageNormal", double: "stageDouble", court: "stageCourt",
  };
  return (
    <div className="grid grid-cols-3 gap-2">
      {timeline.map((t: any) => {
        const active = t.stage === current;
        const style = STAGE_STYLE[t.stage];
        return (
          <div
            key={t.stage}
            className={`rounded-xl border p-2.5 text-center ${
              active ? style.box : "border-slate-200 dark:border-asphalt-700 opacity-60"
            }`}
          >
            <p className={`text-[10px] font-bold uppercase tracking-wider ${active ? style.text : "text-slate-400"}`}>
              {tr(stageLabel[t.stage])}
            </p>
            <p className="text-sm font-bold mt-0.5">
              {t.amount_lkr !== null ? `${t.amount_lkr.toLocaleString()}` : "—"}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {t.to_date ? `${t.from_date.slice(5)} → ${t.to_date.slice(5)}` : `${t.from_date.slice(5)} →`}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ── One saved fine ───────────────────────────────────────────────────────────
function FineCard({ fine, tr, onPaid, onRecovered, onDelete }: {
  fine: any;
  tr: (k: LabelKey) => string;
  onPaid: (id: number, receipt: string) => void;
  onRecovered: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [receipt, setReceipt] = useState("");

  const c = fine.countdown;
  const style = URGENCY_STYLE[c.urgency] ?? URGENCY_STYLE.safe;
  const Icon = STAGE_ICON[c.stage] ?? Clock;
  const settled = c.stage === "paid";

  return (
    <div className={`card space-y-3 ${settled ? "" : style.box}`}>
      {/* Headline */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug">{fine.offence}</p>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500">
            {fine.reference_no && <span className="font-medium">#{fine.reference_no}</span>}
            {fine.section && <span>· {tr("section")} {fine.section}</span>}
            <span>· {tr("issued")} {fine.issued_date}</span>
            {fine.vehicle_no && <span>· {fine.vehicle_no}</span>}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {settled ? tr("printed") : tr("payableNow")}
          </p>
          <p className={`display text-xl font-bold ${settled ? "text-slate-400" : style.tone}`}>
            {(c.payable_now_lkr ?? fine.fine_amount_lkr).toLocaleString()}
          </p>
          {c.multiplier === 2 && (
            <p className="text-[10px] text-slate-400 line-through">
              {fine.fine_amount_lkr.toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {/* Countdown */}
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <Icon size={16} className={`${settled ? "text-go" : style.tone} shrink-0 mt-0.5`} />
          <p className="text-xs text-slate-600 dark:text-slate-300 flex-1">{c.message}</p>
          {c.days_left !== null && (
            <span className={`display text-lg font-bold shrink-0 ${style.tone}`}>
              {c.days_left}
              <span className="text-[10px] font-medium text-slate-400 ml-1">{tr("daysLeft")}</span>
            </span>
          )}
        </div>
        {!settled && (
          <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-asphalt-700 overflow-hidden">
            <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${c.percent_elapsed}%` }} />
          </div>
        )}
      </div>

      {/* Court date */}
      {fine.court_countdown && (
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-asphalt-700/40 p-2.5">
          <Gavel size={14} className="text-signal shrink-0" />
          <p className="text-xs">
            <span className="font-semibold">{fine.court || tr("court")}</span> — {fine.court_countdown.message}
          </p>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="text-xs font-semibold text-signal flex items-center gap-1 hover:underline"
      >
        {tr("timeline")}
        <ChevronDown size={13} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="space-y-3 border-t border-slate-100 dark:border-asphalt-700 pt-3">
          <Timeline timeline={fine.timeline} current={c.stage} tr={tr} />
          {(fine.police_station || fine.officer_no || fine.place_of_offence || fine.notes) && (
            <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {fine.police_station && (
                <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{tr("station")}</dt>
                  <dd className="text-xs">{fine.police_station}</dd></div>
              )}
              {fine.officer_no && (
                <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{tr("officer")}</dt>
                  <dd className="text-xs">{fine.officer_no}</dd></div>
              )}
              {fine.place_of_offence && (
                <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{tr("place")}</dt>
                  <dd className="text-xs">{fine.place_of_offence}</dd></div>
              )}
              {fine.notes && (
                <div className="sm:col-span-2"><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{tr("notes")}</dt>
                  <dd className="text-xs">{fine.notes}</dd></div>
              )}
            </dl>
          )}

          {/* Licence retrieval — only while the station still holds it */}
          {fine.licence_retrieval && (
            <div className="rounded-xl border border-signal/30 bg-signal/5 p-3 space-y-2.5">
              <p className="text-xs font-bold flex items-center gap-2">
                <CreditCard size={14} className="text-signal" /> {tr("licenceTitle")}
              </p>
              <ol className="space-y-2">
                {fine.licence_retrieval.map((s: any) => (
                  <li key={s.step} className="flex gap-2.5">
                    <span className="shrink-0 h-[18px] w-[18px] rounded-full bg-signal/20 text-signal text-[10px] font-bold flex items-center justify-center">
                      {s.step}
                    </span>
                    <div>
                      <p className="text-xs font-medium">{s.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{s.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <button className="btn-ghost w-full py-1.5 text-xs" onClick={() => onRecovered(fine.id)}>
                <CheckCircle2 size={13} /> {tr("licenceDone")}
              </button>
            </div>
          )}

          {fine.licence_withheld && fine.licence_recovered && (
            <p className="text-xs text-go flex items-center gap-1.5">
              <CheckCircle2 size={13} /> {tr("licenceRecovered")}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 dark:border-asphalt-700 pt-3">
        {settled ? (
          <span className="text-xs text-go font-semibold flex items-center gap-1.5">
            <CheckCircle2 size={14} /> {tr("paid")}
            {fine.receipt_no && <span className="text-slate-400 font-normal">· {fine.receipt_no}</span>}
          </span>
        ) : paying ? (
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <input
              className="input flex-1 min-w-[160px] py-1.5 text-xs"
              placeholder={tr("receipt")}
              value={receipt}
              onChange={(e) => setReceipt(e.target.value)}
            />
            <button className="btn-primary py-1.5 text-xs" onClick={() => { onPaid(fine.id, receipt); setPaying(false); }}>
              {tr("confirmPaid")}
            </button>
            <button className="btn-ghost py-1.5 text-xs" onClick={() => setPaying(false)}>{tr("cancel")}</button>
          </div>
        ) : (
          <button className="btn-primary py-1.5 text-xs" onClick={() => setPaying(true)}>
            <CheckCircle2 size={13} /> {tr("markPaid")}
          </button>
        )}
        <button
          className="btn-ghost py-1.5 text-xs text-alert border-alert/30 ml-auto"
          onClick={() => { if (window.confirm(tr("confirmDelete"))) onDelete(fine.id); }}
        >
          <Trash2 size={13} /> {tr("delete")}
        </button>
      </div>
    </div>
  );
}

export default function MyFinesPage() {
  const { lang } = useLang();
  const tr = (k: LabelKey): string => UI[(lang as "en" | "ta" | "si")]?.[k] ?? UI.en[k];

  const [fines, setFines] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [guide, setGuide] = useState<any>(null);
  const [filter, setFilter] = useState<"pending" | "paid" | "all">("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({ issued_date: today(), licence_withheld: false });
  const [formError, setFormError] = useState("");

  const [calc, setCalc] = useState<{ amount: string; issued: string }>({ amount: "3000", issued: today() });
  const [calcResult, setCalcResult] = useState<any>(null);

  /**
   * Records come from this device; the countdowns come from the backend as a
   * calculation over them. Nothing personal is sent anywhere to be stored.
   */
  const load = async () => {
    const stored = localStore.list("fines");
    try {
      const res = await ComputeApi.fines(stored);
      const derived = new Map(res.fines.map((f: any) => [f.id, f]));
      setFines(stored.map((f) => ({ ...f, ...(derived.get(f.id) as object ?? {}) })));
      setSummary(res.summary);
      setError(false);
    } catch {
      // Without the backend the records are still readable, just without countdowns
      setFines(stored);
      setSummary(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    MyFinesApi.paymentGuide().then(setGuide).catch(() => setGuide(null));
    return onStoreChange(load);
  }, []);

  const submit = async () => {
    if (!form.offence || !form.fine_amount_lkr || !form.issued_date) {
      setFormError(tr("required"));
      return;
    }
    try {
      const payload: Record<string, any> = {
        ...form,
        fine_amount_lkr: Number(form.fine_amount_lkr),
        status: "pending",
      };
      localStore.create("fines", payload);
      setForm({ issued_date: today(), licence_withheld: false });
      setFormError("");
      setAdding(false);
      load();
    } catch (e: any) {
      setFormError(e.message || tr("saveFailed"));
    }
  };

  const runCalc = async () => {
    try {
      setCalcResult(await MyFinesApi.preview(Number(calc.amount), calc.issued));
    } catch {
      setCalcResult(null);
    }
  };

  const visible = fines.filter((f) =>
    filter === "all" ? true : filter === "paid" ? f.status === "paid" : f.status !== "paid"
  );

  if (error) {
    return (
      <div className="card border-alert/30 bg-alert/5 flex items-start gap-3">
        <AlertTriangle className="text-alert shrink-0 mt-0.5" size={18} />
        <p className="text-sm text-slate-600 dark:text-slate-300">{tr("failed")}</p>
      </div>
    );
  }

  const field = (key: string, label: string, type = "text") => (
    <div>
      <label className="label text-xs">{label}</label>
      <input
        className="input py-2 text-sm"
        type={type}
        value={form[key] ?? ""}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display">{tr("title")}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">{tr("sub")}</p>
        </div>
        <button className="btn-primary shrink-0" onClick={() => setAdding((a) => !a)}>
          {adding ? <X size={16} /> : <Plus size={16} />} {adding ? tr("cancel") : tr("add")}
        </button>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Clock,        label: tr("sumPending"), value: summary.pending },
            { icon: Banknote,     label: tr("sumPayable"), value: `${summary.total_payable_now_lkr.toLocaleString()} LKR` },
            { icon: CalendarClock,label: tr("sumNext"),    value: summary.next_deadline ?? "—" },
            { icon: CreditCard,       label: tr("sumLicence"), value: summary.licences_withheld },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="card flex items-center gap-3 p-4">
              <Icon size={18} className="text-signal shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                <p className="display text-lg font-bold truncate">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {adding && (
        <div className="card space-y-4">
          <p className="font-bold font-display flex items-center gap-2">
            <Plus size={16} className="text-signal" /> {tr("addTitle")}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2">{field("offence", tr("offence"))}</div>
            {field("fine_amount_lkr", tr("amount"), "number")}
            {field("issued_date", tr("issued"), "date")}
            {field("due_date", tr("due"), "date")}
            {field("reference_no", tr("reference"))}
            {field("section", tr("section"))}
            {field("vehicle_no", tr("vehicle"))}
            {field("police_station", tr("station"))}
            {field("officer_no", tr("officer"))}
            {field("place_of_offence", tr("place"))}
            {field("court", tr("court"))}
            {field("court_date", tr("courtDate"), "date")}
            <div className="sm:col-span-2 lg:col-span-3">{field("notes", tr("notes"))}</div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[#f5a623]"
              checked={!!form.licence_withheld}
              onChange={(e) => setForm((f) => ({ ...f, licence_withheld: e.target.checked }))}
            />
            {tr("withheld")}
          </label>
          {formError && <p className="text-xs text-alert">{formError}</p>}
          <div className="flex gap-2">
            <button className="btn-primary" onClick={submit}>{tr("save")}</button>
            <button className="btn-ghost" onClick={() => { setAdding(false); setFormError(""); }}>{tr("cancel")}</button>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Fine list */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex gap-1.5">
            {(["pending", "paid", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${
                  filter === f
                    ? "bg-signal text-asphalt-900 border-signal"
                    : "border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-asphalt-700 dark:text-slate-300 dark:hover:bg-asphalt-700"
                }`}
              >
                {f === "pending" ? tr("pending") : f === "paid" ? tr("paid") : tr("allTab")}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="card flex flex-col items-center justify-center p-10 space-y-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-signal" />
              <p className="text-slate-600 dark:text-slate-300 font-medium">{tr("loading")}</p>
            </div>
          ) : visible.length === 0 ? (
            <div className="card text-center p-8 space-y-3">
              <p className="text-sm text-slate-500">{tr("empty")}</p>
              <Link to="/documents" className="btn-ghost text-sm">
                <ScanLine size={15} /> {tr("scanCta")}
              </Link>
            </div>
          ) : (
            visible.map((f) => (
              <FineCard
                key={f.id}
                fine={f}
                tr={tr}
                onPaid={(id, receipt) => {
                  localStore.update("fines", id, {
                    status: "paid",
                    paid_date: today(),
                    receipt_no: receipt || undefined,
                  });
                }}
                onRecovered={(id) => localStore.update("fines", id, { licence_recovered: true })}
                onDelete={(id) => localStore.remove("fines", id)}
              />
            ))
          )}
        </div>

        {/* Side panels */}
        <div className="lg:col-span-5 space-y-4">
          {/* Late payment calculator */}
          <div className="card space-y-3">
            <div>
              <p className="font-bold font-display text-sm flex items-center gap-2">
                <Calculator size={15} className="text-signal" /> {tr("calcTitle")}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{tr("calcSub")}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label text-xs">{tr("calcAmount")}</label>
                <input className="input py-2 text-sm" type="number" value={calc.amount}
                  onChange={(e) => setCalc((c) => ({ ...c, amount: e.target.value }))} />
              </div>
              <div>
                <label className="label text-xs">{tr("calcIssued")}</label>
                <input className="input py-2 text-sm" type="date" value={calc.issued}
                  onChange={(e) => setCalc((c) => ({ ...c, issued: e.target.value }))} />
              </div>
            </div>
            <button className="btn-primary w-full py-2 text-sm" onClick={runCalc}>{tr("calcRun")}</button>
            {calcResult && (
              <div className="space-y-3 border-t border-slate-100 dark:border-asphalt-700 pt-3">
                <div className={`rounded-xl border p-3 ${URGENCY_STYLE[calcResult.countdown.urgency].box}`}>
                  <p className={`display text-2xl font-bold ${URGENCY_STYLE[calcResult.countdown.urgency].tone}`}>
                    {calcResult.countdown.payable_now_lkr !== null
                      ? `${calcResult.countdown.payable_now_lkr.toLocaleString()} LKR`
                      : tr("stageCourt")}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{calcResult.countdown.message}</p>
                </div>
                <Timeline timeline={calcResult.timeline} current={calcResult.countdown.stage} tr={tr} />
              </div>
            )}
          </div>

          {/* Where to pay */}
          {guide && (
            <div className="card space-y-3">
              <p className="font-bold font-display text-sm flex items-center gap-2">
                <Banknote size={15} className="text-signal" /> {tr("guideTitle")}
              </p>
              <PaymentChannels channels={guide.payment_channels} note={guide.payment_note} />
            </div>
          )}

          {/* Everything on file, as a PDF */}
          <DriverReportCard />

          {/* Nearest post office / police station */}
          <div className="card space-y-2">
            <p className="font-bold font-display text-sm flex items-center gap-2">
              <MapPin size={15} className="text-signal" /> {tr("nearestTitle")}
            </p>
            <Link to="/nearby" className="btn-ghost w-full text-sm">{tr("nearestCta")}</Link>
          </div>

          <div className="card border-slate-200 dark:border-asphalt-700 flex gap-3">
            <Info className="text-slate-400 shrink-0 mt-0.5" size={16} />
            <p className="text-xs text-slate-500">
              Deadlines are worked out from the date you enter. Always check the dates printed on
              the charge sheet itself — this tracker has no legal standing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
