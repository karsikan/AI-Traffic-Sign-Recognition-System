import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useLang } from "@/context/LanguageContext";
import { FineApi } from "@/services/api";
import {
  Search, ChevronDown, Banknote, Gavel, ShieldAlert, AlertTriangle,
  Info, Scale, CircleDollarSign, X, TrendingUp, Clock,
} from "lucide-react";

// ── Trilingual UI labels (content itself comes from the API in English) ───────
const UI = {
  en: {
    title: "Fine & Violation Guide",
    sub: "Every common traffic offence in Sri Lanka — the fine, the demerit points, the Motor Traffic Act section, and whether you can settle it at a post office or must go to court.",
    search: "Search an offence, a section number, or a keyword…",
    all: "All", results: "offences", noResults: "No offence matches that search.",
    clear: "Clear",
    fine: "Fine", points: "Demerit points", section: "Section",
    spot: "Spot fine", court: "Court only", either: "Spot fine or court",
    withheld: "Licence withheld", suspension: "Suspension risk",
    lowest: "Lowest fine", highest: "Highest fine", courtOnly: "Court-only offences",
    total: "Offences listed",
    demeritTitle: "Demerit Points System",
    windowTitle: "How long you have to pay",
    convertTitle: "Convert a fine to another currency",
    convertCta: "Open the currency calculator",
    loading: "Loading the violation guide…",
    failed: "Could not load the guide. Is the backend running on port 8000?",
    day: "Day",
    pts: "pts",
  },
  ta: {
    title: "அபராதம் & விதிமீறல் வழிகாட்டி",
    sub: "இலங்கையின் பொதுவான போக்குவரத்து குற்றங்கள் அனைத்தும் — அபராதத் தொகை, குறைப் புள்ளிகள், சட்டப் பிரிவு, மற்றும் தபால் அலுவலகத்தில் செலுத்தலாமா அல்லது நீதிமன்றம் செல்ல வேண்டுமா என்பது.",
    search: "குற்றம், பிரிவு எண், அல்லது ஒரு சொல்லைத் தேடுங்கள்…",
    all: "அனைத்தும்", results: "குற்றங்கள்", noResults: "அந்தத் தேடலுக்கு எந்தக் குற்றமும் பொருந்தவில்லை.",
    clear: "அழி",
    fine: "அபராதம்", points: "குறைப் புள்ளிகள்", section: "பிரிவு",
    spot: "உடனடி அபராதம்", court: "நீதிமன்றம் மட்டும்", either: "அபராதம் அல்லது நீதிமன்றம்",
    withheld: "உரிமம் பறிமுதல்", suspension: "இடைநிறுத்த அபாயம்",
    lowest: "குறைந்த அபராதம்", highest: "அதிக அபராதம்", courtOnly: "நீதிமன்றக் குற்றங்கள்",
    total: "பட்டியலிடப்பட்ட குற்றங்கள்",
    demeritTitle: "குறைப் புள்ளி முறைமை",
    windowTitle: "செலுத்த எவ்வளவு கால அவகாசம்",
    convertTitle: "அபராதத்தை வேறு நாணயமாக மாற்று",
    convertCta: "நாணய கணிப்பானைத் திற",
    loading: "விதிமீறல் வழிகாட்டி ஏற்றப்படுகிறது…",
    failed: "வழிகாட்டியை ஏற்ற முடியவில்லை. Backend port 8000-ல் இயங்குகிறதா?",
    day: "நாள்",
    pts: "புள்ளி",
  },
  si: {
    title: "දඩ සහ නීති උල්ලංඝන මාර්ගෝපදේශය",
    sub: "ශ්‍රී ලංකාවේ සුලභ රථවාහන වැරදි සියල්ල — දඩ මුදල, දඩ ලකුණු, නීති වගන්තිය, සහ තැපැල් කාර්යාලයෙන් ගෙවිය හැකිද නැතහොත් අධිකරණයට යා යුතුද යන්න.",
    search: "වරදක්, වගන්ති අංකයක් හෝ වචනයක් සොයන්න…",
    all: "සියල්ල", results: "වැරදි", noResults: "එම සෙවීමට ගැළපෙන වරදක් නැත.",
    clear: "මකන්න",
    fine: "දඩය", points: "දඩ ලකුණු", section: "වගන්තිය",
    spot: "ක්ෂණික දඩය", court: "අධිකරණය පමණි", either: "දඩය හෝ අධිකරණය",
    withheld: "බලපත්‍රය රඳවා ගැනීම", suspension: "අත්හිටුවීමේ අවදානම",
    lowest: "අවම දඩය", highest: "උපරිම දඩය", courtOnly: "අධිකරණ වැරදි",
    total: "ලැයිස්තුගත වැරදි",
    demeritTitle: "දඩ ලකුණු ක්‍රමය",
    windowTitle: "ගෙවීමට ඇති කාලය",
    convertTitle: "දඩය වෙනත් මුදල් ඒකකයකට",
    convertCta: "මුදල් පරිවර්තකය විවෘත කරන්න",
    loading: "මාර්ගෝපදේශය පූරණය වෙමින්…",
    failed: "මාර්ගෝපදේශය පූරණය කළ නොහැකි විය. Backend port 8000 හි ක්‍රියාත්මකද?",
    day: "දිනය",
    pts: "ලකුණු",
  },
};

// ── Badges ────────────────────────────────────────────────────────────────────
const PAYABLE_STYLE: Record<string, string> = {
  spot:   "bg-go/10 text-go border-go/30",
  either: "bg-signal/10 text-signal border-signal/30",
  court:  "bg-alert/10 text-alert border-alert/30",
};

const LICENCE_STYLE: Record<string, string> = {
  withheld:   "bg-signal/10 text-signal border-signal/30",
  suspension: "bg-alert/10 text-alert border-alert/30",
};

const TIER_STYLE: Record<string, { bar: string; text: string }> = {
  safe:      { bar: "bg-go",      text: "text-go" },
  caution:   { bar: "bg-signal",  text: "text-signal" },
  warning:   { bar: "bg-orange-500", text: "text-orange-500" },
  suspended: { bar: "bg-alert",   text: "text-alert" },
};

const STAGE_STYLE: Record<string, { box: string; tone: string; bar: string }> = {
  normal: { box: "border-go/40 bg-go/5",         tone: "text-go",     bar: "bg-go" },
  double: { box: "border-signal/40 bg-signal/5", tone: "text-signal", bar: "bg-signal" },
  court:  { box: "border-alert/40 bg-alert/5",   tone: "text-alert",  bar: "bg-alert" },
};

function PointsPill({ points, label }: { points: number; label: string }) {
  if (points === 0) {
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-slate-100 text-slate-500 border-slate-300 dark:bg-asphalt-700 dark:border-asphalt-700">0 {label}</span>;
  }
  const cls =
    points >= 6 ? "bg-alert/10 text-alert border-alert/30"
    : points >= 3 ? "bg-signal/10 text-signal border-signal/30"
    : "bg-slate-100 text-slate-600 border-slate-300 dark:bg-asphalt-700 dark:text-slate-300 dark:border-asphalt-700";
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${cls}`}>{points} {label}</span>;
}

// ── One offence, collapsible ──────────────────────────────────────────────────
function ViolationCard({ v, tr }: { v: any; tr: (k: keyof typeof UI.en) => string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card p-0 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-start justify-between gap-3 p-4 text-left hover:bg-slate-50 dark:hover:bg-asphalt-700/40 transition-colors"
      >
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="font-semibold text-slate-800 dark:text-slate-100 leading-snug">{v.offence}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${PAYABLE_STYLE[v.payable]}`}>
              {tr(v.payable as "spot" | "court" | "either")}
            </span>
            <PointsPill points={v.demerit_points} label={tr("pts")} />
            {v.licence !== "none" && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${LICENCE_STYLE[v.licence]}`}>
                {v.licence === "withheld" ? tr("withheld") : tr("suspension")}
              </span>
            )}
            <span className="text-[10px] text-slate-400 font-medium">
              {tr("section")} {v.section}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="display text-lg font-bold text-signal whitespace-nowrap">
            {v.fine_lkr.toLocaleString()}
          </span>
          <ChevronDown size={16} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>
      {open && (
        <div className="border-t border-slate-100 dark:border-asphalt-700 p-4 space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-300">{v.note}</p>

          {/* Say plainly where the amount came from. An unconfirmed figure shown with the
              same authority as a gazetted one is how a driver ends up at a post office
              counter with the wrong money. */}
          {v.amount_status === "unverified" ? (
            <p className="text-[11px] leading-relaxed text-signal flex items-start gap-1.5">
              <AlertTriangle size={13} className="shrink-0 mt-0.5" />
              <span>Amount not yet confirmed against the gazette — treat as indicative only.</span>
            </p>
          ) : (
            v.amount_source && (
              <p className="text-[11px] leading-relaxed text-slate-400">Source: {v.amount_source}</p>
            )
          )}
          <dl className="grid grid-cols-3 gap-3 text-center">
            {/* Spot fine and court fine are separate schedules with very different
                amounts, so show whichever ones this offence actually has rather than
                one figure that could be read as either. */}
            <div className="rounded-xl bg-slate-50 dark:bg-asphalt-700/40 p-2.5">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {v.spot_fine_lkr != null ? "Spot fine" : tr("fine")}
              </dt>
              <dd className="text-sm font-bold text-slate-700 dark:text-slate-200 mt-0.5">
                {v.spot_fine_lkr != null
                  ? `${v.spot_fine_lkr.toLocaleString()} LKR`
                  : v.court_fine_lkr
                    ? `${v.court_fine_lkr[0].toLocaleString()}–${v.court_fine_lkr[1].toLocaleString()} LKR`
                    : `${v.fine_lkr.toLocaleString()} LKR`}
              </dd>
              {v.spot_fine_lkr != null && v.court_fine_lkr && (
                <dd className="text-[10px] text-slate-500 mt-1">
                  Court: {v.court_fine_lkr[0].toLocaleString()}–{v.court_fine_lkr[1].toLocaleString()}
                </dd>
              )}
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-asphalt-700/40 p-2.5">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{tr("points")}</dt>
              <dd className="text-sm font-bold text-slate-700 dark:text-slate-200 mt-0.5">{v.demerit_points}</dd>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-asphalt-700/40 p-2.5">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{tr("section")}</dt>
              <dd className="text-sm font-bold text-slate-700 dark:text-slate-200 mt-0.5">{v.section}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}

export default function FineGuidePage() {
  const { lang } = useLang();
  const tr = (k: keyof typeof UI.en) => UI[(lang as "en" | "ta" | "si")]?.[k] ?? UI.en[k];

  const [data, setData] = useState<any>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  useEffect(() => {
    FineApi.violations().then(setData).catch(() => setError(true));
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    const needle = query.trim().toLowerCase();
    return data.violations.filter((v: any) => {
      if (category !== "all" && v.category !== category) return false;
      if (!needle) return true;
      return (
        v.offence.toLowerCase().includes(needle) ||
        v.section.toLowerCase().includes(needle) ||
        v.note.toLowerCase().includes(needle)
      );
    });
  }, [data, query, category]);

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

  const { summary, categories, demerit_system: demerit, payment_window: window, disclaimer } = data;
  const counts: Record<string, number> = data.violations.reduce(
    (acc: Record<string, number>, v: any) => ({ ...acc, [v.category]: (acc[v.category] ?? 0) + 1 }),
    {}
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display">{tr("title")}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">{tr("sub")}</p>
      </div>

      {/* Headline numbers */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Scale,             label: tr("total"),     value: summary.total_violations },
          { icon: CircleDollarSign,  label: tr("lowest"),    value: `${summary.lowest_fine_lkr.toLocaleString()} LKR` },
          { icon: TrendingUp,        label: tr("highest"),   value: `${summary.highest_fine_lkr.toLocaleString()} LKR` },
          { icon: Gavel,             label: tr("courtOnly"), value: summary.court_only },
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

      {/* Search + category filter */}
      <div className="card space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            className="input pl-9 pr-9"
            placeholder={tr("search")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label={tr("clear")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setCategory("all")}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${
              category === "all"
                ? "bg-signal text-asphalt-900 border-signal"
                : "border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-asphalt-700 dark:text-slate-300 dark:hover:bg-asphalt-700"
            }`}
          >
            {tr("all")} ({data.violations.length})
          </button>
          {categories.map((c: any) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${
                category === c.key
                  ? "bg-signal text-asphalt-900 border-signal"
                  : "border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-asphalt-700 dark:text-slate-300 dark:hover:bg-asphalt-700"
              }`}
            >
              {c.label} ({counts[c.key] ?? 0})
            </button>
          ))}
        </div>

        <p className="text-xs text-slate-400">
          {filtered.length} {tr("results")}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Offence list */}
        <div className="lg:col-span-7 space-y-3">
          {filtered.length === 0 ? (
            <div className="card text-center p-8 text-slate-500 text-sm">{tr("noResults")}</div>
          ) : (
            filtered.map((v: any) => <ViolationCard key={v.id} v={v} tr={tr} />)
          )}
        </div>

        {/* Side panels */}
        <div className="lg:col-span-5 space-y-4">
          {/* Payment window — 14 / 28 / court */}
          <div className="card space-y-3">
            <p className="font-bold font-display text-sm flex items-center gap-2">
              <Clock size={15} className="text-signal" /> {tr("windowTitle")}
            </p>
            {window.stages.map((s: any) => {
              const style = STAGE_STYLE[s.stage];
              return (
                <div key={s.stage} className={`rounded-xl border p-3 space-y-1 ${style.box}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-sm font-bold ${style.tone}`}>{s.label}</span>
                    <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap">
                      {tr("day")} {s.from_day}
                      {s.to_day ? `–${s.to_day}` : "+"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{s.detail}</p>
                </div>
              );
            })}
          </div>

          {/* Demerit points */}
          <div className="card space-y-3">
            <div className="flex items-start justify-between gap-2">
              <p className="font-bold font-display text-sm flex items-center gap-2">
                <ShieldAlert size={15} className="text-signal" /> {tr("demeritTitle")}
              </p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-alert/10 text-alert border-alert/30 shrink-0">
                {demerit.suspension_threshold} pts / {demerit.window_months} mo
              </span>
            </div>
            <div className="space-y-2">
              {demerit.tiers.map((t: any) => {
                const style = TIER_STYLE[t.status];
                return (
                  <div key={t.status} className="flex gap-3">
                    <span className={`w-1 rounded-full shrink-0 ${style.bar}`} />
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold ${style.text}`}>
                        {t.from_points}
                        {t.to_points !== null ? `–${t.to_points}` : "+"} · {t.label}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{t.advice}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-500 italic border-t border-slate-100 dark:border-asphalt-700 pt-2">
              {demerit.note}
            </p>
          </div>

          {/* Currency converter link */}
          <div className="card space-y-2">
            <p className="font-bold font-display text-sm flex items-center gap-2">
              <Banknote size={15} className="text-signal" /> {tr("convertTitle")}
            </p>
            <Link to="/fines/convert" className="btn-ghost w-full text-sm">
              {tr("convertCta")}
            </Link>
          </div>

          {/* Disclaimer */}
          <div className="card border-slate-200 dark:border-asphalt-700 flex gap-3">
            <Info className="text-slate-400 shrink-0 mt-0.5" size={16} />
            <p className="text-xs text-slate-500">{disclaimer}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
