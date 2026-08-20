import { useEffect, useState } from "react";
import { useLang } from "@/context/LanguageContext";
import { LicenseApi } from "@/services/api";
import {
  Car, CheckCircle, Clock, AlertTriangle, BookOpen,
  ChevronDown, ChevronUp, Banknote, RefreshCw, Globe, Phone,
  Zap, Shield, Star, Info, TrendingUp,
} from "lucide-react";

// ── Severity badge ───────────────────────────────────────────────────────────
const SEVERITY_CONFIG: Record<string, { label: string; cls: string }> = {
  critical:   { label: "Critical",   cls: "bg-alert/10 text-alert border-alert/30" },
  important:  { label: "Important",  cls: "bg-signal/10 text-signal border-signal/30" },
  new2026:    { label: "New 2026",   cls: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-300/40" },
  new2025:    { label: "New 2025",   cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-300/40" },
  upcoming:   { label: "Upcoming",   cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-300/40" },
};

function SeverityBadge({ s }: { s: string }) {
  const cfg = SEVERITY_CONFIG[s] ?? SEVERITY_CONFIG.important;
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

// ── Accordion section ────────────────────────────────────────────────────────
function Section({ title, icon: Icon, children, open: defaultOpen = false, badge }: {
  title: string; icon: any; children: React.ReactNode; open?: boolean; badge?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card p-0 overflow-hidden border border-slate-200 dark:border-asphalt-700">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-asphalt-700/40 transition-colors">
        <span className="flex items-center gap-2 font-bold font-display text-slate-800 dark:text-slate-100">
          <Icon size={17} className="text-signal" /> {title}
          {badge}
        </span>
        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>
      {open && <div className="border-t border-slate-100 dark:border-asphalt-700 p-4">{children}</div>}
    </div>
  );
}

// ── Trilingual static labels ─────────────────────────────────────────────────
const UI = {
  en: {
    title: "Sri Lanka Driving Licence Guide 2026",
    sub: "Complete official guide — all vehicle categories, 2026 updated rules, test preparation",
    tabs: ["Overview", "Vehicle Rules", "2026 Updates", "Theory Test", "Practical Tips", "Fees & DMT"],
    categories: "Licence Categories", eligibility: "Eligibility", steps: "Application Steps",
    rules: "Road Rules", penalty: "Penalty", minAge: "Min Age", vehicle: "Vehicle",
    ruleCard: "Rule", detail: "Detail", updated: "Last updated",
    dmt: "DMT Offices", fees: "Fees 2026", tip: "Tip",
    loading: "Loading licence information...",
    practicalTitle: "Practical Test Tips", theoryTitle: "Theory Test Topics",
    note: "Note", amount: "Amount", hours: "Office Hours",
  },
  ta: {
    title: "இலங்கை வாகன உரிம வழிகாட்டி 2026",
    sub: "முழுமையான அதிகாரப்பூர்வ வழிகாட்டி — அனைத்து வாகன வகைகள், 2026 புதுப்பிக்கப்பட்ட விதிகள்",
    tabs: ["கண்ணோட்டம்", "வாகன விதிகள்", "2026 புதுப்பிப்புகள்", "கோட்பாட்டு சோதனை", "நடைமுறை உதவிக்குறிப்புகள்", "கட்டணங்கள் & DMT"],
    categories: "உரிம வகைகள்", eligibility: "தகுதி", steps: "விண்ணப்ப படிகள்",
    rules: "சாலை விதிகள்", penalty: "அபராதம்", minAge: "குறைந்தபட்ச வயது", vehicle: "வாகனம்",
    ruleCard: "விதி", detail: "விளக்கம்", updated: "கடைசியாக புதுப்பிக்கப்பட்டது",
    dmt: "DMT அலுவலகங்கள்", fees: "கட்டணங்கள் 2026", tip: "உதவிக்குறிப்பு",
    loading: "உரிம தகவல்களை ஏற்றுகிறது...",
    practicalTitle: "நடைமுறை சோதனை உதவிக்குறிப்புகள்", theoryTitle: "கோட்பாட்டு சோதனை தலைப்புகள்",
    note: "குறிப்பு", amount: "தொகை", hours: "அலுவலக நேரம்",
  },
  si: {
    title: "ශ්‍රී ලංකා රිය පදවීමේ බලපත්‍ර මාර්ගෝ. 2026",
    sub: "සම්පූර්ණ නිල මාර්ගෝපදේශය — සියලු රථ ශ්‍රේණි, 2026 යාවත්කාල නීති",
    tabs: ["දළ විශ්ලේෂණය", "රථ නීති", "2026 යාවත්කාල", "න්‍යාය පරීක්ෂාව", "ප්‍රායෝගික ඉඟි", "ගාස්තු & DMT"],
    categories: "බලපත්‍ර ශ්‍රේණි", eligibility: "සුදුසුකම්", steps: "අයදුම් පියවර",
    rules: "මාර්ග නීති", penalty: "දඩය", minAge: "අවම වයස", vehicle: "රථය",
    ruleCard: "නීතිය", detail: "විස්තරය", updated: "අවසන් යාවත්කාල",
    dmt: "DMT කාර්යාල", fees: "ගාස්තු 2026", tip: "ඉඟිය",
    loading: "බලපත්‍ර තොරතුරු පූරණය කරමින්...",
    practicalTitle: "ප්‍රායෝගික පරීක්ෂා ඉඟි", theoryTitle: "න්‍යාය පරීක්ෂා මාතෘකා",
    note: "සටහන", amount: "මුදල", hours: "කාර්යාල වේලාවන්",
  },
};

const VEHICLE_ICONS: Record<string, string> = {
  motorcycle: "🏍️", car: "🚗", three_wheeler: "🛺", bus: "🚌", heavy_vehicle: "🚛",
};

export default function DrivingLicensePage() {
  const { lang, setLang } = useLang();
  const u = UI[lang as keyof typeof UI] ?? UI.en;

  const [tab, setTab]               = useState(0);
  const [info, setInfo]             = useState<any>(null);
  const [vehicleRules, setVehicleRules] = useState<any>(null);
  const [updates, setUpdates]       = useState<any[]>([]);
  const [theory, setTheory]         = useState<any>(null);
  const [practical, setPractical]   = useState<any[]>([]);
  const [busy, setBusy]             = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState("car");

  useEffect(() => {
    setBusy(true);
    Promise.all([
      LicenseApi.info(),
      LicenseApi.allVehicleRules(),
      LicenseApi.updates2026(),
      LicenseApi.theoryTopics(),
      LicenseApi.practicalTips(),
    ]).then(([i, vr, up, th, pr]) => {
      setInfo(i);
      setVehicleRules(vr);
      setUpdates(Array.isArray(up) ? up : Object.values(up));
      setTheory(th);
      setPractical(Array.isArray(pr) ? pr : Object.values(pr));
    }).catch(console.error)
      .finally(() => setBusy(false));
  }, []);

  if (busy) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="animate-spin h-10 w-10 rounded-full border-b-2 border-signal" />
      <p className="text-slate-500 text-sm">{u.loading}</p>
    </div>
  );

  return (
    <div className="space-y-6 pb-10">
      {/* ── Header ── */}
      <div className="space-y-2">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold font-display flex items-center gap-2">
              <Car className="text-signal" size={26} /> {u.title}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">{u.sub}</p>
          </div>
          <div className="flex gap-1.5 shrink-0">
            {(["en","ta","si"] as const).map(l => (
              <button key={l} onClick={() => setLang(l)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                  lang === l ? "bg-signal text-asphalt-900 border-signal" : "border-slate-300 dark:border-asphalt-600 text-slate-500 hover:border-signal/50"
                }`}>
                {l === "en" ? "🇬🇧 EN" : l === "ta" ? "🇮🇳 தமிழ்" : "🇱🇰 සිංහල"}
              </button>
            ))}
          </div>
        </div>
        {info?.last_updated && (
          <p className="text-[10px] text-slate-400 flex items-center gap-1">
            <RefreshCw size={10} /> {u.updated}: {info.last_updated}
          </p>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-asphalt-700 pb-0">
        {u.tabs.map((label, i) => (
          <button key={i} onClick={() => setTab(i)}
            className={`flex-shrink-0 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              tab === i
                ? "border-signal text-signal"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ════ Tab 0 — Overview ════ */}
      {tab === 0 && info && (
        <div className="space-y-5">
          {/* Categories */}
          <Section title={u.categories} icon={Car} open>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {info.categories?.map((cat: any) => (
                <div key={cat.code} className="rounded-xl bg-signal/5 border border-signal/20 p-3 space-y-1">
                  <div className="text-2xl font-black text-signal">{cat.code}</div>
                  <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">{cat.vehicle}</div>
                  <div className="text-[10px] text-slate-400">{u.minAge}: {cat.min_age} yrs</div>
                </div>
              ))}
            </div>
          </Section>

          {/* Eligibility */}
          <Section title={u.eligibility} icon={CheckCircle}>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
              {[
                lang === "ta" ? "குறைந்தபட்ச வயது: 18 வயது (A1: 16)" : lang === "si" ? "අවම වයස: අවුරුදු 18 (A1: 16)" : "Minimum age 18 years (A1 motorcycle: 16 years)",
                lang === "ta" ? "இலங்கை குடிமகன் அல்லது சரியான குடியிருப்பாளர்" : lang === "si" ? "ශ්‍රී ලංකා පුරවැසි හෝ නිවැරදි පදිංචිකරු" : "Sri Lankan citizen or valid resident permit holder",
                lang === "ta" ? "மருத்துவ ரீதியில் தகுதியானவர் (MED-01 படிவம்)" : lang === "si" ? "වෛද්‍ය යෝග්‍යතාව (MED-01 ආකෘතිය)" : "Medically fit — vision, hearing, reflexes (MED-01 form)",
                lang === "ta" ? "போக்குவரத்து தொடர்பான குற்றவியல் தண்டனை இல்லை" : lang === "si" ? "රථවාහන අපරාධ වාර්තා නොමැත" : "No serious traffic criminal convictions",
                lang === "ta" ? "C, D வகை: B உரிமம் 2–4 ஆண்டுகள் வைத்திருக்க வேண்டும்" : lang === "si" ? "C, D ශ්‍රේණිය: B ​බලපත්‍රය අවු. 2–4 තිබිය යුතු" : "For C/D categories: must hold B for 2–4 years first",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle size={14} className="text-go shrink-0 mt-0.5" /> {item}
                </li>
              ))}
            </ul>
          </Section>

          {/* Steps */}
          <Section title={u.steps} icon={Clock} open>
            <div className="space-y-4">
              {info.process_steps?.map((step: any) => (
                <div key={step.step} className="flex gap-4">
                  <div className="flex-shrink-0 w-9 h-9 bg-signal text-asphalt-900 rounded-full flex items-center justify-center font-black text-sm">
                    {step.step}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{step.title}</h4>
                      <span className="text-[10px] bg-slate-100 dark:bg-asphalt-700 text-slate-500 px-2 py-0.5 rounded-full">
                        ⏱ {step.duration}
                      </span>
                      <span className="text-[10px] bg-go/10 text-go px-2 py-0.5 rounded-full font-semibold">
                        {step.cost}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{step.details}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* ════ Tab 1 — Vehicle Rules ════ */}
      {tab === 1 && vehicleRules && (
        <div className="space-y-4">
          {/* Vehicle selector */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(vehicleRules).map(([key, val]: any) => (
              <button key={key} onClick={() => setSelectedVehicle(key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold border transition-all ${
                  selectedVehicle === key
                    ? "bg-signal text-asphalt-900 border-signal"
                    : "border-slate-300 dark:border-asphalt-600 text-slate-600 dark:text-slate-300 hover:border-signal/50"
                }`}>
                <span>{VEHICLE_ICONS[key] || "🚘"}</span>
                <span>{val.title.split(" (")[0].split(" Rules")[0]}</span>
              </button>
            ))}
          </div>

          {/* Selected vehicle rules */}
          {vehicleRules[selectedVehicle] && (
            <div className="space-y-3">
              <h3 className="font-bold font-display text-lg flex items-center gap-2">
                <span className="text-2xl">{VEHICLE_ICONS[selectedVehicle] || "🚘"}</span>
                {vehicleRules[selectedVehicle].title}
              </h3>
              {vehicleRules[selectedVehicle].rules?.map((rule: any, i: number) => (
                <div key={i} className={`rounded-xl border p-4 space-y-1.5 ${
                  rule.severity === "critical" ? "border-alert/30 bg-alert/5" :
                  rule.severity === "new2026" ? "border-purple-300/40 bg-purple-50/50 dark:bg-purple-900/10" :
                  rule.severity === "new2025" ? "border-blue-300/40 bg-blue-50/50 dark:bg-blue-900/10" :
                  "border-slate-200 dark:border-asphalt-700"
                }`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-100">{rule.rule}</span>
                    <SeverityBadge s={rule.severity} />
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{rule.detail}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════ Tab 2 — 2026 Updates ════ */}
      {tab === 2 && (
        <div className="space-y-4">
          <div className="card border-l-4 border-l-purple-500 flex gap-3 items-start bg-purple-50/50 dark:bg-purple-900/10">
            <Zap size={16} className="text-purple-500 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-slate-800 dark:text-slate-100 mb-1">
                {lang === "ta" ? "2023–2026 இலங்கை சாலை விதிகள் புதுப்பிப்புகள்" :
                 lang === "si" ? "2023–2026 ශ්‍රී ලංකා මාර්ග නීති යාවත්කාලීනයන්" :
                 "2023–2026 Sri Lanka Road Rules — Major Updates"}
              </p>
              <p className="text-slate-500">
                {lang === "ta" ? "இந்த விதிகள் தற்போது அமலில் உள்ளன அல்லது 2026-ல் அமலுக்கு வரும்." :
                 lang === "si" ? "මෙම නීති දැනට ක්‍රියාත්මකව ඇත හෝ 2026 දී ක්‍රියාත්මක වේ." :
                 "These rules are currently active or coming into effect in 2026."}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {updates.map((update: any, i: number) => (
              <div key={i} className="card space-y-2">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <span className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <TrendingUp size={14} className="text-signal shrink-0" />
                    {update.category}
                  </span>
                  <div className="flex gap-1.5 items-center">
                    {update.year >= 2026 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-300/30">2026</span>}
                    {update.year === 2025 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200">2025</span>}
                    {update.year <= 2024 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-asphalt-700 dark:text-slate-300">Active</span>}
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{update.rule}</p>
                {update.penalty && update.penalty !== "—" && (
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-alert bg-alert/10 border border-alert/20 rounded-lg px-2 py-1">
                    <AlertTriangle size={10} /> {u.penalty}: {update.penalty}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════ Tab 3 — Theory Test ════ */}
      {tab === 3 && theory && (
        <div className="space-y-5">
          <div className="card border-l-4 border-l-signal flex gap-3 items-start">
            <Info size={15} className="text-signal shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {lang === "ta"
                ? "30 MCQ கேள்விகள் · 30 நிமிட கட்டுப்பாடு · தேர்ச்சி மதிப்பெண்: 24/30 (80%) · DMT அலுவலகத்தில் அல்லது ஆன்லைனில்"
                : lang === "si"
                ? "MCQ ප්‍රශ්න 30 · විනාඩි 30 · සමත් ලකුණු: 24/30 (80%) · DMT කාර්යාල හෝ මාර්ගගතව"
                : "30 MCQ questions · 30 minute limit · Pass mark 24/30 (80%) · Available at DMT office or online from 2025"}
            </p>
          </div>

          {Object.entries(theory).map(([key, topic]: any) => (
            <Section key={key} title={topic.title} icon={BookOpen} open={key === "road_signs"}>
              <div className="space-y-3">
                {topic.questions?.map((qa: any, i: number) => (
                  <div key={i} className="rounded-xl bg-slate-50 dark:bg-asphalt-700 p-3 space-y-1">
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 bg-signal text-asphalt-900 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">Q</span>
                      <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">{qa.q}</p>
                    </div>
                    <div className="flex items-start gap-2 pl-7">
                      <span className="w-5 h-5 bg-go text-white rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">A</span>
                      <p className="text-xs text-go font-medium">{qa.a}</p>
                    </div>
                    {qa.category && (
                      <div className="pl-7">
                        <span className="text-[9px] bg-slate-200 dark:bg-asphalt-600 text-slate-500 px-1.5 py-0.5 rounded">{qa.category}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          ))}
        </div>
      )}

      {/* ════ Tab 4 — Practical Tips ════ */}
      {tab === 4 && (
        <div className="space-y-4">
          <div className="card border-l-4 border-l-go flex gap-3 items-start">
            <Star size={15} className="text-go shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {lang === "ta"
                ? "நடைமுறை சோதனை 30–45 நிமிடங்கள். கீழே உள்ள ஒவ்வொரு புள்ளியும் ஆய்வாளரால் மதிப்பிடப்படுகிறது."
                : lang === "si"
                ? "ප්‍රායෝගික පරීක්ෂාව විනාඩි 30–45. පහත සෑම ලක්ෂ්‍යයක්ම පරීක්ෂකවරයා විසින් ලකුණු කෙරේ."
                : "The practical road test is 30–45 minutes. Every point below is scored by the examiner."}
            </p>
          </div>

          {practical.map((tip: any, i: number) => (
            <div key={i} className={`card space-y-1.5 border-l-4 ${
              tip.priority === "critical" ? "border-l-alert" :
              tip.priority === "high"     ? "border-l-signal" : "border-l-slate-300"
            }`}>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">{tip.tip}</h4>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                  tip.priority === "critical" ? "border-alert/30 bg-alert/10 text-alert" :
                  tip.priority === "high"     ? "border-signal/30 bg-signal/10 text-signal" :
                  "border-slate-200 bg-slate-50 text-slate-500"
                }`}>{tip.priority === "critical" ? "Must Know" : tip.priority === "high" ? "High Priority" : "Medium"}</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{tip.detail}</p>
            </div>
          ))}
        </div>
      )}

      {/* ════ Tab 5 — Fees & DMT ════ */}
      {tab === 5 && info && (
        <div className="space-y-6">
          {/* Fees */}
          <Section title={u.fees} icon={Banknote} open>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-asphalt-800 text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="p-3 text-left">Item</th>
                    <th className="p-3 text-right">{u.amount}</th>
                    <th className="p-3 text-left hidden sm:table-cell">{u.note}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-asphalt-700">
                  {info.fees?.map((fee: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-asphalt-750/20">
                      <td className="p-3 text-slate-700 dark:text-slate-200">{fee.item}</td>
                      <td className="p-3 text-right font-bold text-signal">LKR {fee.amount.toLocaleString()}</td>
                      <td className="p-3 text-slate-400 hidden sm:table-cell">{fee.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
              <AlertTriangle size={10} /> Fees subject to change. Verify at DMT before visiting.
            </p>
          </Section>

          {/* DMT Offices */}
          <Section title={u.dmt} icon={Globe} open>
            <div className="grid gap-3 sm:grid-cols-2">
              {info.dmt_offices?.map((office: any, i: number) => (
                <div key={i} className="rounded-xl border border-slate-200 dark:border-asphalt-700 p-3 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-signal/10 text-signal rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                      {office.city[0]}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-800 dark:text-slate-100">{office.city}</p>
                      <p className="text-[10px] text-slate-400">{office.hours}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">{office.address}</p>
                  <div className="flex gap-2">
                    <a href={`tel:${office.phone}`} className="flex items-center gap-1 text-xs text-signal hover:underline">
                      <Phone size={11} /> {office.phone}
                    </a>
                    <a href={`https://www.google.com/maps/search/?api=1&query=${office.lat},${office.lon}`}
                      target="_blank" rel="noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-500 hover:underline">
                      <Globe size={11} /> Directions
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Quick links */}
          <div className="card space-y-3">
            <h3 className="font-bold font-display text-sm flex items-center gap-2">
              <Shield size={15} className="text-signal" />
              {lang === "ta" ? "அதிகாரப்பூர்வ இணையதளங்கள்" :
               lang === "si" ? "නිල වෙබ් අඩවි" : "Official Websites"}
            </h3>
            <div className="space-y-2">
              {[
                { label: "DMT Sri Lanka (dmt.gov.lk)", url: "https://dmt.gov.lk" },
                { label: "eGov Portal — Online Renewal (e.gov.lk)", url: "https://e.gov.lk" },
                { label: "National Transport Commission (ntc.gov.lk)", url: "https://ntc.gov.lk" },
                { label: "Sri Lanka Police Traffic (police.lk)", url: "https://police.lk" },
              ].map(link => (
                <a key={link.label} href={link.url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 text-xs text-signal hover:underline">
                  <Globe size={11} /> {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
