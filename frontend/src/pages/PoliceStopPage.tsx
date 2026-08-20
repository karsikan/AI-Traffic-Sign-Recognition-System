import { useEffect, useState } from "react";
import { useLang } from "@/context/LanguageContext";
import { RightsApi } from "@/services/api";
import PaymentChannels from "@/components/fines/PaymentChannels";
import {
  Siren, ShieldCheck, ScrollText, Wine, UserRound, Phone,
  Gavel, AlertTriangle, Info, CheckCircle2, PhoneCall, Megaphone,
} from "lucide-react";

// ── Trilingual UI labels (content comes from the API in English) ──────────────
const UI = {
  en: {
    title: "Police Stopped You — What Now",
    sub: "What the officer may do, what you must produce, how a breath test should be run, and who to call if something goes wrong.",
    tabs: ["What happens", "Your rights", "Breath test", "Women drivers", "Who to call"],
    stopGuide: "Step by step at the roadside",
    rights: "What you may do", duties: "What you must do",
    basis: "Basis",
    limits: "Legal alcohol limits", procedure: "How the test should be run",
    hotlinesEmergency: "Emergency", hotlinesTraffic: "Traffic & enquiries", hotlinesComplaint: "Complaints & corruption",
    complaint: "Reporting a bribe or misconduct",
    call: "Call",
    payment: "Where a spot fine is paid",
    loading: "Loading…",
    failed: "Could not load this page. Is the backend running on port 8000?",
    bribeBanner: "No officer may take fine money at the roadside. A spot fine is paid at a post office against the charge sheet — a demand for cash is a bribe. Report it to CIABOC on 1954.",
  },
  ta: {
    title: "பொலிஸ் நிறுத்தினால் — அடுத்து என்ன",
    sub: "அதிகாரி என்ன செய்யலாம், நீங்கள் என்ன காட்ட வேண்டும், மதுபோதை சோதனை எப்படி நடக்க வேண்டும், தவறு நடந்தால் யாரை அழைப்பது.",
    tabs: ["என்ன நடக்கும்", "உங்கள் உரிமைகள்", "மதுபோதை சோதனை", "பெண் சாரதிகள்", "யாரை அழைப்பது"],
    stopGuide: "வீதியில் படிப்படியாக",
    rights: "நீங்கள் செய்யலாம்", duties: "நீங்கள் செய்ய வேண்டியவை",
    basis: "அடிப்படை",
    limits: "சட்டப்பூர்வ மது அளவு", procedure: "சோதனை எப்படி நடக்க வேண்டும்",
    hotlinesEmergency: "அவசரம்", hotlinesTraffic: "போக்குவரத்து & விசாரணை", hotlinesComplaint: "புகார் & ஊழல்",
    complaint: "லஞ்சம் அல்லது தவறான நடத்தையைப் புகார் செய்தல்",
    call: "அழை",
    payment: "உடனடி அபராதம் எங்கே செலுத்துவது",
    loading: "ஏற்றப்படுகிறது…",
    failed: "இந்தப் பக்கத்தை ஏற்ற முடியவில்லை. Backend port 8000-ல் இயங்குகிறதா?",
    bribeBanner: "எந்த அதிகாரியும் வீதியில் அபராதப் பணத்தை வாங்க முடியாது. உடனடி அபராதம் தபால் அலுவலகத்தில் charge sheet-உடன் செலுத்தப்படுகிறது — பணம் கேட்டால் அது லஞ்சம். CIABOC 1954-ல் புகார் செய்யுங்கள்.",
  },
  si: {
    title: "පොලිසිය නැවැත්වූ විට — දැන් කුමක්ද",
    sub: "නිලධාරියාට කළ හැක්කේ කුමක්ද, ඔබ ඉදිරිපත් කළ යුත්තේ කුමක්ද, මත්පැන් පරීක්ෂණය කෙසේ කළ යුතුද, වැරදුනොත් කාට කතා කළ යුතුද.",
    tabs: ["සිදුවන්නේ කුමක්ද", "ඔබේ අයිතිවාසිකම්", "මත්පැන් පරීක්ෂණය", "කාන්තා රියදුරන්", "කාට කතා කරන්නද"],
    stopGuide: "මාර්ගයේදී පියවරෙන් පියවර",
    rights: "ඔබට කළ හැකි දේ", duties: "ඔබ කළ යුතු දේ",
    basis: "පදනම",
    limits: "නීතිමය මත්පැන් සීමා", procedure: "පරීක්ෂණය කළ යුතු ආකාරය",
    hotlinesEmergency: "හදිසි", hotlinesTraffic: "රථවාහන සහ විමසීම්", hotlinesComplaint: "පැමිණිලි සහ දූෂණ",
    complaint: "අල්ලසක් හෝ වැරදි හැසිරීමක් වාර්තා කිරීම",
    call: "අමතන්න",
    payment: "ක්ෂණික දඩය ගෙවන ස්ථානය",
    loading: "පූරණය වෙමින්…",
    failed: "මෙම පිටුව පූරණය කළ නොහැකි විය. Backend port 8000 හි ක්‍රියාත්මකද?",
    bribeBanner: "කිසිදු නිලධාරියෙකුට මාර්ගයේදී දඩ මුදල් ගත නොහැක. ක්ෂණික දඩය තැපැල් කාර්යාලයෙන් ගෙවනු ලැබේ — මුදල් ඉල්ලීම අල්ලසකි. CIABOC 1954 වෙත වාර්තා කරන්න.",
  },
};

const HOTLINE_STYLE: Record<string, { box: string; tone: string; icon: any }> = {
  emergency: { box: "border-alert/40 bg-alert/5",   tone: "text-alert",  icon: Siren },
  traffic:   { box: "border-signal/40 bg-signal/5", tone: "text-signal", icon: PhoneCall },
  complaint: { box: "border-go/40 bg-go/5",         tone: "text-go",     icon: Megaphone },
};

const LEVEL_STYLE: Record<string, { label: string; cls: string }> = {
  must:   { label: "Must",   cls: "bg-alert/10 text-alert border-alert/30" },
  right:  { label: "Right",  cls: "bg-go/10 text-go border-go/30" },
  action: { label: "Do this",cls: "bg-signal/10 text-signal border-signal/30" },
};

const STRENGTH_STYLE: Record<string, { label: string; cls: string }> = {
  right:     { label: "Your right",  cls: "bg-go/10 text-go border-go/30" },
  qualified: { label: "Conditional", cls: "bg-signal/10 text-signal border-signal/30" },
};

function StepList({ steps }: { steps: any[] }) {
  return (
    <ol className="space-y-3">
      {steps.map((s: any) => (
        <li key={s.step} className="flex gap-3">
          <span className="shrink-0 h-6 w-6 rounded-full bg-signal/15 text-signal text-[11px] font-bold flex items-center justify-center">
            {s.step}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{s.title}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{s.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function HotlineCard({ h, callLabel }: { h: any; callLabel: string }) {
  const style = HOTLINE_STYLE[h.kind] ?? HOTLINE_STYLE.traffic;
  const Icon = style.icon;
  return (
    <div className={`card p-4 space-y-2 ${style.box}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <Icon size={17} className={`${style.tone} shrink-0 mt-0.5`} />
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-snug">{h.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{h.purpose}</p>
            <p className="text-[10px] text-slate-400 mt-1">{h.available}</p>
          </div>
        </div>
        <a href={`tel:${h.number}`} className="btn-ghost shrink-0 px-3 py-1.5 text-xs" aria-label={`${callLabel} ${h.name}`}>
          <Phone size={13} /> {h.number}
        </a>
      </div>
    </div>
  );
}

// Every key except "tabs", which holds an array rather than a label.
type LabelKey = Exclude<keyof typeof UI.en, "tabs">;

export default function PoliceStopPage() {
  const { lang } = useLang();
  const tr = (k: LabelKey): string => UI[(lang as "en" | "ta" | "si")]?.[k] ?? UI.en[k];
  const tabs = UI[(lang as "en" | "ta" | "si")]?.tabs ?? UI.en.tabs;

  const [data, setData] = useState<any>(null);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    RightsApi.overview().then(setData).catch(() => setError(true));
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

  const {
    rights, duties, police_stop_guide: stopGuide, breathalyser, women_drivers: women,
    hotlines, complaint_steps: complaintSteps, payment_channels: channels,
    payment_note: paymentNote, disclaimer,
  } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display flex items-center gap-2">
          <Siren size={26} className="text-alert" /> {tr("title")}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">{tr("sub")}</p>
      </div>

      {/* The one thing worth knowing before anything else */}
      <div className="card border-alert/40 bg-alert/5 flex items-start gap-3">
        <Gavel className="text-alert shrink-0 mt-0.5" size={18} />
        <p className="text-sm text-slate-700 dark:text-slate-200">{tr("bribeBanner")}</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {tabs.map((label: string, i: number) => (
          <button
            key={label}
            onClick={() => setTab(i)}
            className={`text-xs font-semibold px-3.5 py-2 rounded-full border transition ${
              tab === i
                ? "bg-signal text-asphalt-900 border-signal"
                : "border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-asphalt-700 dark:text-slate-300 dark:hover:bg-asphalt-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 0 — What happens */}
      {tab === 0 && (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7 card space-y-4">
            <p className="font-bold font-display flex items-center gap-2">
              <ScrollText size={16} className="text-signal" /> {tr("stopGuide")}
            </p>
            <StepList steps={stopGuide} />
          </div>
          <div className="lg:col-span-5 card space-y-3 h-fit">
            <p className="font-bold font-display text-sm flex items-center gap-2">
              <CheckCircle2 size={15} className="text-go" /> {tr("payment")}
            </p>
            <PaymentChannels channels={channels} note={paymentNote} />
          </div>
        </div>
      )}

      {/* 1 — Rights and duties */}
      {tab === 1 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <p className="font-bold font-display flex items-center gap-2">
              <ShieldCheck size={16} className="text-go" /> {tr("rights")}
            </p>
            {rights.map((r: any) => {
              const s = STRENGTH_STYLE[r.strength] ?? STRENGTH_STYLE.right;
              return (
                <div key={r.id} className="card p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold leading-snug">{r.right}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${s.cls}`}>
                      {s.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{r.detail}</p>
                  <p className="text-[10px] text-slate-400">
                    {tr("basis")}: {r.basis}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="space-y-3">
            <p className="font-bold font-display flex items-center gap-2">
              <AlertTriangle size={16} className="text-signal" /> {tr("duties")}
            </p>
            {duties.map((d: any) => (
              <div key={d.id} className="card p-4 space-y-1.5">
                <p className="text-sm font-semibold leading-snug">{d.duty}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{d.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2 — Breath test */}
      {tab === 2 && (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5 space-y-4">
            <div className="card space-y-3">
              <p className="font-bold font-display text-sm flex items-center gap-2">
                <Wine size={15} className="text-signal" /> {tr("limits")}
              </p>
              {breathalyser.limits.map((l: any) => (
                <div key={l.driver} className="rounded-xl bg-slate-50 dark:bg-asphalt-700/40 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium min-w-0">{l.driver}</p>
                    <span className={`display text-base font-bold shrink-0 ${
                      l.bac_limit === "0.00%" ? "text-alert" : "text-signal"
                    }`}>
                      {l.bac_limit}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{l.note}</p>
                </div>
              ))}
            </div>
            <div className="card border-signal/30 bg-signal/5 flex gap-3">
              <Info className="text-signal shrink-0 mt-0.5" size={16} />
              <p className="text-xs text-slate-600 dark:text-slate-300">{breathalyser.note}</p>
            </div>
          </div>
          <div className="lg:col-span-7 card space-y-4">
            <p className="font-bold font-display flex items-center gap-2">
              <ScrollText size={16} className="text-signal" /> {tr("procedure")}
            </p>
            <StepList steps={breathalyser.steps} />
          </div>
        </div>
      )}

      {/* 3 — Women drivers */}
      {tab === 3 && (
        <div className="space-y-4">
          <div className="card border-signal/30 bg-signal/5 flex gap-3">
            <UserRound className="text-signal shrink-0 mt-0.5" size={18} />
            <p className="text-sm text-slate-700 dark:text-slate-200">{women.summary}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {women.points.map((p: any) => {
              const s = LEVEL_STYLE[p.level] ?? LEVEL_STYLE.right;
              return (
                <div key={p.id} className="card p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold leading-snug">{p.title}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${s.cls}`}>
                      {s.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{p.detail}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4 — Hotlines and complaints */}
      {tab === 4 && (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7 space-y-4">
            {(["emergency", "traffic", "complaint"] as const).map((kind) => {
              const group = hotlines.filter((h: any) => h.kind === kind);
              if (!group.length) return null;
              const heading =
                kind === "emergency" ? tr("hotlinesEmergency")
                : kind === "traffic" ? tr("hotlinesTraffic")
                : tr("hotlinesComplaint");
              return (
                <div key={kind} className="space-y-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{heading}</p>
                  {group.map((h: any) => <HotlineCard key={h.id} h={h} callLabel={tr("call")} />)}
                </div>
              );
            })}
          </div>
          <div className="lg:col-span-5 card space-y-4 h-fit">
            <p className="font-bold font-display flex items-center gap-2">
              <Megaphone size={16} className="text-go" /> {tr("complaint")}
            </p>
            <StepList steps={complaintSteps} />
          </div>
        </div>
      )}

      <div className="card border-slate-200 dark:border-asphalt-700 flex gap-3">
        <Info className="text-slate-400 shrink-0 mt-0.5" size={16} />
        <p className="text-xs text-slate-500">{disclaimer}</p>
      </div>
    </div>
  );
}
