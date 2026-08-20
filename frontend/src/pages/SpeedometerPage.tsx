import { useEffect, useRef, useState } from "react";
import { useLang } from "@/context/LanguageContext";
import { useSpeech } from "@/hooks/useSpeech";
import { ZonesApi } from "@/services/api";
import {
  Play, Square, AlertTriangle, Info, MapPin,
  GraduationCap, Cross, Volume2, VolumeX, Gauge, ShieldAlert, TriangleAlert,
} from "lucide-react";
import type { Lang } from "@/types";

// ── Trilingual UI labels ─────────────────────────────────────────────────────
const UI = {
  en: {
    title: "Live Speed & Zone Warnings",
    sub: "Your speed from GPS against the limit that actually applies where you are — including school and hospital zones, and a warning as you approach an accident blackspot.",
    start: "Start", stop: "Stop", starting: "Getting a fix…",
    denied: "Location permission denied. Allow access and try again.",
    unsupported: "This browser cannot report speed from GPS.",
    idle: "Press start. Speed comes from your device's GPS — it needs to be moving outdoors to read.",
    limit: "Limit", basis: "Applies because", speed: "Speed", noSpeed: "No speed reading",
    inZone: "In a zone", approaching: "Approaching",
    blackspots: "Accident blackspots nearby", noBlackspots: "No blackspots within 10 km.",
    away: "km away", risk: "Risk",
    zones: "Zones the app knows", limits: "Speed limits by road class",
    voiceOn: "Voice on", voiceOff: "Voice off",
    accuracy: "GPS accuracy", dataNote: "About this data",
    over: "OVER THE LIMIT", near: "At the limit", ok: "Within the limit", unknown: "Waiting for GPS",
    roadClass: "Road type",
    failed: "Could not reach the backend on port 8000.",
  },
  ta: {
    title: "நேரலை வேகம் & மண்டல எச்சரிக்கை",
    sub: "GPS-ல் இருந்து உங்கள் வேகம், நீங்கள் இருக்கும் இடத்தில் பொருந்தும் வேக வரம்புடன் ஒப்பிடப்படும் — பாடசாலை, மருத்துவமனை மண்டலங்கள் உட்பட, விபத்து மண்டலம் நெருங்கும்போது எச்சரிக்கையும்.",
    start: "தொடங்கு", stop: "நிறுத்து", starting: "இருப்பிடம் தேடப்படுகிறது…",
    denied: "இருப்பிட அனுமதி மறுக்கப்பட்டது. அனுமதி கொடுத்து மீண்டும் முயற்சியுங்கள்.",
    unsupported: "இந்த browser GPS வேகத்தைத் தர முடியாது.",
    idle: "தொடங்க அழுத்துங்கள். வேகம் GPS-ல் இருந்து வரும் — வெளியில் நகர்ந்தால் தான் கிடைக்கும்.",
    limit: "வரம்பு", basis: "ஏன் பொருந்துகிறது", speed: "வேகம்", noSpeed: "வேகம் கிடைக்கவில்லை",
    inZone: "மண்டலத்துக்குள்", approaching: "நெருங்குகிறது",
    blackspots: "அருகிலுள்ள விபத்து மண்டலங்கள்", noBlackspots: "10 கி.மீ.க்குள் எதுவும் இல்லை.",
    away: "கி.மீ தூரம்", risk: "அபாயம்",
    zones: "அறியப்பட்ட மண்டலங்கள்", limits: "வீதி வகைப்படி வேக வரம்பு",
    voiceOn: "குரல் இயக்கம்", voiceOff: "குரல் நிறுத்தம்",
    accuracy: "GPS துல்லியம்", dataNote: "இந்தத் தரவு பற்றி",
    over: "வரம்பை மீறுகிறீர்கள்", near: "வரம்பில்", ok: "வரம்புக்குள்", unknown: "GPS-க்காக காத்திருப்பு",
    roadClass: "வீதி வகை",
    failed: "Backend port 8000-ஐ அணுக முடியவில்லை.",
  },
  si: {
    title: "සජීවී වේගය සහ කලාප අනතුරු ඇඟවීම්",
    sub: "GPS වෙතින් ඔබේ වේගය, ඔබ සිටින ස්ථානයට අදාළ සීමාව සමඟ සසඳයි — පාසල් සහ රෝහල් කලාප ඇතුළුව, අනතුරු කලාපයකට ළං වන විට අනතුරු ඇඟවීමක් ද.",
    start: "අරඹන්න", stop: "නවත්වන්න", starting: "ස්ථානය සොයමින්…",
    denied: "ස්ථාන අවසරය ප්‍රතික්ෂේප විය. අවසර දී නැවත උත්සාහ කරන්න.",
    unsupported: "මෙම browser එකට GPS වේගය දිය නොහැක.",
    idle: "අරඹන්න ඔබන්න. වේගය GPS වෙතින් ලැබේ — පිටත ගමන් කරන විට පමණක් ලැබේ.",
    limit: "සීමාව", basis: "අදාළ වන්නේ", speed: "වේගය", noSpeed: "වේග කියවීමක් නැත",
    inZone: "කලාපය තුළ", approaching: "ළං වෙමින්",
    blackspots: "අසල අනතුරු කලාප", noBlackspots: "කිලෝමීටර 10 ඇතුළත කිසිවක් නැත.",
    away: "කි.මී. දුරින්", risk: "අවදානම",
    zones: "දන්නා කලාප", limits: "මාර්ග වර්ගය අනුව සීමා",
    voiceOn: "හඬ සක්‍රීයයි", voiceOff: "හඬ අක්‍රීයයි",
    accuracy: "GPS නිරවද්‍යතාව", dataNote: "මෙම දත්ත ගැන",
    over: "සීමාව ඉක්මවා ඇත", near: "සීමාවේ", ok: "සීමාව තුළ", unknown: "GPS බලාපොරොත්තුවෙන්",
    roadClass: "මාර්ග වර්ගය",
    failed: "Backend port 8000 වෙත ළඟා විය නොහැක.",
  },
};

type LabelKey = keyof typeof UI.en;

const STATUS_STYLE: Record<string, { ring: string; tone: string; bg: string }> = {
  ok:      { ring: "ring-go/50",      tone: "text-go",      bg: "bg-go/5" },
  near:    { ring: "ring-signal/50",  tone: "text-signal",  bg: "bg-signal/5" },
  over:    { ring: "ring-alert/50",   tone: "text-alert",   bg: "bg-alert/5" },
  unknown: { ring: "ring-slate-300",  tone: "text-slate-500", bg: "" },
};

const RISK_STYLE: Record<string, string> = {
  high:   "bg-alert/10 text-alert border-alert/30",
  medium: "bg-signal/10 text-signal border-signal/30",
  low:    "bg-slate-100 text-slate-500 border-slate-300 dark:bg-asphalt-700 dark:border-asphalt-700",
};

const ZONE_ICON: Record<string, any> = { school: GraduationCap, hospital: Cross };

const SPEAK_COOLDOWN_MS = 8000;

export default function SpeedometerPage() {
  const { lang } = useLang();
  const tr = (k: LabelKey): string => UI[(lang as "en" | "ta" | "si")]?.[k] ?? UI.en[k];
  const { speak } = useSpeech(lang as Lang);

  const [running, setRunning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [locError, setLocError] = useState("");
  const [backendError, setBackendError] = useState(false);

  const [pos, setPos] = useState<{ lat: number; lon: number; accuracy: number } | null>(null);
  const [check, setCheck] = useState<any>(null);
  const [blackspots, setBlackspots] = useState<any>(null);
  const [limits, setLimits] = useState<any>(null);
  const [roadClass, setRoadClass] = useState("urban");
  const [voice, setVoice] = useState(true);

  const watchRef = useRef<number | null>(null);
  const lastSpokeRef = useRef(0);
  const lastBlackspotRef = useRef<string | null>(null);
  const voiceRef = useRef(voice);
  const roadClassRef = useRef(roadClass);
  useEffect(() => { voiceRef.current = voice; }, [voice]);
  useEffect(() => { roadClassRef.current = roadClass; }, [roadClass]);

  useEffect(() => {
    ZonesApi.limits().then(setLimits).catch(() => setBackendError(true));
    return () => { if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current); };
  }, []);

  const handleFix = async (p: GeolocationPosition) => {
    const lat = p.coords.latitude;
    const lon = p.coords.longitude;
    // coords.speed is metres per second, and null when the device cannot tell
    const kmh = p.coords.speed != null && p.coords.speed >= 0 ? p.coords.speed * 3.6 : null;
    setPos({ lat, lon, accuracy: Math.round(p.coords.accuracy) });

    try {
      const [res, spots] = await Promise.all([
        ZonesApi.speedCheck(lat, lon, kmh, roadClassRef.current),
        ZonesApi.blackspots(lat, lon, 10),
      ]);
      setCheck(res);
      setBlackspots(spots);
      setBackendError(false);

      const now = Date.now();
      if (res.speak && voiceRef.current && now - lastSpokeRef.current > SPEAK_COOLDOWN_MS) {
        lastSpokeRef.current = now;
        speak(res.message);
      }
      // Warn once per blackspot rather than on every fix
      if (spots.alert && voiceRef.current && spots.alert.name !== lastBlackspotRef.current) {
        lastBlackspotRef.current = spots.alert.name;
        speak(spots.alert.message);
      } else if (!spots.alert) {
        lastBlackspotRef.current = null;
      }
    } catch {
      setBackendError(true);
    }
  };

  const start = () => {
    if (!navigator.geolocation) { setLocError(tr("unsupported")); return; }
    setLocError("");
    setStarting(true);
    watchRef.current = navigator.geolocation.watchPosition(
      (p) => { setStarting(false); setRunning(true); handleFix(p); },
      () => { setStarting(false); setLocError(tr("denied")); },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
    );
  };

  const stop = () => {
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    watchRef.current = null;
    window.speechSynthesis?.cancel();
    setRunning(false);
  };

  const status = check?.status ?? "unknown";
  const style = STATUS_STYLE[status] ?? STATUS_STYLE.unknown;
  const statusLabel =
    status === "over" ? tr("over") : status === "near" ? tr("near")
    : status === "ok" ? tr("ok") : tr("unknown");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display">{tr("title")}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">{tr("sub")}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button className="btn-ghost px-2.5 py-2" onClick={() => setVoice((v) => !v)}
            title={voice ? tr("voiceOn") : tr("voiceOff")} aria-label={voice ? tr("voiceOn") : tr("voiceOff")}>
            {voice ? <Volume2 size={16} /> : <VolumeX size={16} className="text-slate-400" />}
          </button>
          {running ? (
            <button className="btn-ghost text-alert border-alert/30" onClick={stop}>
              <Square size={15} /> {tr("stop")}
            </button>
          ) : (
            <button className="btn-primary" onClick={start} disabled={starting}>
              <Play size={15} /> {starting ? tr("starting") : tr("start")}
            </button>
          )}
        </div>
      </div>

      {backendError && (
        <div className="card border-alert/30 bg-alert/5 flex items-start gap-3">
          <AlertTriangle className="text-alert shrink-0 mt-0.5" size={18} />
          <p className="text-sm text-slate-600 dark:text-slate-300">{tr("failed")}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-4">
          {/* Speedometer */}
          <div className={`card p-6 ${running ? style.bg : ""}`}>
            {!running ? (
              <p className="text-sm text-slate-500 text-center py-8">{locError || tr("idle")}</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-8">
                  <div className={`rounded-full ring-8 ${style.ring} h-40 w-40 flex flex-col
                      items-center justify-center bg-white dark:bg-asphalt-800 shadow-sm`}>
                    <span className={`display text-5xl font-bold ${style.tone}`}>
                      {check?.speed_kmh != null ? Math.round(check.speed_kmh) : "—"}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">km/h</span>
                  </div>
                  <div className="text-center">
                    <div className="rounded-full border-[6px] border-alert h-24 w-24 flex items-center
                        justify-center bg-white dark:bg-asphalt-800">
                      <span className="display text-3xl font-bold text-asphalt-900 dark:text-slate-100">
                        {check?.limit_kmh ?? "—"}
                      </span>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-2">
                      {tr("limit")}
                    </p>
                  </div>
                </div>

                <div className="text-center space-y-1">
                  <p className={`text-sm font-bold ${style.tone}`}>{statusLabel}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{check?.message}</p>
                  {check?.limit_basis && (
                    <p className="text-[11px] text-slate-400">
                      {tr("basis")}: {check.limit_basis}
                    </p>
                  )}
                  {check?.speed_kmh == null && (
                    <p className="text-[11px] text-slate-400">{tr("noSpeed")}</p>
                  )}
                </div>

                {check?.approach_warning && (
                  <div className="rounded-xl border border-signal/40 bg-signal/5 p-3 flex items-start gap-2.5">
                    <TriangleAlert size={16} className="text-signal shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-700 dark:text-slate-200">{check.approach_warning}</p>
                  </div>
                )}

                {blackspots?.alert && (
                  <div className="rounded-xl border border-alert/40 bg-alert/5 p-3 flex items-start gap-2.5">
                    <ShieldAlert size={16} className="text-alert shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-alert">{blackspots.alert.name}</p>
                      <p className="text-xs text-slate-700 dark:text-slate-200 mt-0.5">
                        {blackspots.alert.distance_m} m — {blackspots.alert.reason}
                      </p>
                    </div>
                  </div>
                )}

                {pos && (
                  <p className="text-[11px] text-slate-400 text-center">
                    {pos.lat.toFixed(5)}, {pos.lon.toFixed(5)} · {tr("accuracy")} ±{pos.accuracy} m
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Zone status */}
          {running && check?.in_zone && (
            <div className="card border-signal/40 bg-signal/5 flex items-start gap-3">
              {(() => { const I = ZONE_ICON[check.zone.kind] ?? MapPin; return <I size={18} className="text-signal shrink-0 mt-0.5" />; })()}
              <div>
                <p className="text-sm font-bold">{tr("inZone")}: {check.zone.name}</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  {tr("limit")} {check.zone.limit_kmh} km/h · {check.zone.active_hours}
                </p>
              </div>
            </div>
          )}

          {/* Road class picker — GPS cannot tell an A-road from a lane */}
          <div className="card space-y-2">
            <p className="font-bold font-display text-sm flex items-center gap-2">
              <Gauge size={15} className="text-signal" /> {tr("roadClass")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(limits?.road_classes ?? []).filter((c: any) => !["school", "hospital"].includes(c.key)).map((c: any) => (
                <button key={c.key} onClick={() => setRoadClass(c.key)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${
                    roadClass === c.key
                      ? "bg-signal text-asphalt-900 border-signal"
                      : "border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-asphalt-700 dark:text-slate-300 dark:hover:bg-asphalt-700"
                  }`}>
                  {c.label} · {c.limit_kmh}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400">
              A zone limit always overrides this.
            </p>
          </div>
        </div>

        {/* Side */}
        <div className="lg:col-span-5 space-y-4">
          <div className="card space-y-3">
            <p className="font-bold font-display text-sm flex items-center gap-2">
              <ShieldAlert size={15} className="text-alert" /> {tr("blackspots")}
            </p>
            {!blackspots ? (
              <p className="text-xs text-slate-500">{running ? "…" : tr("noBlackspots")}</p>
            ) : blackspots.count === 0 ? (
              <p className="text-xs text-slate-500">{tr("noBlackspots")}</p>
            ) : (
              blackspots.blackspots.slice(0, 6).map((b: any) => (
                <div key={b.id} className={`rounded-xl border p-3 ${b.approaching ? "border-alert/40 bg-alert/5" : "border-slate-200 dark:border-asphalt-700"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold min-w-0">{b.name}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${RISK_STYLE[b.risk]}`}>
                      {b.risk}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{b.reason}</p>
                  <p className="text-[11px] text-signal font-medium mt-1">
                    {b.distance_km} {tr("away")}
                    {b.source === "reports" && ` · ${b.report_count} reports`}
                  </p>
                </div>
              ))
            )}
          </div>

          {limits && (
            <div className="card space-y-2">
              <p className="font-bold font-display text-sm">{tr("limits")}</p>
              {limits.road_classes.map((c: any) => (
                <div key={c.key} className="flex items-start justify-between gap-2 text-xs">
                  <span className="min-w-0">
                    <span className="font-medium">{c.label}</span>
                    <span className="text-slate-500"> — {c.note}</span>
                  </span>
                  <span className="display font-bold text-signal shrink-0">{c.limit_kmh}</span>
                </div>
              ))}
            </div>
          )}

          <div className="card border-slate-200 dark:border-asphalt-700 flex gap-3">
            <Info className="text-slate-400 shrink-0 mt-0.5" size={16} />
            <div>
              <p className="text-xs font-bold mb-1">{tr("dataNote")}</p>
              <p className="text-xs text-slate-500">
                {blackspots?.data_note ?? limits?.data_note}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
