import { useEffect, useState } from "react";
import { useLang } from "@/context/LanguageContext";
import { CheckpointApi } from "@/services/api";
import {
  MapPin, Navigation, ShieldAlert, Gauge, Camera, Wine, Construction,
  ThumbsUp, CheckCircle2, AlertTriangle, Info, Clock, ExternalLink, RefreshCw,
} from "lucide-react";

// ── Trilingual UI labels ─────────────────────────────────────────────────────
const UI = {
  en: {
    title: "Checkpoints & Speed Traps",
    sub: "What other drivers have marked on the road ahead. Reports fade on their own — a mobile speed gun after 90 minutes, a checkpoint after three hours.",
    locate: "Use my location", locating: "Finding you…",
    locationNeeded: "Turn on location to see what has been reported near you.",
    locationFail: "Could not get your location. Allow location access and try again.",
    report: "Report what you just passed", reporting: "Reporting…",
    nearby: "Near you", nothing: "Nothing reported within {r} km. Clear road.",
    radius: "Search radius", refresh: "Refresh",
    away: "km away", left: "min left", ago: "min ago",
    confirmations: "confirmations",
    stillThere: "Still there", gone: "Gone now",
    directions: "Map",
    reliability_confirmed: "Confirmed", reliability_corroborated: "Corroborated",
    reliability_fresh: "Fresh", reliability_unconfirmed: "Unconfirmed",
    roadName: "Road or landmark (optional)", note: "Note (optional)",
    loading: "Loading…", failed: "Could not load. Is the backend running on port 8000?",
    thanks: "Thanks — reported.", merged: "Someone had already marked this. Your confirmation was added.",
    safety: "Drive to the road and the law",
  },
  ta: {
    title: "சோதனைச் சாவடிகள் & வேக கண்காணிப்பு",
    sub: "முன்னால் உள்ள வீதியில் மற்ற சாரதிகள் குறித்தவை. பதிவுகள் தானாகவே மறையும் — கையடக்க speed gun 90 நிமிடத்தில், சோதனைச் சாவடி 3 மணி நேரத்தில்.",
    locate: "எனது இருப்பிடத்தைப் பயன்படுத்து", locating: "இருப்பிடம் தேடப்படுகிறது…",
    locationNeeded: "உங்கள் அருகில் என்ன பதிவாகியுள்ளது எனப் பார்க்க இருப்பிடத்தை இயக்குங்கள்.",
    locationFail: "இருப்பிடம் கிடைக்கவில்லை. அனுமதி கொடுத்து மீண்டும் முயற்சியுங்கள்.",
    report: "நீங்கள் கடந்ததைப் பதிவு செய்", reporting: "பதிவாகிறது…",
    nearby: "உங்கள் அருகில்", nothing: "{r} கி.மீ.க்குள் எதுவும் பதிவாகவில்லை. வீதி தெளிவு.",
    radius: "தேடும் தூரம்", refresh: "புதுப்பி",
    away: "கி.மீ தூரம்", left: "நிமிடம் மீதம்", ago: "நிமிடம் முன்பு",
    confirmations: "உறுதிப்படுத்தல்கள்",
    stillThere: "இன்னும் இருக்கு", gone: "போயிட்டாங்க",
    directions: "வரைபடம்",
    reliability_confirmed: "உறுதி", reliability_corroborated: "ஆதரிக்கப்பட்டது",
    reliability_fresh: "புதியது", reliability_unconfirmed: "உறுதிப்படுத்தப்படவில்லை",
    roadName: "வீதி அல்லது அடையாளம் (விருப்பம்)", note: "குறிப்பு (விருப்பம்)",
    loading: "ஏற்றப்படுகிறது…", failed: "ஏற்ற முடியவில்லை. Backend port 8000-ல் இயங்குகிறதா?",
    thanks: "நன்றி — பதிவானது.", merged: "இதை ஏற்கனவே யாரோ குறித்திருந்தார்கள். உங்கள் உறுதிப்படுத்தல் சேர்க்கப்பட்டது.",
    safety: "வீதிக்கும் சட்டத்துக்கும் ஏற்ப ஓட்டுங்கள்",
  },
  si: {
    title: "මාර්ග බාධක සහ වේග උගුල්",
    sub: "ඉදිරි මාර්ගයේ අනෙක් රියදුරන් සලකුණු කළ දේ. වාර්තා තනිවම මැකී යයි — ජංගම වේග තුවක්කුවක් මිනිත්තු 90කින්, බාධකයක් පැය තුනකින්.",
    locate: "මගේ ස්ථානය භාවිතා කරන්න", locating: "ඔබව සොයමින්…",
    locationNeeded: "ඔබ අසල වාර්තා වී ඇති දේ බැලීමට ස්ථානය සක්‍රීය කරන්න.",
    locationFail: "ඔබේ ස්ථානය ලබාගත නොහැකි විය. අවසර දී නැවත උත්සාහ කරන්න.",
    report: "ඔබ පසුකළ දේ වාර්තා කරන්න", reporting: "වාර්තා වෙමින්…",
    nearby: "ඔබ අසල", nothing: "කිලෝමීටර {r} ඇතුළත වාර්තා නොමැත. මාර්ගය පැහැදිලියි.",
    radius: "සෙවුම් දුර", refresh: "නැවුම් කරන්න",
    away: "කි.මී. දුරින්", left: "මිනිත්තු ඉතිරියි", ago: "මිනිත්තුවකට පෙර",
    confirmations: "තහවුරු කිරීම්",
    stillThere: "තවම තියෙනවා", gone: "දැන් නැහැ",
    directions: "සිතියම",
    reliability_confirmed: "තහවුරුයි", reliability_corroborated: "සනාථයි",
    reliability_fresh: "අලුත්", reliability_unconfirmed: "තහවුරු නොවූ",
    roadName: "මාර්ගය හෝ සලකුණ (විකල්ප)", note: "සටහන (විකල්ප)",
    loading: "පූරණය වෙමින්…", failed: "පූරණය කළ නොහැකි විය. Backend port 8000 හි ක්‍රියාත්මකද?",
    thanks: "ස්තූතියි — වාර්තා විය.", merged: "යමෙක් දැනටමත් මෙය සලකුණු කර ඇත. ඔබේ තහවුරු කිරීම එකතු විය.",
    safety: "මාර්ගයට සහ නීතියට අනුව රිය පදවන්න",
  },
};

type LabelKey = keyof typeof UI.en;

const KIND_ICON: Record<string, any> = {
  police_checkpoint: ShieldAlert,
  speed_gun: Gauge,
  speed_camera: Camera,
  breathalyser: Wine,
  road_block: Construction,
};

const RELIABILITY_STYLE: Record<string, string> = {
  confirmed:    "bg-go/10 text-go border-go/30",
  corroborated: "bg-signal/10 text-signal border-signal/30",
  fresh:        "bg-signal/10 text-signal border-signal/30",
  unconfirmed:  "bg-slate-100 text-slate-500 border-slate-300 dark:bg-asphalt-700 dark:border-asphalt-700",
};

export default function CheckpointsPage() {
  const { lang } = useLang();
  const tr = (k: LabelKey): string => UI[(lang as "en" | "ta" | "si")]?.[k] ?? UI.en[k];

  const [pos, setPos] = useState<{ lat: number; lon: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState(false);

  const [data, setData] = useState<any>(null);
  const [kinds, setKinds] = useState<any[]>([]);
  const [radius, setRadius] = useState(15);
  const [error, setError] = useState(false);

  const [reporting, setReporting] = useState<string | null>(null);
  const [flash, setFlash] = useState("");
  const [extra, setExtra] = useState({ road_name: "", note: "" });

  useEffect(() => {
    CheckpointApi.kinds()
      .then((k) => setKinds(k.kinds))
      .catch(() => setError(true));
  }, []);

  const locate = () => {
    if (!navigator.geolocation) { setLocError(true); return; }
    setLocating(true);
    setLocError(false);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPos({ lat: p.coords.latitude, lon: p.coords.longitude });
        setLocating(false);
      },
      () => { setLocError(true); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const refresh = async (lat: number, lon: number, r = radius) => {
    try {
      setData(await CheckpointApi.nearby(lat, lon, r));
      setError(false);
    } catch {
      setError(true);
    }
  };

  useEffect(() => { if (pos) refresh(pos.lat, pos.lon); }, [pos, radius]);

  const submitReport = async (kind: string) => {
    if (!pos) return;
    setReporting(kind);
    try {
      const res = await CheckpointApi.report({
        kind,
        latitude: pos.lat,
        longitude: pos.lon,
        road_name: extra.road_name || undefined,
        note: extra.note || undefined,
      });
      setFlash(res.merged ? tr("merged") : tr("thanks"));
      setExtra({ road_name: "", note: "" });
      setTimeout(() => setFlash(""), 4000);
      refresh(pos.lat, pos.lon);
    } catch {
      setError(true);
    } finally {
      setReporting(null);
    }
  };

  const act = async (id: number, what: "confirm" | "clear") => {
    await (what === "confirm" ? CheckpointApi.confirm(id) : CheckpointApi.clear(id));
    if (pos) refresh(pos.lat, pos.lon);
  };

  if (error && !kinds.length) {
    return (
      <div className="card border-alert/30 bg-alert/5 flex items-start gap-3">
        <AlertTriangle className="text-alert shrink-0 mt-0.5" size={18} />
        <p className="text-sm text-slate-600 dark:text-slate-300">{tr("failed")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display">{tr("title")}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">{tr("sub")}</p>
      </div>

      {/* Safety first — this feature must never encourage bad driving */}
      <div className="card border-signal/40 bg-signal/5 flex items-start gap-3">
        <ShieldAlert className="text-signal shrink-0 mt-0.5" size={18} />
        <div>
          <p className="text-sm font-bold">{tr("safety")}</p>
          {data?.disclaimer && (
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{data.disclaimer}</p>
          )}
        </div>
      </div>

      {!pos ? (
        <div className="card text-center p-8 space-y-3">
          <MapPin size={28} className="text-signal mx-auto" />
          <p className="text-sm text-slate-500">{locError ? tr("locationFail") : tr("locationNeeded")}</p>
          <button className="btn-primary" onClick={locate} disabled={locating}>
            <Navigation size={15} /> {locating ? tr("locating") : tr("locate")}
          </button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Nearby list */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold font-display text-sm">
                {tr("nearby")} {data && <span className="text-slate-400 font-normal">({data.count})</span>}
              </p>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500">{tr("radius")}</label>
                <select className="input py-1 px-2 text-xs w-auto" value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}>
                  {[5, 15, 30, 60].map((r) => <option key={r} value={r}>{r} km</option>)}
                </select>
                <button className="btn-ghost py-1 px-2 text-xs" onClick={() => refresh(pos.lat, pos.lon)}>
                  <RefreshCw size={12} /> {tr("refresh")}
                </button>
              </div>
            </div>

            {!data ? (
              <div className="card flex flex-col items-center justify-center p-10 space-y-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-signal" />
                <p className="text-slate-600 dark:text-slate-300 font-medium">{tr("loading")}</p>
              </div>
            ) : data.reports.length === 0 ? (
              <div className="card text-center p-8 space-y-2">
                <CheckCircle2 size={26} className="text-go mx-auto" />
                <p className="text-sm text-slate-500">{tr("nothing").replace("{r}", String(radius))}</p>
              </div>
            ) : (
              data.reports.map((r: any) => {
                const Icon = KIND_ICON[r.kind] ?? ShieldAlert;
                return (
                  <div key={r.id} className="card space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <Icon size={18} className="text-signal shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">{r.kind_label}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500">
                            <span className="font-medium text-signal">{r.distance_km} {tr("away")}</span>
                            {r.road_name && <span>· {r.road_name}</span>}
                            <span className="flex items-center gap-1">
                              · <Clock size={10} /> {r.age_minutes} {tr("ago")}
                            </span>
                            <span>· {r.minutes_left} {tr("left")}</span>
                          </div>
                          {r.note && <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{r.note}</p>}
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${RELIABILITY_STYLE[r.reliability]}`}>
                        {tr(`reliability_${r.reliability}` as LabelKey)}
                        {r.confirmations > 0 && ` · ${r.confirmations}`}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 dark:border-asphalt-700 pt-3">
                      <button className="btn-ghost py-1.5 text-xs" onClick={() => act(r.id, "confirm")}>
                        <ThumbsUp size={13} /> {tr("stillThere")}
                      </button>
                      <button className="btn-ghost py-1.5 text-xs" onClick={() => act(r.id, "clear")}>
                        <CheckCircle2 size={13} /> {tr("gone")}
                      </button>
                      <a href={r.maps_url} target="_blank" rel="noopener noreferrer"
                        className="btn-ghost py-1.5 text-xs ml-auto">
                        <ExternalLink size={13} /> {tr("directions")}
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Report panel */}
          <div className="lg:col-span-5 space-y-4">
            <div className="card space-y-3">
              <p className="font-bold font-display text-sm flex items-center gap-2">
                <MapPin size={15} className="text-signal" /> {tr("report")}
              </p>
              <p className="text-[11px] text-slate-500">
                {pos.lat.toFixed(5)}, {pos.lon.toFixed(5)}
              </p>

              <div className="grid gap-2">
                <input className="input py-2 text-sm" placeholder={tr("roadName")} value={extra.road_name}
                  onChange={(e) => setExtra((x) => ({ ...x, road_name: e.target.value }))} />
                <input className="input py-2 text-sm" placeholder={tr("note")} value={extra.note}
                  onChange={(e) => setExtra((x) => ({ ...x, note: e.target.value }))} />
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {kinds.map((k) => {
                  const Icon = KIND_ICON[k.key] ?? ShieldAlert;
                  return (
                    <button key={k.key} className="btn-ghost py-2 text-xs justify-start"
                      onClick={() => submitReport(k.key)} disabled={reporting !== null}>
                      <Icon size={14} className="text-signal shrink-0" />
                      <span className="truncate">{reporting === k.key ? tr("reporting") : k.label}</span>
                    </button>
                  );
                })}
              </div>

              {flash && (
                <p className="text-xs text-go flex items-center gap-1.5">
                  <CheckCircle2 size={13} /> {flash}
                </p>
              )}
            </div>

            {kinds.length > 0 && (
              <div className="card space-y-2">
                <p className="font-bold font-display text-sm flex items-center gap-2">
                  <Info size={15} className="text-signal" /> {tr("radius")}
                </p>
                {kinds.map((k) => (
                  <div key={k.key} className="text-xs flex items-start justify-between gap-2">
                    <span className="min-w-0">
                      <span className="font-medium">{k.label}</span>
                      <span className="text-slate-500"> — {k.hint}</span>
                    </span>
                    <span className="text-slate-400 shrink-0 whitespace-nowrap">
                      {k.lifetime_minutes >= 1440
                        ? `${Math.round(k.lifetime_minutes / 1440)} d`
                        : `${Math.round(k.lifetime_minutes / 60)} h`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
