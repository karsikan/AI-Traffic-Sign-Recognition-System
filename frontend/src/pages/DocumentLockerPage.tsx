import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLang } from "@/context/LanguageContext";
import { ComputeApi, LockerApi } from "@/services/api";
import { localStore, onStoreChange } from "@/services/localStore";
import {
  Plus, X, Trash2, CheckCircle2, AlertTriangle, XCircle, Bell,
  FileCheck2, Info, ScanLine, Infinity as InfinityIcon, CalendarClock,
} from "lucide-react";

// ── Trilingual UI labels ─────────────────────────────────────────────────────
const UI = {
  en: {
    title: "Digital Locker",
    sub: "Save the renewal details of every vehicle document. The locker works out how long each one has left and tells you before it expires — not after.",
    add: "Add a document", addTitle: "New document", cancel: "Cancel", save: "Save",
    type: "Document type", label: "Your label", number: "Document no", holder: "Holder name",
    vehicle: "Vehicle no", issuer: "Issued by", issued: "Issued on", expiry: "Expires on",
    remind: "Warn me this many days before", notes: "Notes",
    sumTotal: "Documents", sumAttention: "Need attention", sumValid: "Valid", sumNext: "Next expiry",
    alerts: "Needs attention", alertsNone: "Nothing expiring. Every tracked document is current.",
    empty: "The locker is empty. Add a document, or scan one on the Document Scanner.",
    scanCta: "Scan a document",
    filterAll: "All",
    delete: "Delete", confirmDelete: "Remove this document from the locker?",
    remaining: "days left", expiredAgo: "expired",
    noExpiry: "No expiry", unknownExpiry: "No expiry date saved",
    loading: "Loading the locker…",
    failed: "Could not load. Is the backend running on port 8000?",
    required: "Choose a document type first.",
    reminderNote: "Reminders show here whenever you open the page. Sending them by SMS, WhatsApp or email would need a paid messaging gateway, which this build does not include.",
  },
  ta: {
    title: "டிஜிட்டல் லாக்கர்",
    sub: "ஒவ்வொரு வாகன ஆவணத்தின் புதுப்பித்தல் விவரங்களையும் சேமியுங்கள். எவ்வளவு காலம் மீதம் உள்ளது என்பதை லாக்கர் கணக்கிட்டு, காலாவதியாகும் முன்பே சொல்லும்.",
    add: "ஆவணம் சேர்", addTitle: "புதிய ஆவணம்", cancel: "ரத்து", save: "சேமி",
    type: "ஆவண வகை", label: "உங்கள் பெயரிடல்", number: "ஆவண இலக்கம்", holder: "வைத்திருப்பவர் பெயர்",
    vehicle: "வாகன இலக்கம்", issuer: "வழங்கியவர்", issued: "வழங்கிய திகதி", expiry: "காலாவதி திகதி",
    remind: "இத்தனை நாட்களுக்கு முன் எச்சரி", notes: "குறிப்புகள்",
    sumTotal: "ஆவணங்கள்", sumAttention: "கவனம் தேவை", sumValid: "செல்லுபடியானவை", sumNext: "அடுத்த காலாவதி",
    alerts: "கவனம் தேவை", alertsNone: "எதுவும் காலாவதியாகவில்லை. அனைத்து ஆவணங்களும் செல்லுபடியாகும்.",
    empty: "லாக்கர் காலியாக உள்ளது. ஆவணம் சேர்க்கவும், அல்லது Document Scanner-ல் ஸ்கேன் செய்யவும்.",
    scanCta: "ஆவணத்தை ஸ்கேன் செய்",
    filterAll: "அனைத்தும்",
    delete: "நீக்கு", confirmDelete: "இந்த ஆவணத்தை லாக்கரிலிருந்து நீக்கவா?",
    remaining: "நாட்கள் மீதம்", expiredAgo: "காலாவதியானது",
    noExpiry: "காலாவதி இல்லை", unknownExpiry: "காலாவதி திகதி சேமிக்கப்படவில்லை",
    loading: "லாக்கர் ஏற்றப்படுகிறது…",
    failed: "ஏற்ற முடியவில்லை. Backend port 8000-ல் இயங்குகிறதா?",
    required: "முதலில் ஆவண வகையைத் தேர்வு செய்யுங்கள்.",
    reminderNote: "பக்கத்தைத் திறக்கும்போது நினைவூட்டல்கள் இங்கே தெரியும். SMS / WhatsApp / Email ஆக அனுப்ப paid messaging gateway தேவை — இந்த build-ல் அது இல்லை.",
  },
  si: {
    title: "ඩිජිටල් ලොකරය",
    sub: "සෑම වාහන ලේඛනයකම අලුත් කිරීමේ විස්තර සුරකින්න. ලොකරය එක් එක් ලේඛනයට ඉතිරි කාලය ගණනය කර, කල් ඉකුත්වීමට පෙර ඔබට දන්වයි.",
    add: "ලේඛනයක් එක් කරන්න", addTitle: "නව ලේඛනය", cancel: "අවලංගු", save: "සුරකින්න",
    type: "ලේඛන වර්ගය", label: "ඔබේ නම", number: "ලේඛන අංකය", holder: "හිමිකරුගේ නම",
    vehicle: "වාහන අංකය", issuer: "නිකුත් කළේ", issued: "නිකුත් කළ දිනය", expiry: "කල් ඉකුත්වන දිනය",
    remind: "දින කීයකට පෙර දැනුම් දෙන්නද", notes: "සටහන්",
    sumTotal: "ලේඛන", sumAttention: "අවධානය අවශ්‍යයි", sumValid: "වලංගු", sumNext: "ඊළඟ කල් ඉකුත්වීම",
    alerts: "අවධානය අවශ්‍යයි", alertsNone: "කිසිවක් කල් ඉකුත් වන්නේ නැත. සියලු ලේඛන වලංගුයි.",
    empty: "ලොකරය හිස්ය. ලේඛනයක් එක් කරන්න, නැතහොත් Document Scanner හි ස්කෑන් කරන්න.",
    scanCta: "ලේඛනය ස්කෑන් කරන්න",
    filterAll: "සියල්ල",
    delete: "මකන්න", confirmDelete: "මෙම ලේඛනය ලොකරයෙන් ඉවත් කරන්නද?",
    remaining: "දින ඉතිරියි", expiredAgo: "කල් ඉකුත් විය",
    noExpiry: "කල් ඉකුත්වීමක් නැත", unknownExpiry: "කල් ඉකුත්වන දිනය සුරකා නැත",
    loading: "ලොකරය පූරණය වෙමින්…",
    failed: "පූරණය කළ නොහැකි විය. Backend port 8000 හි ක්‍රියාත්මකද?",
    required: "පළමුව ලේඛන වර්ගය තෝරන්න.",
    reminderNote: "පිටුව විවෘත කරන විට මතක් කිරීම් මෙහි පෙන්වයි. SMS / WhatsApp / Email එවීමට ගෙවන messaging gateway එකක් අවශ්‍යයි — මෙම build එකේ එය නැත.",
  },
};

type LabelKey = keyof typeof UI.en;

// Same vocabulary the Document Scanner uses, so both pages read alike.
const STATUS_STYLE: Record<string, { box: string; tone: string; bar: string; icon: any }> = {
  valid:          { box: "border-go/40 bg-go/5",         tone: "text-go",       bar: "bg-go",        icon: CheckCircle2 },
  expiring:       { box: "border-signal/40 bg-signal/5", tone: "text-signal",   bar: "bg-signal",    icon: AlertTriangle },
  expired:        { box: "border-alert/40 bg-alert/5",   tone: "text-alert",    bar: "bg-alert",     icon: XCircle },
  not_applicable: { box: "border-slate-300 dark:border-asphalt-700", tone: "text-slate-500", bar: "bg-slate-400", icon: InfinityIcon },
  unknown:        { box: "border-slate-300 dark:border-asphalt-700", tone: "text-slate-500", bar: "bg-slate-400", icon: AlertTriangle },
};

function DocumentCard({ doc, tr, onDelete }: {
  doc: any; tr: (k: LabelKey) => string; onDelete: (id: number) => void;
}) {
  const e = doc.expiry;
  const style = STATUS_STYLE[e.status] ?? STATUS_STYLE.unknown;
  const Icon = style.icon;

  const headline =
    e.status === "not_applicable" ? tr("noExpiry")
    : e.status === "unknown" ? tr("unknownExpiry")
    : e.days_remaining < 0 ? `${Math.abs(e.days_remaining)} ${tr("remaining")} — ${tr("expiredAgo")}`
    : `${e.days_remaining} ${tr("remaining")}`;

  return (
    <div className={`card space-y-3 ${style.box}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug">{doc.label || doc.doc_label}</p>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500">
            {doc.label && <span>{doc.doc_label}</span>}
            {doc.document_no && <span>· #{doc.document_no}</span>}
            {doc.vehicle_no && <span>· {doc.vehicle_no}</span>}
            {doc.expiry_date && <span>· {tr("expiry")} {doc.expiry_date}</span>}
          </div>
        </div>
        <button
          className="btn-ghost shrink-0 px-2 py-1 text-alert border-alert/30"
          aria-label={tr("delete")}
          onClick={() => { if (window.confirm(tr("confirmDelete"))) onDelete(doc.id); }}
        >
          <Trash2 size={13} />
        </button>
      </div>

      <div className="flex items-start gap-2">
        <Icon size={16} className={`${style.tone} shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0 space-y-1.5">
          <p className={`text-sm font-bold ${style.tone}`}>{headline}</p>
          <p className="text-xs text-slate-600 dark:text-slate-300">{e.message}</p>
          {e.percent_elapsed !== null && (
            <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-asphalt-700 overflow-hidden">
              <div className={`h-full rounded-full ${style.bar}`}
                style={{ width: `${Math.min(100, e.percent_elapsed)}%` }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DocumentLockerPage() {
  const { lang } = useLang();
  const tr = (k: LabelKey): string => UI[(lang as "en" | "ta" | "si")]?.[k] ?? UI.en[k];

  const [docs, setDocs] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [types, setTypes] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any>(null);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({ remind_days_before: 30 });
  const [formError, setFormError] = useState("");

  /** Documents live on this device; the expiry bands are computed from them. */
  const load = async () => {
    const stored = localStore.list("documents");
    try {
      const res = await ComputeApi.documents(stored);
      const derived = new Map(res.documents.map((d: any) => [d.id, d]));
      setDocs(stored.map((d) => ({ ...d, ...(derived.get(d.id) as object ?? {}) })));
      setSummary(res.summary);
      setAlerts(res.alerts);
      setError(false);
    } catch {
      setDocs(stored);
      setSummary(null);
      setAlerts(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    LockerApi.types().then(setTypes).catch(() => setTypes([]));
    return onStoreChange(load);
  }, []);

  const submit = async () => {
    if (!form.doc_type) {
      setFormError(tr("required"));
      return;
    }
    try {
      const payload: Record<string, any> = { ...form, remind_days_before: Number(form.remind_days_before) || 30 };
      localStore.create("documents", payload);
      setForm({ remind_days_before: 30 });
      setFormError("");
      setAdding(false);
    } catch (e: any) {
      setFormError(e.message || "Could not save.");
    }
  };

  const remove = (id: number) => { localStore.remove("documents", id); };

  const visible = filter === "all" ? docs : docs.filter((d) => d.doc_type === filter);
  const presentTypes = types.filter((t) => docs.some((d) => d.doc_type === t.key));

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

      {summary && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: FileCheck2,   label: tr("sumTotal"),     value: summary.total },
            { icon: Bell,         label: tr("sumAttention"), value: summary.needs_attention },
            { icon: CheckCircle2, label: tr("sumValid"),     value: summary.valid },
            { icon: CalendarClock,label: tr("sumNext"),      value: summary.next_expiry ?? "—" },
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
            <div>
              <label className="label text-xs">{tr("type")}</label>
              <select
                className="input py-2 text-sm"
                value={form.doc_type ?? ""}
                onChange={(e) => {
                  const key = e.target.value;
                  const spec = types.find((t) => t.key === key);
                  setForm((f) => ({ ...f, doc_type: key, remind_days_before: spec?.default_remind_days ?? 30 }));
                }}
              >
                <option value="">—</option>
                {types.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>
            {field("label", tr("label"))}
            {field("document_no", tr("number"))}
            {field("holder_name", tr("holder"))}
            {field("vehicle_no", tr("vehicle"))}
            {field("issuer", tr("issuer"))}
            {field("issued_date", tr("issued"), "date")}
            {field("expiry_date", tr("expiry"), "date")}
            {field("remind_days_before", tr("remind"), "number")}
            <div className="sm:col-span-2 lg:col-span-3">{field("notes", tr("notes"))}</div>
          </div>
          {formError && <p className="text-xs text-alert">{formError}</p>}
          <div className="flex gap-2">
            <button className="btn-primary" onClick={submit}>{tr("save")}</button>
            <button className="btn-ghost" onClick={() => { setAdding(false); setFormError(""); }}>{tr("cancel")}</button>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Documents */}
        <div className="lg:col-span-7 space-y-4">
          {presentTypes.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setFilter("all")}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${
                  filter === "all"
                    ? "bg-signal text-asphalt-900 border-signal"
                    : "border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-asphalt-700 dark:text-slate-300 dark:hover:bg-asphalt-700"
                }`}
              >
                {tr("filterAll")} ({docs.length})
              </button>
              {presentTypes.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setFilter(t.key)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${
                    filter === t.key
                      ? "bg-signal text-asphalt-900 border-signal"
                      : "border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-asphalt-700 dark:text-slate-300 dark:hover:bg-asphalt-700"
                  }`}
                >
                  {t.label} ({docs.filter((d) => d.doc_type === t.key).length})
                </button>
              ))}
            </div>
          )}

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
            visible.map((d) => <DocumentCard key={d.id} doc={d} tr={tr} onDelete={remove} />)
          )}
        </div>

        {/* Alerts */}
        <div className="lg:col-span-5 space-y-4">
          <div className="card space-y-3">
            <p className="font-bold font-display text-sm flex items-center gap-2">
              <Bell size={15} className="text-signal" /> {tr("alerts")}
              {alerts?.count > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-alert/10 text-alert border-alert/30">
                  {alerts.count}
                </span>
              )}
            </p>
            {!alerts || alerts.count === 0 ? (
              <p className="text-xs text-slate-500 flex items-center gap-2">
                <CheckCircle2 size={14} className="text-go shrink-0" /> {tr("alertsNone")}
              </p>
            ) : (
              <div className="space-y-2">
                {[...alerts.expired, ...alerts.expiring].map((d: any) => {
                  const style = STATUS_STYLE[d.expiry.status];
                  return (
                    <div key={d.id} className={`rounded-xl border p-3 ${style.box}`}>
                      <p className="text-xs font-semibold">{d.label || d.doc_label}</p>
                      <p className={`text-xs font-bold mt-0.5 ${style.tone}`}>
                        {d.expiry.days_remaining < 0
                          ? `${Math.abs(d.expiry.days_remaining)} ${tr("remaining")} — ${tr("expiredAgo")}`
                          : `${d.expiry.days_remaining} ${tr("remaining")}`}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{d.expiry.message}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card border-slate-200 dark:border-asphalt-700 flex gap-3">
            <Info className="text-slate-400 shrink-0 mt-0.5" size={16} />
            <p className="text-xs text-slate-500">{tr("reminderNote")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
