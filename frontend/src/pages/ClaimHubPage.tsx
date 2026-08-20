import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLang } from "@/context/LanguageContext";
import { InsuranceApi } from "@/services/api";
import {
  Phone, Camera, AlertTriangle, Info, ExternalLink, ShieldCheck,
  Siren, ClipboardList, CheckCircle2, Circle, Gavel, NotebookPen, RotateCcw,
} from "lucide-react";

/**
 * What to do in the minutes after a collision.
 *
 * Ordered for someone standing at the roadside with their hands shaking: emergency
 * numbers first, then their insurer, then the photographs, then the paperwork.
 */

const UI = {
  en: {
    title: "Accident Claim Hub",
    sub: "The numbers to call and the photographs to take, in the order you need them.",
    tabs: ["At the scene", "Photographs", "Hotlines", "Claim & cover"],
    emergency: "Emergency", callNow: "Call",
    doNow: "Do this now", thenThis: "Then",
    photos: "What to photograph", photoProgress: "Photographed",
    reset: "Reset",
    essential: "Essential", important: "Important", situational: "If relevant",
    insurers: "Motor claim hotlines",
    confirmed: "Confirmed", unconfirmed: "Check your policy",
    website: "Website",
    police: "When a police report is required",
    required: "Required", notRequired: "Usually not",
    claimSteps: "Making the claim", cover: "What your cover includes",
    covers: "Covers", notCovered: "Not covered",
    recordCta: "Record this incident with photos and GPS",
    dataNote: "About these numbers",
    loading: "Loading…",
    failed: "Could not reach the backend on port 8000.",
  },
  ta: {
    title: "விபத்து காப்புறுதி மையம்",
    sub: "யாரை அழைப்பது, என்ன போட்டோ எடுப்பது — தேவையான வரிசையில்.",
    tabs: ["விபத்து இடத்தில்", "போட்டோக்கள்", "தொலைபேசி எண்கள்", "கோரிக்கை & காப்பு"],
    emergency: "அவசரம்", callNow: "அழை",
    doNow: "உடனே செய்யுங்கள்", thenThis: "அதன் பிறகு",
    photos: "என்ன போட்டோ எடுக்க வேண்டும்", photoProgress: "எடுத்தது",
    reset: "மீட்டமை",
    essential: "அத்தியாவசியம்", important: "முக்கியம்", situational: "தேவைப்பட்டால்",
    insurers: "காப்புறுதி கோரிக்கை எண்கள்",
    confirmed: "உறுதிப்படுத்தப்பட்டது", unconfirmed: "உங்கள் policy-ஐப் பாருங்கள்",
    website: "இணையதளம்",
    police: "பொலிஸ் அறிக்கை எப்போது தேவை",
    required: "தேவை", notRequired: "பொதுவாகத் தேவையில்லை",
    claimSteps: "கோரிக்கை செய்தல்", cover: "உங்கள் காப்பு என்ன உள்ளடக்கும்",
    covers: "உள்ளடக்கும்", notCovered: "உள்ளடக்காது",
    recordCta: "இந்த நிகழ்வை போட்டோ & GPS உடன் பதிவு செய்",
    dataNote: "இந்த எண்கள் பற்றி",
    loading: "ஏற்றப்படுகிறது…",
    failed: "Backend port 8000-ஐ அணுக முடியவில்லை.",
  },
  si: {
    title: "අනතුරු හිමිකම් මධ්‍යස්ථානය",
    sub: "කාට කතා කරන්නද, කුමන ඡායාරූප ගන්නද — ඔබට අවශ්‍ය පිළිවෙළින්.",
    tabs: ["අනතුරු ස්ථානයේ", "ඡායාරූප", "දුරකථන අංක", "හිමිකම සහ ආවරණය"],
    emergency: "හදිසි", callNow: "අමතන්න",
    doNow: "දැන්ම කරන්න", thenThis: "ඉන්පසු",
    photos: "ගත යුතු ඡායාරූප", photoProgress: "ගත්තා",
    reset: "යළි පිහිටුවන්න",
    essential: "අත්‍යවශ්‍ය", important: "වැදගත්", situational: "අදාළ නම්",
    insurers: "රක්ෂණ හිමිකම් අංක",
    confirmed: "තහවුරු කළා", unconfirmed: "ඔබේ policy එක බලන්න",
    website: "වෙබ් අඩවිය",
    police: "පොලිස් වාර්තාවක් අවශ්‍ය වන විට",
    required: "අවශ්‍යයි", notRequired: "සාමාන්‍යයෙන් නැත",
    claimSteps: "හිමිකම ඉදිරිපත් කිරීම", cover: "ඔබේ ආවරණය",
    covers: "ආවරණය කරයි", notCovered: "ආවරණය නොකරයි",
    recordCta: "ඡායාරූප සහ GPS සමඟ මෙම සිද්ධිය වාර්තා කරන්න",
    dataNote: "මෙම අංක ගැන",
    loading: "පූරණය වෙමින්…",
    failed: "Backend port 8000 වෙත ළඟා විය නොහැක.",
  },
};

type LabelKey = Exclude<keyof typeof UI.en, "tabs">;

const PRIORITY_STYLE: Record<string, { cls: string; labelKey: LabelKey }> = {
  essential:   { cls: "bg-alert/10 text-alert border-alert/30",    labelKey: "essential" },
  important:   { cls: "bg-signal/10 text-signal border-signal/30", labelKey: "important" },
  situational: { cls: "bg-slate-100 text-slate-500 border-slate-300 dark:bg-asphalt-700 dark:border-asphalt-700", labelKey: "situational" },
};

export default function ClaimHubPage() {
  const { lang } = useLang();
  const key = lang as "en" | "ta" | "si";
  const tr = (k: LabelKey): string => UI[key]?.[k] ?? UI.en[k];
  const tabs = UI[key]?.tabs ?? UI.en.tabs;

  const [data, setData] = useState<any>(null);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState(0);
  const [shot, setShot] = useState<Record<string, boolean>>({});

  useEffect(() => {
    InsuranceApi.claimHub().then(setData).catch(() => setError(true));
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

  const urgent = data.immediate_steps.filter((s: any) => s.urgent);
  const later = data.immediate_steps.filter((s: any) => !s.urgent);
  const shotCount = data.photo_checklist.filter((p: any) => shot[p.key]).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display flex items-center gap-2">
          <Siren size={26} className="text-alert" /> {tr("title")}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">{tr("sub")}</p>
      </div>

      {/* Emergency numbers — always visible, never behind a tab */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {data.emergency_numbers.map((n: any) => (
          <a key={n.number} href={`tel:${n.number}`}
            className="card border-alert/40 bg-alert/5 flex items-center gap-3 p-3 hover:bg-alert/10 transition">
            <Phone size={16} className="text-alert shrink-0" />
            <div className="min-w-0">
              <p className="display text-xl font-bold text-alert leading-none">{n.number}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1 truncate">
                {n.name}
              </p>
              <p className="text-[10px] text-slate-500 truncate">{n.when}</p>
            </div>
          </a>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
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

      {/* ── At the scene ── */}
      {tab === 0 && (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7 space-y-4">
            <div className="card border-alert/40 bg-alert/5 space-y-3">
              <p className="font-bold font-display text-sm flex items-center gap-2 text-alert">
                <Siren size={15} /> {tr("doNow")}
              </p>
              <ol className="space-y-3">
                {urgent.map((s: any) => (
                  <li key={s.step} className="flex gap-3">
                    <span className="shrink-0 h-6 w-6 rounded-full bg-alert/20 text-alert text-[11px] font-bold flex items-center justify-center">
                      {s.step}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{s.title}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{s.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="card space-y-3">
              <p className="font-bold font-display text-sm flex items-center gap-2">
                <ClipboardList size={15} className="text-signal" /> {tr("thenThis")}
              </p>
              <ol className="space-y-3">
                {later.map((s: any) => (
                  <li key={s.step} className="flex gap-3">
                    <span className="shrink-0 h-6 w-6 rounded-full bg-signal/15 text-signal text-[11px] font-bold flex items-center justify-center">
                      {s.step}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{s.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{s.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <Link to="/incidents" className="card border-signal/40 bg-signal/5 flex items-center gap-3 hover:bg-signal/10 transition">
              <NotebookPen size={18} className="text-signal shrink-0" />
              <p className="text-sm font-medium">{tr("recordCta")}</p>
            </Link>

            <div className="card space-y-3">
              <p className="font-bold font-display text-sm flex items-center gap-2">
                <Gavel size={15} className="text-signal" /> {tr("police")}
              </p>
              {data.police_report_rules.map((r: any) => (
                <div key={r.situation} className="flex gap-2.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 h-fit ${
                    r.required
                      ? "bg-alert/10 text-alert border-alert/30"
                      : "bg-slate-100 text-slate-500 border-slate-300 dark:bg-asphalt-700 dark:border-asphalt-700"}`}>
                    {r.required ? tr("required") : tr("notRequired")}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium">{r.situation}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{r.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Photographs ── */}
      {tab === 1 && (
        <div className="space-y-3">
          <div className="card flex items-center justify-between gap-3">
            <p className="text-sm font-bold flex items-center gap-2">
              <Camera size={15} className="text-signal" />
              {tr("photoProgress")} {shotCount}/{data.photo_checklist.length}
            </p>
            <button className="btn-ghost py-1.5 text-xs shrink-0" onClick={() => setShot({})}>
              <RotateCcw size={12} /> {tr("reset")}
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {data.photo_checklist.map((p: any) => {
              const style = PRIORITY_STYLE[p.priority] ?? PRIORITY_STYLE.situational;
              const on = !!shot[p.key];
              return (
                <button key={p.key}
                  onClick={() => setShot((s) => ({ ...s, [p.key]: !s[p.key] }))}
                  className={`card w-full text-left flex gap-3 transition ${
                    on ? "border-go/40 bg-go/5" : "hover:bg-slate-50 dark:hover:bg-asphalt-700/40"}`}>
                  {on
                    ? <CheckCircle2 size={18} className="text-go shrink-0 mt-0.5" />
                    : <Circle size={18} className="text-slate-300 dark:text-asphalt-700 shrink-0 mt-0.5" />}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-semibold ${on ? "text-slate-400 line-through" : ""}`}>
                        {p.label}
                      </p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${style.cls}`}>
                        {tr(style.labelKey)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{p.detail}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Hotlines ── */}
      {tab === 2 && (
        <div className="space-y-4">
          <p className="font-bold font-display text-sm flex items-center gap-2">
            <Phone size={15} className="text-signal" /> {tr("insurers")}
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {data.insurers.map((i: any) => (
              <div key={i.key}
                className={`card space-y-2 ${i.verified ? "border-go/30" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold min-w-0">{i.name}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                    i.verified
                      ? "bg-go/10 text-go border-go/30"
                      : "bg-signal/10 text-signal border-signal/30"}`}>
                    {i.verified ? tr("confirmed") : tr("unconfirmed")}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">{i.hours}</p>
                {i.note && <p className="text-[11px] text-slate-500 italic">{i.note}</p>}
                <div className="flex gap-2">
                  {i.claim_hotline ? (
                    <a href={`tel:${i.claim_hotline}`} className="btn-primary flex-1 py-1.5 text-xs">
                      <Phone size={12} /> {i.display}
                    </a>
                  ) : (
                    <span className="flex-1 text-[11px] text-slate-400 self-center">—</span>
                  )}
                  {i.url && (
                    <a href={i.url} target="_blank" rel="noopener noreferrer"
                      className="btn-ghost py-1.5 text-xs shrink-0">
                      <ExternalLink size={12} /> {tr("website")}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="card border-slate-200 dark:border-asphalt-700 flex gap-3">
            <Info className="text-slate-400 shrink-0 mt-0.5" size={16} />
            <div>
              <p className="text-xs font-bold mb-1">
                {tr("dataNote")} · {data.verified_count}/{data.insurers.length} {tr("confirmed").toLowerCase()}
              </p>
              <p className="text-xs text-slate-500">{data.data_note}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Claim and cover ── */}
      {tab === 3 && (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7 card space-y-3">
            <p className="font-bold font-display text-sm flex items-center gap-2">
              <ClipboardList size={15} className="text-signal" /> {tr("claimSteps")}
            </p>
            <ol className="space-y-3">
              {data.claim_steps.map((s: any) => (
                <li key={s.step} className="flex gap-3">
                  <span className="shrink-0 h-6 w-6 rounded-full bg-signal/15 text-signal text-[11px] font-bold flex items-center justify-center">
                    {s.step}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{s.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{s.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="lg:col-span-5 space-y-3">
            <p className="font-bold font-display text-sm flex items-center gap-2">
              <ShieldCheck size={15} className="text-go" /> {tr("cover")}
            </p>
            {data.cover_types.map((c: any) => (
              <div key={c.type} className="card space-y-1.5">
                <p className="text-sm font-semibold">{c.type}</p>
                <p className="text-[11px]">
                  <span className="font-semibold text-go">{tr("covers")}: </span>
                  <span className="text-slate-600 dark:text-slate-300">{c.covers}</span>
                </p>
                <p className="text-[11px]">
                  <span className="font-semibold text-alert">{tr("notCovered")}: </span>
                  <span className="text-slate-600 dark:text-slate-300">{c.not_covered}</span>
                </p>
                <p className="text-[11px] text-slate-500 italic">{c.note}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
