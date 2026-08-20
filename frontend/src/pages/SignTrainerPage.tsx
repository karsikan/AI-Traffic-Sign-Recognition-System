import { useEffect, useRef, useState } from "react";
import { useLang } from "@/context/LanguageContext";
import { useSpeech } from "@/hooks/useSpeech";
import { DetectionApi } from "@/services/api";
import {
  Camera, Square, ScanLine, BookOpen, Check, X,
  AlertTriangle, Info, Trophy, RotateCcw, Volume2, VolumeX,
} from "lucide-react";
import type { Lang } from "@/types";

/**
 * Point the camera at a sign, the existing detection pipeline names it, and the page
 * turns that into a lesson — then a question about the sign you just looked at.
 *
 * Deliberately not called AR: it is a camera feed with an overlay, not 3D tracking.
 */

const UI = {
  en: {
    title: "Camera Sign Trainer",
    sub: "Point the camera at a traffic sign. The AI names it, explains what it means, and then asks you about it.",
    start: "Open camera", stop: "Stop", starting: "Opening camera…",
    denied: "Camera permission denied. Allow access and try again.",
    idle: "Open the camera and point it at a sign — or at one on your screen.",
    scan: "Identify this sign", scanning: "Identifying…",
    learn: "Learn", quiz: "Quiz", tabs: ["Learn", "Quiz"],
    detected: "Detected", confidence: "Confidence", meaning: "What it means",
    rule: "The rule", nothing: "No sign recognised. Fill more of the frame with the sign and try again.",
    quizPrompt: "What does this sign mean?", correct: "Correct", wrong: "Not quite",
    next: "Next question", score: "Score", streak: "Streak", reset: "Reset score",
    needScan: "Identify a sign first — the quiz asks about what the camera just saw.",
    voiceOn: "Voice on", voiceOff: "Voice off",
    note: "Not AR",
    noteBody: "This is the live camera with an overlay, not 3D augmented reality. It uses the same YOLOv8 and ResNet50 pipeline as the Image Detection page.",
    tip: "Works best on a clear, well-lit sign that fills most of the frame. The models were trained on German (GTSRB) signs, so Sri Lankan signs that differ in shape or text may score low.",
  },
  ta: {
    title: "கேமரா சிக்னல் பயிற்சி",
    sub: "கேமராவை ஒரு வீதிச் சிக்னலை நோக்கிக் காட்டுங்கள். AI அதைக் கண்டறிந்து, பொருள் சொல்லி, அதைப் பற்றி கேள்வி கேட்கும்.",
    start: "கேமராவைத் திற", stop: "நிறுத்து", starting: "கேமரா திறக்கிறது…",
    denied: "கேமரா அனுமதி மறுக்கப்பட்டது. அனுமதி கொடுத்து மீண்டும் முயற்சியுங்கள்.",
    idle: "கேமராவைத் திறந்து ஒரு சிக்னலை நோக்கிக் காட்டுங்கள் — திரையில் உள்ள படமாகவும் இருக்கலாம்.",
    scan: "இந்தச் சிக்னலைக் கண்டறி", scanning: "கண்டறியப்படுகிறது…",
    learn: "கற்று", quiz: "வினாடி வினா", tabs: ["கற்று", "வினாடி வினா"],
    detected: "கண்டறியப்பட்டது", confidence: "நம்பகத்தன்மை", meaning: "பொருள்",
    rule: "விதி", nothing: "சிக்னல் அடையாளம் காணப்படவில்லை. சிக்னலை frame-ல் பெரிதாக்கி மீண்டும் முயற்சியுங்கள்.",
    quizPrompt: "இந்தச் சிக்னலின் பொருள் என்ன?", correct: "சரி", wrong: "சரியல்ல",
    next: "அடுத்த கேள்வி", score: "மதிப்பெண்", streak: "தொடர்ச்சி", reset: "மீட்டமை",
    needScan: "முதலில் ஒரு சிக்னலைக் கண்டறியுங்கள் — கேமரா பார்த்ததைப் பற்றியே கேள்வி.",
    voiceOn: "குரல் இயக்கம்", voiceOff: "குரல் நிறுத்தம்",
    note: "இது AR அல்ல",
    noteBody: "இது நேரலை கேமரா + overlay, 3D augmented reality அல்ல. Image Detection பக்கத்தின் அதே YOLOv8 + ResNet50 pipeline தான்.",
    tip: "தெளிவான, நல்ல வெளிச்சத்தில், frame-ஐ நிரப்பும் சிக்னலுக்கு சிறப்பாக வேலை செய்யும். Model ஜெர்மன் (GTSRB) சிக்னல்களில் பயிற்சி பெற்றது — வடிவம் வேறுபட்ட இலங்கை சிக்னல்களுக்கு மதிப்பெண் குறையலாம்.",
  },
  si: {
    title: "කැමරා සංඥා පුහුණුව",
    sub: "කැමරාව මාර්ග සංඥාවකට එල්ල කරන්න. AI එය හඳුනාගෙන, අර්ථය පවසා, ඒ ගැන ඔබෙන් අසයි.",
    start: "කැමරාව විවෘත කරන්න", stop: "නවත්වන්න", starting: "කැමරාව විවෘත වෙමින්…",
    denied: "කැමරා අවසරය ප්‍රතික්ෂේප විය. අවසර දී නැවත උත්සාහ කරන්න.",
    idle: "කැමරාව විවෘත කර සංඥාවකට එල්ල කරන්න — තිරයේ ඇති පින්තූරයක් වුවද කමක් නැත.",
    scan: "මෙම සංඥාව හඳුනාගන්න", scanning: "හඳුනාගනිමින්…",
    learn: "ඉගෙනගන්න", quiz: "ප්‍රශ්න", tabs: ["ඉගෙනගන්න", "ප්‍රශ්න"],
    detected: "හඳුනාගත්", confidence: "විශ්වාසනීයත්වය", meaning: "අර්ථය",
    rule: "නීතිය", nothing: "සංඥාවක් හඳුනාගත නොහැකි විය. සංඥාව විශාල කර නැවත උත්සාහ කරන්න.",
    quizPrompt: "මෙම සංඥාවේ අර්ථය කුමක්ද?", correct: "නිවැරදියි", wrong: "නිවැරදි නැත",
    next: "ඊළඟ ප්‍රශ්නය", score: "ලකුණු", streak: "අඛණ්ඩව", reset: "යළි පිහිටුවන්න",
    needScan: "පළමුව සංඥාවක් හඳුනාගන්න — ප්‍රශ්නය කැමරාව දුටු දේ ගැනයි.",
    voiceOn: "හඬ සක්‍රීයයි", voiceOff: "හඬ අක්‍රීයයි",
    note: "මෙය AR නොවේ",
    noteBody: "මෙය සජීවී කැමරාව සහ overlay එකකි, 3D augmented reality නොවේ. Image Detection පිටුවේම YOLOv8 සහ ResNet50 pipeline එකයි.",
    tip: "පැහැදිලි, හොඳ ආලෝකයක් ඇති, රාමුව පුරවන සංඥාවකට හොඳින් ක්‍රියා කරයි. ආකෘති ජර්මානු (GTSRB) සංඥා මත පුහුණු කර ඇත.",
  },
};

type LabelKey = Exclude<keyof typeof UI.en, "tabs">;

/** Build a multiple-choice question from the detected sign plus three decoys. */
function buildQuestion(correct: any, pool: string[]) {
  const answer = correct.meaning || correct.sign_name;
  const decoys = pool.filter((m) => m && m !== answer).sort(() => Math.random() - 0.5).slice(0, 3);
  const options = [answer, ...decoys].sort(() => Math.random() - 0.5);
  return { answer, options };
}

// Fallback meanings so a quiz is possible even before many signs have been seen
const DECOY_POOL = [
  "Come to a complete stop", "Give way to traffic on the main road",
  "No entry for vehicles", "Maximum speed 50 km/h",
  "Pedestrian crossing ahead", "Road works ahead",
  "No overtaking", "Roundabout ahead",
  "Children crossing — school nearby", "Slippery road surface",
  "Priority road", "Keep right",
];

export default function SignTrainerPage() {
  const { lang } = useLang();
  const key = lang as "en" | "ta" | "si";
  const tr = (k: LabelKey): string => UI[key]?.[k] ?? UI.en[k];
  const tabs = UI[key]?.tabs ?? UI.en.tabs;
  const { speak } = useSpeech(lang as Lang);

  const [running, setRunning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [camError, setCamError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [detection, setDetection] = useState<any>(null);
  const [noResult, setNoResult] = useState(false);
  const [tab, setTab] = useState(0);
  const [voice, setVoice] = useState(true);

  const [question, setQuestion] = useState<any>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState({ right: 0, total: 0, streak: 0 });
  const seenRef = useRef<string[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => () => stopCamera(), []);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    window.speechSynthesis?.cancel();
  };

  const start = async () => {
    setCamError("");
    setStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: 1280, height: 720 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setRunning(true);
    } catch {
      setCamError(tr("denied"));
    } finally {
      setStarting(false);
    }
  };

  const stop = () => { stopCamera(); setRunning(false); setDetection(null); };

  const scan = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    setScanning(true);
    setNoResult(false);
    try {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")!.drawImage(video, 0, 0);
      const blob: Blob | null = await new Promise((res) =>
        canvas.toBlob((b) => res(b), "image/jpeg", 0.85)
      );
      if (!blob) return;

      const res = await DetectionApi.image(
        new File([blob], "frame.jpg", { type: "image/jpeg" })
      );
      const top = res?.detections?.[0];
      if (!top) { setNoResult(true); setDetection(null); return; }

      setDetection(top);
      const meaning = top.meaning || top.sign_name;
      if (meaning && !seenRef.current.includes(meaning)) seenRef.current.push(meaning);
      if (voice) speak(`${top.sign_name}. ${top.meaning ?? ""}`);
      setQuestion(null);
      setPicked(null);
    } catch {
      setNoResult(true);
      setDetection(null);
    } finally {
      setScanning(false);
    }
  };

  const askQuestion = () => {
    if (!detection) return;
    const pool = [...new Set([...seenRef.current, ...DECOY_POOL])];
    setQuestion(buildQuestion(detection, pool));
    setPicked(null);
  };

  const answer = (option: string) => {
    if (picked) return;
    setPicked(option);
    const right = option === question.answer;
    setScore((s) => ({
      right: s.right + (right ? 1 : 0),
      total: s.total + 1,
      streak: right ? s.streak + 1 : 0,
    }));
    if (voice) speak(right ? tr("correct") : `${tr("wrong")}. ${question.answer}`);
  };

  useEffect(() => { if (tab === 1 && detection && !question) askQuestion(); }, [tab, detection]);

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
              <Camera size={15} /> {starting ? tr("starting") : tr("start")}
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Camera */}
        <div className="lg:col-span-7 space-y-4">
          <div className="card p-3 space-y-3">
            <div className="relative rounded-xl overflow-hidden bg-slate-900 aspect-video">
              <video ref={videoRef} muted playsInline
                className={`w-full h-full object-cover ${running ? "" : "opacity-30"}`} />
              <canvas ref={canvasRef} className="hidden" />

              {!running && (
                <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                  <p className="text-sm text-slate-300">{camError || tr("idle")}</p>
                </div>
              )}

              {/* Framing guide */}
              {running && !detection && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="h-48 w-48 rounded-2xl border-2 border-dashed border-white/50" />
                </div>
              )}

              {/* Result overlay */}
              {running && detection && (
                <div className="absolute bottom-3 left-3 right-3 rounded-xl px-3 py-2.5
                    bg-black/60 backdrop-blur border border-white/10">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-signal min-w-0 truncate">{detection.sign_name}</p>
                    {detection.confidence != null && (
                      <span className="text-xs text-slate-300 shrink-0">
                        {Math.round(detection.confidence * 100)}%
                      </span>
                    )}
                  </div>
                  {detection.meaning && (
                    <p className="text-xs text-slate-200 mt-0.5 line-clamp-2">{detection.meaning}</p>
                  )}
                </div>
              )}
            </div>

            {running && (
              <button className="btn-primary w-full" onClick={scan} disabled={scanning}>
                <ScanLine size={16} /> {scanning ? tr("scanning") : tr("scan")}
              </button>
            )}

            {noResult && (
              <p className="text-xs text-alert flex items-center gap-1.5 px-1">
                <AlertTriangle size={13} /> {tr("nothing")}
              </p>
            )}
          </div>

          <div className="card border-slate-200 dark:border-asphalt-700 flex gap-3">
            <Info className="text-slate-400 shrink-0 mt-0.5" size={16} />
            <div>
              <p className="text-xs font-bold mb-1">{tr("note")}</p>
              <p className="text-xs text-slate-500">{tr("noteBody")}</p>
              <p className="text-xs text-slate-500 mt-1.5">{tr("tip")}</p>
            </div>
          </div>
        </div>

        {/* Learn / Quiz */}
        <div className="lg:col-span-5 space-y-4">
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

          {/* Learn */}
          {tab === 0 && (
            <div className="card space-y-3">
              <p className="font-bold font-display text-sm flex items-center gap-2">
                <BookOpen size={15} className="text-signal" /> {tr("learn")}
              </p>
              {!detection ? (
                <p className="text-xs text-slate-500">{tr("needScan")}</p>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-xl bg-slate-50 dark:bg-asphalt-700/40 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{tr("detected")}</p>
                    <p className="text-sm font-bold">{detection.sign_name}</p>
                    {detection.confidence != null && (
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {tr("confidence")} {Math.round(detection.confidence * 100)}%
                      </p>
                    )}
                  </div>
                  {detection.meaning && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{tr("meaning")}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{detection.meaning}</p>
                    </div>
                  )}
                  {(detection.safety_advice) && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{tr("rule")}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                        {detection.safety_advice}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Quiz */}
          {tab === 1 && (
            <div className="card space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold font-display text-sm flex items-center gap-2">
                  <Trophy size={15} className="text-signal" /> {tr("quiz")}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span>{tr("score")} <b className="text-signal">{score.right}/{score.total}</b></span>
                  {score.streak > 1 && <span>· {tr("streak")} {score.streak}</span>}
                </div>
              </div>

              {!detection ? (
                <p className="text-xs text-slate-500">{tr("needScan")}</p>
              ) : !question ? (
                <button className="btn-ghost w-full text-sm" onClick={askQuestion}>{tr("next")}</button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-medium">{tr("quizPrompt")}</p>
                  <p className="text-xs text-slate-400">{detection.sign_name}</p>
                  <div className="space-y-2">
                    {question.options.map((opt: string) => {
                      const isAnswer = opt === question.answer;
                      const chosen = picked === opt;
                      const cls = !picked
                        ? "border-slate-300 hover:bg-slate-100 dark:border-asphalt-700 dark:hover:bg-asphalt-700"
                        : isAnswer
                          ? "border-go/50 bg-go/10 text-go"
                          : chosen
                            ? "border-alert/50 bg-alert/10 text-alert"
                            : "border-slate-200 dark:border-asphalt-700 opacity-50";
                      return (
                        <button key={opt} onClick={() => answer(opt)} disabled={!!picked}
                          className={`w-full text-left text-xs rounded-xl border px-3 py-2.5 transition flex items-start gap-2 ${cls}`}>
                          {picked && isAnswer && <Check size={13} className="shrink-0 mt-0.5" />}
                          {picked && chosen && !isAnswer && <X size={13} className="shrink-0 mt-0.5" />}
                          <span>{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                  {picked && (
                    <div className="flex gap-2">
                      <button className="btn-primary flex-1 py-2 text-xs" onClick={askQuestion}>
                        {tr("next")}
                      </button>
                      <button className="btn-ghost py-2 text-xs"
                        onClick={() => { setScore({ right: 0, total: 0, streak: 0 }); setQuestion(null); setPicked(null); }}>
                        <RotateCcw size={12} /> {tr("reset")}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
