import { useEffect, useRef, useState } from "react";
import { useLang } from "@/context/LanguageContext";
import { useSpeech } from "@/hooks/useSpeech";
import { FatigueApi } from "@/services/api";
import {
  Eye, EyeOff, Play, Square, AlertTriangle, Info, Activity,
  ShieldAlert, Volume2, VolumeX, Camera, Gauge, Timer,
} from "lucide-react";
import type { Lang } from "@/types";

// ── Trilingual UI labels ─────────────────────────────────────────────────────
const UI = {
  en: {
    title: "Driver Fatigue Monitor",
    sub: "Watches your eyes and head through the webcam and warns you before a microsleep becomes a crash.",
    start: "Start monitoring", stop: "Stop", starting: "Starting camera…",
    camDenied: "Camera permission denied. Allow access and try again.",
    calibrating: "Calibrating to your face — look ahead normally",
    ear: "Eye openness (EAR)", perclos: "PERCLOS", blinks: "Blinks", session: "Monitoring for",
    head: "Head", yaw: "Turn", pitch: "Tilt", alerts: "Alerts raised",
    statusOk: "Alert", statusDrowsy: "Drowsy", statusAlertState: "Microsleep",
    statusDistracted: "Distracted", statusNoFace: "No face",
    voiceOn: "Voice alerts on", voiceOff: "Voice alerts off",
    how: "How it works", privacy: "Privacy", limits: "Important limitation",
    threshold: "Closed below",
    idle: "Press start. Your face stays on this machine — only the numbers are sent.",
    failed: "Could not reach the backend on port 8000.",
    secs: "s",
  },
  ta: {
    title: "சாரதி சோர்வு கண்காணிப்பு",
    sub: "Webcam மூலம் உங்கள் கண்களையும் தலையையும் கவனித்து, கண அயர்வு விபத்தாக மாறும் முன் எச்சரிக்கும்.",
    start: "கண்காணிப்பைத் தொடங்கு", stop: "நிறுத்து", starting: "கேமரா தொடங்குகிறது…",
    camDenied: "கேமரா அனுமதி மறுக்கப்பட்டது. அனுமதி கொடுத்து மீண்டும் முயற்சியுங்கள்.",
    calibrating: "உங்கள் முகத்துக்கு calibrate ஆகிறது — சாதாரணமாக முன்னால் பாருங்கள்",
    ear: "கண் திறப்பு (EAR)", perclos: "PERCLOS", blinks: "இமைத்தல்", session: "கண்காணிப்பு நேரம்",
    head: "தலை", yaw: "திரும்பல்", pitch: "சாய்வு", alerts: "எச்சரிக்கைகள்",
    statusOk: "விழிப்பு", statusDrowsy: "சோர்வு", statusAlertState: "கண அயர்வு",
    statusDistracted: "கவனச்சிதறல்", statusNoFace: "முகம் இல்லை",
    voiceOn: "குரல் எச்சரிக்கை இயக்கம்", voiceOff: "குரல் எச்சரிக்கை நிறுத்தம்",
    how: "எப்படி வேலை செய்யுது", privacy: "தனியுரிமை", limits: "முக்கிய வரம்பு",
    threshold: "இதற்குக் கீழ் மூடியது",
    idle: "தொடங்க அழுத்துங்கள். உங்கள் முகம் இந்தக் கணினியிலேயே இருக்கும் — எண்கள் மட்டுமே அனுப்பப்படும்.",
    failed: "Backend port 8000-ஐ அணுக முடியவில்லை.",
    secs: "வி",
  },
  si: {
    title: "රියදුරු වෙහෙස නිරීක්ෂණය",
    sub: "Webcam හරහා ඔබේ ඇස් සහ ඉස නිරීක්ෂණය කර, ක්ෂණික නින්දක් අනතුරක් වීමට පෙර අනතුරු අඟවයි.",
    start: "නිරීක්ෂණය අරඹන්න", stop: "නවත්වන්න", starting: "කැමරාව ආරම්භ වෙමින්…",
    camDenied: "කැමරා අවසරය ප්‍රතික්ෂේප විය. අවසර දී නැවත උත්සාහ කරන්න.",
    calibrating: "ඔබේ මුහුණට සකසමින් — සාමාන්‍ය ලෙස ඉදිරිය බලන්න",
    ear: "ඇස් විවෘතභාවය (EAR)", perclos: "PERCLOS", blinks: "ඇසිපිය ගැසීම්", session: "නිරීක්ෂණ කාලය",
    head: "හිස", yaw: "හැරවීම", pitch: "නැඹුරුව", alerts: "අනතුරු ඇඟවීම්",
    statusOk: "අවදියෙන්", statusDrowsy: "නිදිමත", statusAlertState: "ක්ෂණික නින්ද",
    statusDistracted: "අවධානය බිඳුණු", statusNoFace: "මුහුණ නැත",
    voiceOn: "හඬ අනතුරු ඇඟවීම් සක්‍රීයයි", voiceOff: "හඬ අනතුරු ඇඟවීම් අක්‍රීයයි",
    how: "ක්‍රියා කරන ආකාරය", privacy: "පෞද්ගලිකත්වය", limits: "වැදගත් සීමාව",
    threshold: "මෙයට වඩා අඩු නම් වසා ඇත",
    idle: "අරඹන්න ඔබන්න. ඔබේ මුහුණ මෙම පරිගණකයේම රැඳේ — අංක පමණක් යවනු ලැබේ.",
    failed: "Backend port 8000 වෙත ළඟා විය නොහැක.",
    secs: "ත",
  },
};

type LabelKey = keyof typeof UI.en;

const STATUS_STYLE: Record<string, { box: string; tone: string; ring: string; icon: any }> = {
  ok:         { box: "border-go/40 bg-go/5",               tone: "text-go",         ring: "ring-go/40",         icon: Eye },
  drowsy:     { box: "border-signal/40 bg-signal/5",       tone: "text-signal",     ring: "ring-signal/40",     icon: EyeOff },
  distracted: { box: "border-orange-500/40 bg-orange-500/5", tone: "text-orange-500", ring: "ring-orange-500/40", icon: AlertTriangle },
  alert:      { box: "border-alert/40 bg-alert/5",         tone: "text-alert",      ring: "ring-alert/40",      icon: ShieldAlert },
  no_face:    { box: "border-slate-300 dark:border-asphalt-700", tone: "text-slate-500", ring: "ring-slate-300", icon: Camera },
};

const FRAME_INTERVAL_MS = 400;   // ~2.5 fps is plenty for PERCLOS and cheap on CPU
const SPEAK_COOLDOWN_MS = 4000;  // do not talk over yourself

export default function FatiguePage() {
  const { lang } = useLang();
  const tr = (k: LabelKey): string => UI[(lang as "en" | "ta" | "si")]?.[k] ?? UI.en[k];
  const { speak } = useSpeech(lang as Lang);

  const [running, setRunning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [camError, setCamError] = useState("");
  const [result, setResult] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [voice, setVoice] = useState(true);
  const [backendError, setBackendError] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const busyRef = useRef(false);
  const lastSpokeRef = useRef(0);
  const sessionIdRef = useRef(
    `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
  );
  // Read inside the interval callback, which closes over the first render's state
  const voiceRef = useRef(voice);
  useEffect(() => { voiceRef.current = voice; }, [voice]);

  useEffect(() => {
    FatigueApi.config().then(setConfig).catch(() => setBackendError(true));
    return () => stopEverything();
  }, []);

  const stopEverything = () => {
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    window.speechSynthesis?.cancel();
  };

  const sendFrame = async () => {
    if (busyRef.current) return;            // never queue frames behind a slow response
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    busyRef.current = true;
    try {
      const w = 480;
      const h = Math.round((video.videoHeight / video.videoWidth) * w) || 360;
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(video, 0, 0, w, h);

      const blob: Blob | null = await new Promise((res) =>
        canvas.toBlob((b) => res(b), "image/jpeg", 0.7)
      );
      if (!blob) return;

      const res = await FatigueApi.analyze(sessionIdRef.current, blob);
      setResult(res);
      setBackendError(false);

      if (res.speak && voiceRef.current && Date.now() - lastSpokeRef.current > SPEAK_COOLDOWN_MS) {
        lastSpokeRef.current = Date.now();
        speak(res.message);
      }
    } catch {
      setBackendError(true);
    } finally {
      busyRef.current = false;
    }
  };

  const start = async () => {
    setCamError("");
    setStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      await FatigueApi.reset(sessionIdRef.current).catch(() => {});
      setRunning(true);
      timerRef.current = window.setInterval(sendFrame, FRAME_INTERVAL_MS);
    } catch {
      setCamError(tr("camDenied"));
    } finally {
      setStarting(false);
    }
  };

  const stop = () => {
    stopEverything();
    setRunning(false);
    setResult(null);
  };

  const status = result?.status ?? "no_face";
  const style = STATUS_STYLE[status] ?? STATUS_STYLE.no_face;
  const StatusIcon = style.icon;
  const statusLabel =
    status === "ok" ? tr("statusOk")
    : status === "drowsy" ? tr("statusDrowsy")
    : status === "alert" ? tr("statusAlertState")
    : status === "distracted" ? tr("statusDistracted")
    : tr("statusNoFace");

  // EAR maps roughly 0 → 0.45; show it as a proportion of the open baseline
  const earPct = result?.ear != null
    ? Math.min(100, (result.ear / Math.max(0.05, result.baseline_ear ?? 0.3)) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display">{tr("title")}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">{tr("sub")}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button className="btn-ghost px-2.5 py-2" onClick={() => setVoice((v) => !v)}
            aria-label={voice ? tr("voiceOn") : tr("voiceOff")} title={voice ? tr("voiceOn") : tr("voiceOff")}>
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
        {/* Camera + verdict */}
        <div className="lg:col-span-7 space-y-4">
          <div className={`card p-3 space-y-3 ${running ? style.box : ""}`}>
            <div className="relative rounded-xl overflow-hidden bg-slate-900 aspect-video">
              <video ref={videoRef} muted playsInline
                className={`w-full h-full object-cover scale-x-[-1] ${running ? "" : "opacity-30"}`} />
              <canvas ref={canvasRef} className="hidden" />

              {!running && (
                <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                  <p className="text-sm text-slate-300">{camError || tr("idle")}</p>
                </div>
              )}

              {running && result && (
                <div className={`absolute top-3 left-3 rounded-xl px-3 py-2 backdrop-blur
                    bg-black/50 ring-2 ${style.ring} flex items-center gap-2`}>
                  <StatusIcon size={18} className={style.tone} />
                  <span className={`text-sm font-bold ${style.tone}`}>{statusLabel}</span>
                </div>
              )}

              {running && result?.calibrating && (
                <div className="absolute bottom-3 left-3 right-3 rounded-xl px-3 py-2 bg-black/60 backdrop-blur">
                  <p className="text-xs text-slate-200 mb-1.5">{tr("calibrating")}</p>
                  <div className="h-1.5 w-full rounded-full bg-white/20 overflow-hidden">
                    <div className="h-full rounded-full bg-signal transition-all"
                      style={{ width: `${result.calibration_progress ?? 0}%` }} />
                  </div>
                </div>
              )}
            </div>

            {running && result && (
              <p className={`text-sm font-medium px-1 ${style.tone}`}>{result.message}</p>
            )}
          </div>

          {/* Live numbers */}
          {running && result && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Eye size={12} /> {tr("ear")}
                  </p>
                  <span className="display text-lg font-bold">{result.ear?.toFixed(3) ?? "—"}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-asphalt-700 overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${result.eyes_closed ? "bg-alert" : "bg-go"}`}
                    style={{ width: `${earPct}%` }} />
                </div>
                {result.threshold != null && (
                  <p className="text-[10px] text-slate-400">
                    {tr("threshold")} {result.threshold.toFixed(3)}
                  </p>
                )}
              </div>

              <div className="card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Activity size={12} /> {tr("perclos")}
                  </p>
                  <span className="display text-lg font-bold">
                    {result.perclos != null ? `${(result.perclos * 100).toFixed(1)}%` : "—"}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-asphalt-700 overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${
                      (result.perclos ?? 0) >= (result.perclos_limit ?? 0.15) ? "bg-alert" : "bg-go"}`}
                    style={{ width: `${Math.min(100, (result.perclos ?? 0) * 400)}%` }} />
                </div>
                <p className="text-[10px] text-slate-400">
                  limit {((result.perclos_limit ?? 0.15) * 100).toFixed(0)}%
                </p>
              </div>

              {[
                { icon: EyeOff, label: tr("blinks"), value: result.blink_count ?? 0 },
                { icon: Gauge,  label: `${tr("head")} · ${tr("yaw")}`, value: result.yaw != null ? `${result.yaw}°` : "—" },
                { icon: Gauge,  label: `${tr("head")} · ${tr("pitch")}`, value: result.pitch != null ? `${result.pitch}°` : "—" },
                { icon: Timer,  label: tr("session"), value: `${Math.round(result.session_seconds ?? 0)}${tr("secs")}` },
                { icon: ShieldAlert, label: tr("alerts"), value: result.alerts_raised ?? 0 },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="card flex items-center gap-3 p-3">
                  <Icon size={15} className="text-signal shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                    <p className="text-sm font-bold truncate">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Explanation */}
        <div className="lg:col-span-5 space-y-4">
          {config && (
            <>
              <div className="card space-y-2">
                <p className="font-bold font-display text-sm flex items-center gap-2">
                  <Info size={15} className="text-signal" /> {tr("how")}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300">{config.method}</p>
                <dl className="grid grid-cols-2 gap-2 pt-1">
                  {[
                    ["EAR closed", config.ear_closed],
                    ["Microsleep", `${config.microsleep_seconds}s`],
                    ["PERCLOS limit", `${(config.perclos_drowsy * 100).toFixed(0)}%`],
                    ["PERCLOS window", `${config.perclos_window_seconds}s`],
                    ["Head turn", `${config.yaw_limit_deg}°`],
                    ["Distraction", `${config.distraction_seconds}s`],
                  ].map(([k, v]) => (
                    <div key={String(k)} className="rounded-lg bg-slate-50 dark:bg-asphalt-700/40 p-2">
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{k}</dt>
                      <dd className="text-xs font-bold">{String(v)}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="card border-go/30 bg-go/5 flex gap-3">
                <Info className="text-go shrink-0 mt-0.5" size={16} />
                <div>
                  <p className="text-xs font-bold mb-1">{tr("privacy")}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{config.privacy}</p>
                </div>
              </div>

              <div className="card border-alert/30 bg-alert/5 flex gap-3">
                <AlertTriangle className="text-alert shrink-0 mt-0.5" size={16} />
                <div>
                  <p className="text-xs font-bold mb-1">{tr("limits")}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{config.limitation}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
