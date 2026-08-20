import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLang } from "@/context/LanguageContext";
import { ComputeApi, DemeritApi } from "@/services/api";
import { localStore, onStoreChange } from "@/services/localStore";
import {
  Plus, X, Trash2, ShieldAlert, AlertTriangle, Info, TrendingDown,
  Gauge, CalendarClock, Banknote,
} from "lucide-react";

// ── Trilingual UI labels ─────────────────────────────────────────────────────
const UI = {
  en: {
    title: "Demerit Points",
    sub: "You start with an allowance of 24 points and offences deduct from it. Lose all 24 within two years and the licence is cancelled for at least a year — this shows what is left and when deductions expire.",
    add: "Add an offence", addTitle: "Record an offence", cancel: "Cancel", save: "Save",
    pick: "Pick an offence", custom: "Or type your own", offence: "Offence",
    points: "Points", date: "Date of offence", vehicle: "Vehicle no", notes: "Notes",
    balance: "Points left", threshold: "Allowance", toSuspension: "Points deducted",
    nextDrop: "Next points drop",
    records: "Recorded offences", empty: "No offences recorded. Your balance is clear.",
    active: "Counting", expired: "Dropped off",
    delete: "Delete", confirmDelete: "Remove this record?",
    tiers: "What the bands mean",
    guideCta: "See every offence and its points",
    loading: "Loading your record…",
    failed: "Could not load. Is the backend running on port 8000?",
    required: "An offence, its points and the date are required.",
  },
  ta: {
    title: "குறைப் புள்ளிகள்",
    sub: "நீங்கள் 24 புள்ளிகளுடன் தொடங்குகிறீர்கள்; ஒவ்வொரு குற்றமும் அதிலிருந்து கழிக்கப்படும். இரண்டு வருடங்களில் 24-ம் தீர்ந்தால் உரிமம் குறைந்தது ஒரு வருடத்துக்கு ரத்து — எவ்வளவு மீதம், கழிவுகள் எப்போது நீங்கும் என்பதை இது காட்டும்.",
    add: "குற்றம் சேர்", addTitle: "குற்றத்தைப் பதிவு செய்", cancel: "ரத்து", save: "சேமி",
    pick: "குற்றத்தைத் தேர்ந்தெடு", custom: "அல்லது நீங்களே எழுதுங்கள்", offence: "குற்றம்",
    points: "புள்ளிகள்", date: "குற்றம் நடந்த திகதி", vehicle: "வாகன இலக்கம்", notes: "குறிப்புகள்",
    balance: "மீதமுள்ள புள்ளிகள்", threshold: "மொத்த அனுமதி", toSuspension: "கழிக்கப்பட்டது",
    nextDrop: "அடுத்து புள்ளி நீங்கும்",
    records: "பதிவான குற்றங்கள்", empty: "குற்றம் எதுவும் பதிவாகவில்லை. உங்கள் பதிவு தெளிவாக உள்ளது.",
    active: "கணக்கில் உள்ளது", expired: "நீங்கிவிட்டது",
    delete: "நீக்கு", confirmDelete: "இந்தப் பதிவை நீக்கவா?",
    tiers: "நிலைகளின் பொருள்",
    guideCta: "அனைத்துக் குற்றங்களையும் புள்ளிகளையும் பார்",
    loading: "உங்கள் பதிவு ஏற்றப்படுகிறது…",
    failed: "ஏற்ற முடியவில்லை. Backend port 8000-ல் இயங்குகிறதா?",
    required: "குற்றம், புள்ளிகள், திகதி அவசியம்.",
  },
  si: {
    title: "දඩ ලකුණු",
    sub: "ඔබ ලකුණු 24කින් ආරම්භ කරයි; සෑම වරදක් සඳහාම ඉන් ලකුණු අඩු වේ. වසර දෙකක් තුළ ලකුණු 24ම අවසන් වුවහොත් බලපත්‍රය අවම වශයෙන් වසරකට අවලංගු වේ — ඉතිරි කීයද සහ අඩුකිරීම් ඉවත්වන්නේ කවදාද යන්න මෙයින් පෙන්වයි.",
    add: "වරදක් එක් කරන්න", addTitle: "වරදක් සටහන් කරන්න", cancel: "අවලංගු", save: "සුරකින්න",
    pick: "වරදක් තෝරන්න", custom: "නැතහොත් ඔබම ලියන්න", offence: "වරද",
    points: "ලකුණු", date: "වරද සිදුවූ දිනය", vehicle: "වාහන අංකය", notes: "සටහන්",
    balance: "ඉතිරි ලකුණු", threshold: "මුළු අනුමතය", toSuspension: "අඩු කළ ලකුණු",
    nextDrop: "ඊළඟට ලකුණු ඉවත්වීම",
    records: "සටහන් වූ වැරදි", empty: "වැරදි සටහන් වී නැත. ඔබේ වාර්තාව පිරිසිදුයි.",
    active: "ගණන් ගැනේ", expired: "ඉවත් විය",
    delete: "මකන්න", confirmDelete: "මෙම වාර්තාව ඉවත් කරන්නද?",
    tiers: "මට්ටම්වල අර්ථය",
    guideCta: "සියලු වැරදි සහ ලකුණු බලන්න",
    loading: "ඔබේ වාර්තාව පූරණය වෙමින්…",
    failed: "පූරණය කළ නොහැකි විය. Backend port 8000 හි ක්‍රියාත්මකද?",
    required: "වරද, ලකුණු සහ දිනය අවශ්‍යයි.",
  },
};

type LabelKey = keyof typeof UI.en;

const TIER_STYLE: Record<string, { box: string; tone: string; bar: string }> = {
  safe:      { box: "border-go/40 bg-go/5",                 tone: "text-go",         bar: "bg-go" },
  caution:   { box: "border-signal/40 bg-signal/5",         tone: "text-signal",     bar: "bg-signal" },
  warning:   { box: "border-orange-500/40 bg-orange-500/5", tone: "text-orange-500", bar: "bg-orange-500" },
  suspended: { box: "border-alert/40 bg-alert/5",           tone: "text-alert",      bar: "bg-alert" },
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function DemeritPage() {
  const { lang } = useLang();
  const tr = (k: LabelKey): string => UI[(lang as "en" | "ta" | "si")]?.[k] ?? UI.en[k];

  const [balance, setBalance] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [catalogue, setCatalogue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({ offence_date: today(), points: 1 });
  const [formError, setFormError] = useState("");

  /** Records live on this device; the rolling balance is computed from them. */
  const load = async () => {
    const stored = localStore.list("demerit");
    try {
      const res = await ComputeApi.demerit(stored);
      setBalance(res.balance);
      setRecords(res.records);
      setError(false);
    } catch {
      setRecords(stored);
      setBalance(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    DemeritApi.catalogue().then(setCatalogue).catch(() => setCatalogue([]));
    return onStoreChange(load);
  }, []);

  const submit = async () => {
    if (!form.offence || form.points === "" || !form.offence_date) {
      setFormError(tr("required"));
      return;
    }
    try {
      const payload: Record<string, any> = { ...form, points: Number(form.points) };
      localStore.create("demerit", payload);
      setForm({ offence_date: today(), points: 1 });
      setFormError("");
      setAdding(false);
    } catch (e: any) {
      setFormError(e.message || "Could not save.");
    }
  };

  const remove = (id: number) => { localStore.remove("demerit", id); };

  if (error) {
    return (
      <div className="card border-alert/30 bg-alert/5 flex items-start gap-3">
        <AlertTriangle className="text-alert shrink-0 mt-0.5" size={18} />
        <p className="text-sm text-slate-600 dark:text-slate-300">{tr("failed")}</p>
      </div>
    );
  }

  if (loading || !balance) {
    return (
      <div className="card flex flex-col items-center justify-center p-10 space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-signal" />
        <p className="text-slate-600 dark:text-slate-300 font-medium">{tr("loading")}</p>
      </div>
    );
  }

  const style = TIER_STYLE[balance.status] ?? TIER_STYLE.safe;

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

      {/* Balance */}
      <div className={`card space-y-4 ${style.box}`}>
        <div className="flex items-start gap-4">
          <ShieldAlert size={26} className={`${style.tone} shrink-0 mt-1`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              {/* Points remaining, not points collected — the scheme deducts from an
                  allowance, so the number a driver cares about is what is left. */}
              <span className={`display text-5xl font-bold ${style.tone}`}>
                {balance.points_remaining ?? balance.threshold - balance.total_points}
              </span>
              <span className="text-sm text-slate-500">/ {balance.allowance ?? balance.threshold}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ml-2 ${style.box} ${style.tone}`}>
                {balance.tier_label}
              </span>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-200 mt-1.5">{balance.headline}</p>
            <p className="text-xs text-slate-500 mt-1">{balance.advice}</p>
            {/* The scheme is announced but not yet enforced nationwide. Saying so here
                stops the page reading as a record of official standing. */}
            {balance.scheme_status_note && (
              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">{balance.scheme_status_note}</p>
            )}
          </div>
        </div>

        <div className="h-3 w-full rounded-full bg-slate-200 dark:bg-asphalt-700 overflow-hidden">
          <div className={`h-full rounded-full transition-all ${style.bar}`}
            style={{ width: `${balance.percent_of_threshold}%` }} />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: Gauge,        label: tr("toSuspension"), value: balance.points_deducted ?? balance.total_points },
            { icon: TrendingDown, label: tr("active"),       value: balance.active_records },
            {
              icon: CalendarClock,
              label: tr("nextDrop"),
              value: balance.next_drop ? `${balance.next_drop.points} pts · ${balance.next_drop.date}` : "—",
            },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-2.5 rounded-xl bg-white/60 dark:bg-asphalt-800/60 p-3">
              <Icon size={16} className="text-signal shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                <p className="text-sm font-bold truncate">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add form */}
      {adding && (
        <div className="card space-y-4">
          <p className="font-bold font-display flex items-center gap-2">
            <Plus size={16} className="text-signal" /> {tr("addTitle")}
          </p>

          <div>
            <label className="label text-xs">{tr("pick")}</label>
            <select
              className="input py-2 text-sm"
              value={form.violation_id ?? ""}
              onChange={(e) => {
                const picked = catalogue.find((c) => c.id === e.target.value);
                setForm((f) => picked
                  ? { ...f, violation_id: picked.id, offence: picked.offence, section: picked.section, points: picked.points }
                  : { ...f, violation_id: "" });
              }}
            >
              <option value="">—</option>
              {catalogue.map((c) => (
                <option key={c.id} value={c.id}>{c.offence} · {c.points} pts</option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="label text-xs">{tr("offence")}</label>
              <input className="input py-2 text-sm" value={form.offence ?? ""}
                placeholder={tr("custom")}
                onChange={(e) => setForm((f) => ({ ...f, offence: e.target.value }))} />
            </div>
            <div>
              <label className="label text-xs">{tr("points")}</label>
              <input className="input py-2 text-sm" type="number" min={0} max={24} value={form.points ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, points: e.target.value }))} />
            </div>
            <div>
              <label className="label text-xs">{tr("date")}</label>
              <input className="input py-2 text-sm" type="date" value={form.offence_date ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, offence_date: e.target.value }))} />
            </div>
            <div>
              <label className="label text-xs">{tr("vehicle")}</label>
              <input className="input py-2 text-sm" value={form.vehicle_no ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, vehicle_no: e.target.value }))} />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="label text-xs">{tr("notes")}</label>
              <input className="input py-2 text-sm" value={form.notes ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>

          {formError && <p className="text-xs text-alert">{formError}</p>}
          <div className="flex gap-2">
            <button className="btn-primary" onClick={submit}>{tr("save")}</button>
            <button className="btn-ghost" onClick={() => { setAdding(false); setFormError(""); }}>{tr("cancel")}</button>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Records */}
        <div className="lg:col-span-7 space-y-3">
          <p className="font-bold font-display text-sm">{tr("records")}</p>
          {records.length === 0 ? (
            <div className="card text-center p-8 text-sm text-slate-500">{tr("empty")}</div>
          ) : (
            records.map((r) => (
              <div key={r.id} className={`card p-4 flex items-start gap-3 ${r.active ? "" : "opacity-60"}`}>
                <span className={`shrink-0 display text-xl font-bold w-10 text-center ${
                  r.points >= 6 ? "text-alert" : r.points >= 3 ? "text-signal" : "text-slate-500"
                }`}>
                  {r.points}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-snug">{r.offence}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500">
                    <span>{r.offence_date}</span>
                    {r.section && <span>· {r.section}</span>}
                    {r.vehicle_no && <span>· {r.vehicle_no}</span>}
                    <span className={`font-bold px-1.5 py-0.5 rounded-full border ${
                      r.active ? "bg-signal/10 text-signal border-signal/30" : "bg-slate-100 text-slate-500 border-slate-300 dark:bg-asphalt-700 dark:border-asphalt-700"
                    }`}>
                      {r.active ? tr("active") : tr("expired")}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">{r.message}</p>
                </div>
                <button
                  className="btn-ghost shrink-0 px-2 py-1 text-alert border-alert/30"
                  aria-label={tr("delete")}
                  onClick={() => { if (window.confirm(tr("confirmDelete"))) remove(r.id); }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Bands + links */}
        <div className="lg:col-span-5 space-y-4">
          <div className="card space-y-3">
            <p className="font-bold font-display text-sm flex items-center gap-2">
              <Gauge size={15} className="text-signal" /> {tr("tiers")}
            </p>
            {/* Defensive: a backend hiccup should cost this panel, not the whole page. */}
            {(balance.tiers ?? []).map((t: any) => {
              const s = TIER_STYLE[t.status] ?? TIER_STYLE.safe;
              const current = t.status === balance.status;
              return (
                <div key={t.status} className={`flex gap-3 rounded-xl p-2 ${current ? s.box + " border" : ""}`}>
                  <span className={`w-1 rounded-full shrink-0 ${s.bar}`} />
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${s.tone}`}>
                      {t.from_points}{t.to_points !== null ? `–${t.to_points}` : "+"} · {t.label}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{t.advice}</p>
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-slate-500 italic border-t border-slate-100 dark:border-asphalt-700 pt-2">
              {balance.note}
            </p>
          </div>

          <div className="card space-y-2">
            <p className="font-bold font-display text-sm flex items-center gap-2">
              <Banknote size={15} className="text-signal" /> {tr("guideCta")}
            </p>
            <Link to="/fines" className="btn-ghost w-full text-sm">{tr("guideCta")}</Link>
          </div>

          <div className="card border-slate-200 dark:border-asphalt-700 flex gap-3">
            <Info className="text-slate-400 shrink-0 mt-0.5" size={16} />
            <p className="text-xs text-slate-500">{balance.disclaimer}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
