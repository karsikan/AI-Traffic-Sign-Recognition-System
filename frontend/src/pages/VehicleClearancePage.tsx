import { useEffect, useState } from "react";
import { useLang } from "@/context/LanguageContext";
import { VehicleApi } from "@/services/api";
import {
  FileText, Wind, ExternalLink, Search, CheckCircle2, Info,
  AlertTriangle, MapPin, Lightbulb, ClipboardList,
} from "lucide-react";

// ── Trilingual UI labels ─────────────────────────────────────────────────────
const UI = {
  en: {
    title: "Vehicle Clearance",
    sub: "Revenue licence and emission test — the two things that must be current before the other will renew.",
    tabs: ["Revenue Licence", "Emission Test"],
    plateLabel: "Your vehicle number",
    platePlaceholder: "WP CAB-1234",
    check: "Find my portal",
    orPick: "Or pick your province",
    openPortal: "Open the portal",
    locate: "Find a licence office",
    before: "Before you can renew",
    steps: "How to renew",
    providers: "Testing providers",
    book: "Book online",
    visit: "Website",
    bring: "What to bring",
    tips: "Avoiding the queue",
    queueNote: "About queue times",
    coverage: "Coverage",
    dataNote: "About this information",
    verified: "Links checked",
    loading: "Loading…",
    failed: "Could not reach the backend on port 8000.",
  },
  ta: {
    title: "வாகன அனுமதி",
    sub: "வருமான உரிமம் & புகைப் பரிசோதனை — ஒன்று செல்லுபடியாகாமல் மற்றதைப் புதுப்பிக்க முடியாது.",
    tabs: ["வருமான உரிமம்", "புகைப் பரிசோதனை"],
    plateLabel: "உங்கள் வாகன இலக்கம்",
    platePlaceholder: "WP CAB-1234",
    check: "எனது portal-ஐக் காட்டு",
    orPick: "அல்லது மாகாணத்தைத் தேர்ந்தெடுங்கள்",
    openPortal: "Portal-ஐத் திற",
    locate: "உரிம அலுவலகம் தேடு",
    before: "புதுப்பிக்கும் முன் தேவையானவை",
    steps: "எப்படிப் புதுப்பிப்பது",
    providers: "பரிசோதனை நிலையங்கள்",
    book: "ஆன்லைனில் பதிவு",
    visit: "இணையதளம்",
    bring: "என்ன கொண்டு போக வேண்டும்",
    tips: "வரிசையைத் தவிர்க்க",
    queueNote: "வரிசை நேரம் பற்றி",
    coverage: "பரவல்",
    dataNote: "இந்தத் தகவல் பற்றி",
    verified: "Links சரிபார்க்கப்பட்டது",
    loading: "ஏற்றப்படுகிறது…",
    failed: "Backend port 8000-ஐ அணுக முடியவில்லை.",
  },
  si: {
    title: "වාහන අනුමැතිය",
    sub: "ආදායම් බලපත්‍රය සහ දුම් පරීක්ෂණය — එකක් වලංගු නොවී අනෙක අලුත් කළ නොහැක.",
    tabs: ["ආදායම් බලපත්‍රය", "දුම් පරීක්ෂණය"],
    plateLabel: "ඔබේ වාහන අංකය",
    platePlaceholder: "WP CAB-1234",
    check: "මගේ portal එක සොයන්න",
    orPick: "නැතහොත් පළාත තෝරන්න",
    openPortal: "Portal එක විවෘත කරන්න",
    locate: "බලපත්‍ර කාර්යාලයක් සොයන්න",
    before: "අලුත් කිරීමට පෙර අවශ්‍ය",
    steps: "අලුත් කරන ආකාරය",
    providers: "පරීක්ෂණ මධ්‍යස්ථාන",
    book: "ඔන්ලයින් වෙන් කරන්න",
    visit: "වෙබ් අඩවිය",
    bring: "රැගෙන යා යුතු දේ",
    tips: "පෝලිම මඟහරින්න",
    queueNote: "පෝලිම් කාලය ගැන",
    coverage: "ආවරණය",
    dataNote: "මෙම තොරතුරු ගැන",
    verified: "Links පරීක්ෂා කළා",
    loading: "පූරණය වෙමින්…",
    failed: "Backend port 8000 වෙත ළඟා විය නොහැක.",
  },
};

type LabelKey = Exclude<keyof typeof UI.en, "tabs">;

export default function VehicleClearancePage() {
  const { lang } = useLang();
  const key = lang as "en" | "ta" | "si";
  const tr = (k: LabelKey): string => UI[key]?.[k] ?? UI.en[k];
  const tabs = UI[key]?.tabs ?? UI.en.tabs;

  const [tab, setTab] = useState(0);
  const [revenue, setRevenue] = useState<any>(null);
  const [emission, setEmission] = useState<any>(null);
  const [error, setError] = useState(false);
  const [plate, setPlate] = useState("");
  const [parsed, setParsed] = useState<any>(null);

  useEffect(() => {
    VehicleApi.revenueLicence().then(setRevenue).catch(() => setError(true));
    VehicleApi.emission().then(setEmission).catch(() => setError(true));
  }, []);

  const lookUp = async () => {
    if (!plate.trim()) return;
    try {
      setParsed(await VehicleApi.parsePlate(plate.trim()));
    } catch {
      setParsed(null);
    }
  };

  const pickProvince = (code: string) => {
    const portal = code === "WP" ? revenue.portals.WP : revenue.portals.OTHER;
    const province = revenue.provinces.find((p: any) => p.code === code);
    setParsed({
      plate: "", province_code: code, province: province?.name,
      recognised: true, portal,
      message: `${province?.name} Province — renew at the ${portal.name}.`,
    });
  };

  if (error) {
    return (
      <div className="card border-alert/30 bg-alert/5 flex items-start gap-3">
        <AlertTriangle className="text-alert shrink-0 mt-0.5" size={18} />
        <p className="text-sm text-slate-600 dark:text-slate-300">{tr("failed")}</p>
      </div>
    );
  }

  if (!revenue || !emission) {
    return (
      <div className="card flex flex-col items-center justify-center p-10 space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-signal" />
        <p className="text-slate-600 dark:text-slate-300 font-medium">{tr("loading")}</p>
      </div>
    );
  }

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

      {/* ── Revenue licence ── */}
      {tab === 0 && (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7 space-y-4">
            {/* Plate lookup */}
            <div className="card space-y-3">
              <p className="font-bold font-display text-sm flex items-center gap-2">
                <Search size={15} className="text-signal" /> {tr("plateLabel")}
              </p>
              <div className="flex gap-2">
                <input
                  className="input py-2 text-sm flex-1"
                  placeholder={tr("platePlaceholder")}
                  value={plate}
                  onChange={(e) => setPlate(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && lookUp()}
                />
                <button className="btn-primary py-2 text-sm shrink-0" onClick={lookUp}>
                  {tr("check")}
                </button>
              </div>

              {parsed && (
                <div className={`rounded-xl border p-3 space-y-2.5 ${
                  parsed.recognised ? "border-go/40 bg-go/5" : "border-signal/40 bg-signal/5"}`}>
                  <p className="text-sm font-medium">{parsed.message}</p>
                  {parsed.portal && (
                    <>
                      <p className="text-xs text-slate-600 dark:text-slate-300">{parsed.portal.note}</p>
                      <a href={parsed.portal.url} target="_blank" rel="noopener noreferrer"
                        className="btn-primary w-full py-2 text-xs">
                        <ExternalLink size={13} /> {tr("openPortal")} — {parsed.portal.name}
                      </a>
                    </>
                  )}
                </div>
              )}

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  {tr("orPick")}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {revenue.provinces.map((p: any) => (
                    <button key={p.code} onClick={() => pickProvince(p.code)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${
                        parsed?.province_code === p.code
                          ? "bg-signal text-asphalt-900 border-signal"
                          : "border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-asphalt-700 dark:text-slate-300 dark:hover:bg-asphalt-700"
                      }`}>
                      {p.code} · {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <a href={revenue.locate_office_url} target="_blank" rel="noopener noreferrer"
                className="btn-ghost w-full py-2 text-xs">
                <MapPin size={13} /> {tr("locate")}
              </a>
            </div>

            {/* Steps */}
            <div className="card space-y-3">
              <p className="font-bold font-display text-sm flex items-center gap-2">
                <ClipboardList size={15} className="text-signal" /> {tr("steps")}
              </p>
              <ol className="space-y-2.5">
                {revenue.steps.map((s: any) => (
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
            <div className="card space-y-3">
              <p className="font-bold font-display text-sm flex items-center gap-2">
                <CheckCircle2 size={15} className="text-go" /> {tr("before")}
              </p>
              {revenue.prerequisites.map((p: any) => (
                <div key={p.key} className="rounded-xl bg-slate-50 dark:bg-asphalt-700/40 p-3">
                  <p className="text-xs font-semibold">{p.label}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{p.detail}</p>
                </div>
              ))}
            </div>

            <div className="card border-slate-200 dark:border-asphalt-700 flex gap-3">
              <Info className="text-slate-400 shrink-0 mt-0.5" size={16} />
              <div>
                <p className="text-xs font-bold mb-1">
                  {tr("dataNote")} · {tr("verified")} {revenue.verified_on}
                </p>
                <p className="text-xs text-slate-500">{revenue.data_note}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Emission ── */}
      {tab === 1 && (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7 space-y-4">
            <div className="card space-y-3">
              <p className="font-bold font-display text-sm flex items-center gap-2">
                <Wind size={15} className="text-signal" /> {tr("providers")}
              </p>
              {emission.providers.map((p: any) => (
                <div key={p.name} className="rounded-xl border border-slate-200 dark:border-asphalt-700 p-3 space-y-2">
                  <p className="text-sm font-semibold">{p.name}</p>
                  <p className="text-[11px] text-slate-500">
                    <span className="font-medium">{tr("coverage")}:</span> {p.coverage}
                  </p>
                  <p className="text-[11px] text-slate-500 italic">{p.note}</p>
                  <div className="flex gap-2">
                    {p.booking_url && (
                      <a href={p.booking_url} target="_blank" rel="noopener noreferrer"
                        className="btn-primary flex-1 py-1.5 text-xs">
                        <ExternalLink size={12} /> {tr("book")}
                      </a>
                    )}
                    {p.url && (
                      <a href={p.url} target="_blank" rel="noopener noreferrer"
                        className="btn-ghost flex-1 py-1.5 text-xs">
                        {tr("visit")}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="card space-y-3">
              <p className="font-bold font-display text-sm flex items-center gap-2">
                <Lightbulb size={15} className="text-signal" /> {tr("tips")}
              </p>
              {emission.tips.map((t: any) => (
                <div key={t.tip} className="flex gap-2.5">
                  <span className="text-signal mt-1 shrink-0">•</span>
                  <div>
                    <p className="text-sm font-medium">{t.tip}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{t.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="card space-y-2">
              <p className="font-bold font-display text-sm flex items-center gap-2">
                <FileText size={15} className="text-signal" /> {tr("bring")}
              </p>
              <ul className="space-y-1.5">
                {emission.requirements.map((r: string) => (
                  <li key={r} className="flex gap-2 text-xs">
                    <span className="text-signal mt-0.5">•</span>
                    <span className="text-slate-600 dark:text-slate-300">{r}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card border-signal/30 bg-signal/5 flex gap-3">
              <AlertTriangle className="text-signal shrink-0 mt-0.5" size={16} />
              <div>
                <p className="text-xs font-bold mb-1">{tr("queueNote")}</p>
                <p className="text-xs text-slate-600 dark:text-slate-300">{emission.queue_note}</p>
              </div>
            </div>

            <div className="card border-slate-200 dark:border-asphalt-700 flex gap-3">
              <Info className="text-slate-400 shrink-0 mt-0.5" size={16} />
              <p className="text-xs text-slate-500">{emission.data_note}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
