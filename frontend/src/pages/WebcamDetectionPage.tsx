import { useEffect, useRef, useState } from "react";
import { DetectionApi, FeedbackApi } from "@/services/api";
import type { Detection } from "@/types";
import { useLang } from "@/context/LanguageContext";
import { Camera, Play, Square, RefreshCw, Cpu, Volume2 } from "lucide-react";
import AutoTranslateText from "@/components/AutoTranslateText";
import { useSpeech } from "@/hooks/useSpeech";
import SignPriorityAlert from "@/components/detection/SignPriorityAlert";

export default function WebcamDetectionPage() {
  const { t, lang } = useLang();
  const { speak } = useSpeech(lang);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [predictionId, setPredictionId] = useState<number | null>(null);
  const [fps, setFps] = useState<number>(0);
  const [intervalMs, setIntervalMs] = useState<number>(1000);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTimeRef = useRef<number>(Date.now());
  const activeTimerRef = useRef<any>(null);
  const isRunningRef = useRef<boolean>(false);

  // Responsive scaling states
  const [dimensions, setDimensions] = useState({
    videoWidth: 1,
    videoHeight: 1,
    clientWidth: 1,
    clientHeight: 1,
  });

  // Load available cameras
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((allDevices) => {
      const videoDevices = allDevices.filter((d) => d.kind === "videoinput");
      setDevices(videoDevices);
      if (videoDevices.length > 0) {
        setSelectedDevice(videoDevices[0].deviceId);
      }
    });
    return () => {
      stopWebcam();
    };
  }, []);

  const startWebcam = async () => {
    try {
      const constraints: MediaStreamConstraints = {
        video: selectedDevice ? { deviceId: { exact: selectedDevice } } : true,
      };
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      isRunningRef.current = true;
      triggerDetectionLoop();
    } catch (err) {
      console.error(err);
      alert("Could not access webcam. Please check permissions.");
    }
  };

  const stopWebcam = () => {
    isRunningRef.current = false;
    if (activeTimerRef.current) {
      clearTimeout(activeTimerRef.current);
      activeTimerRef.current = null;
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setDetections([]);
    setPredictionId(null);
    setFps(0);
  };

  const triggerDetectionLoop = () => {
    if (!isRunningRef.current) return;
    activeTimerRef.current = setTimeout(async () => {
      await captureAndAnalyze();
      triggerDetectionLoop(); // Queue next frame
    }, intervalMs);
  };

  const captureAndAnalyze = async () => {
    const v = videoRef.current;
    if (!v || v.readyState < 2 || !isRunningRef.current) return;

    // Create canvas to capture video frame
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth || 640;
    canvas.height = v.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);

    // Update dimensions for bounding boxes overlay
    setDimensions({
      videoWidth: v.videoWidth || 1,
      videoHeight: v.videoHeight || 1,
      clientWidth: v.clientWidth || 1,
      clientHeight: v.clientHeight || 1,
    });

    return new Promise<void>((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob || !isRunningRef.current) {
          resolve();
          return;
        }

        setBusy(true);
        try {
          const file = new File([blob], "frame.jpg", { type: "image/jpeg" });
          // Call live-webcam specific route
          const res = await DetectionApi.webcam(file);

          if (isRunningRef.current) {
            setDetections(res.detections);
            setPredictionId(res.prediction_id || null);

            // Compute actual FPS
            const now = Date.now();
            const elapsed = now - lastTimeRef.current;
            const currentFps = Math.round(1000 / elapsed);
            setFps(currentFps);
            lastTimeRef.current = now;
          }
        } catch (err) {
          console.error("Frame analysis failed:", err);
        } finally {
          setBusy(false);
          resolve();
        }
      }, "image/jpeg");
    });
  };

  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const reportWrong = async (label: string, correct: string) => {
    if (!predictionId || !correct.trim()) return;
    try {
      await FeedbackApi.submit({ prediction_id: predictionId, predicted_label: label, correct_label: correct.trim() });
      setFeedbackMsg("Feedback saved — thank you!");
    } catch {
      setFeedbackMsg("Failed to save feedback.");
    }
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const scaleX = dimensions.clientWidth / dimensions.videoWidth;
  const scaleY = dimensions.clientHeight / dimensions.videoHeight;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display">{t("liveDetection")}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Analyze video feeds live from your device camera. Bounding boxes scale reactively.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {stream ? (
            <div className="flex items-center gap-2 bg-go/10 text-go px-3 py-1.5 rounded-xl text-xs font-bold animate-pulse">
              <span className="h-2.5 w-2.5 bg-go rounded-full" />
              Live Feed Active
            </div>
          ) : (
            <div className="text-xs text-slate-500 bg-slate-100 dark:bg-asphalt-800 px-3 py-1.5 rounded-xl font-medium">
              Camera Offline
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Video Screen & Overlays */}
        <div className="lg:col-span-8 space-y-4">
          <div className="card p-0 overflow-hidden relative bg-asphalt-950 flex items-center justify-center min-h-[350px]" ref={containerRef}>
            {busy && (
              <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 bg-asphalt-900/80 px-2.5 py-1 rounded-md text-[10px] text-signal font-semibold border border-asphalt-700">
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-signal border-t-transparent" />
                Analyzing...
              </div>
            )}
            {stream ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-auto object-contain max-h-[500px]"
                />

                {/* Bounding box overlays */}
                {detections.map((d, i) => {
                  if (!d.bbox || d.bbox.length !== 4) return null;
                  const [x1, y1, x2, y2] = d.bbox;
                  const left = x1 * scaleX;
                  const top = y1 * scaleY;
                  const width = (x2 - x1) * scaleX;
                  const height = (y2 - y1) * scaleY;

                  return (
                    <div
                      key={i}
                      className="absolute border-2 border-signal bg-signal/15 z-10 animate-pulse"
                      style={{
                        left: `${left}px`,
                        top: `${top}px`,
                        width: `${width}px`,
                        height: `${height}px`,
                      }}
                    >
                      <span className="absolute bottom-full left-0 bg-asphalt-900 text-white text-[9px] font-bold px-1 py-0.5 rounded-t whitespace-nowrap">
                        <AutoTranslateText text={d.label} /> ({(d.confidence * 100).toFixed(0)}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center p-8 space-y-4">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-asphalt-800 text-slate-400 mx-auto">
                  <Camera size={28} />
                </div>
                <div>
                  <p className="font-semibold text-slate-300">Start live video stream</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Permissions will be requested. Frames are processed locally and classified frame-by-frame.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Controller Bar */}
          <div className="card flex flex-wrap items-center justify-between gap-4 py-3.5">
            <div className="flex flex-wrap items-center gap-3">
              <select
                className="input max-w-[200px] text-xs py-2"
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                disabled={!!stream}
              >
                {devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Camera ${devices.indexOf(d) + 1}`}
                  </option>
                ))}
                {devices.length === 0 && <option value="">No camera detected</option>}
              </select>

              {!stream ? (
                <button
                  className="btn-primary flex items-center gap-2 py-2 text-xs"
                  onClick={startWebcam}
                  disabled={devices.length === 0}
                >
                  <Play size={14} /> Start Camera
                </button>
              ) : (
                <button className="btn border border-alert hover:bg-alert/15 text-alert flex items-center gap-2 py-2 text-xs" onClick={stopWebcam}>
                  <Square size={14} /> {t("stopLive")}
                </button>
              )}
            </div>

            {/* Frame rate controller */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">Inference Interval:</span>
              <select
                className="input max-w-[100px] py-1 px-2 text-xs"
                value={intervalMs}
                onChange={(e) => setIntervalMs(Number(e.target.value))}
              >
                <option value={500}>0.5s</option>
                <option value={1000}>1.0s (Recommended)</option>
                <option value={2000}>2.0s</option>
                <option value={3000}>3.0s</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right Column: Running Predictions List & Stats */}
        <div className="lg:col-span-4 space-y-4">
          <h2 className="text-xl font-bold font-display tracking-tight">Live Predictions</h2>

          {/* Realtime Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card p-3 text-center">
              <div className="text-2xl font-bold text-signal display">
                {stream ? `${fps} fps` : "0"}
              </div>
              <p className="text-[10px] uppercase text-slate-500 mt-1 flex items-center justify-center gap-1">
                <Cpu size={12} /> Inference speed
              </p>
            </div>
            <div className="card p-3 text-center">
              <div className="text-2xl font-bold text-go display">
                {detections.length}
              </div>
              <p className="text-[10px] uppercase text-slate-500 mt-1">Signs detected</p>
            </div>
          </div>

          {/* Priority alert for critical signs */}
          {detections.length > 0 && (
            <SignPriorityAlert labels={detections.map(d => d.label)} onSpeak={speak} />
          )}

          {feedbackMsg && (
            <div className="card border-go/30 bg-go/5 text-go text-xs font-medium py-2 px-3 text-center">{feedbackMsg}</div>
          )}

          {/* List of active detections */}
          <div className="space-y-3">
            {detections.length === 0 && (
              <div className="card text-center p-6 text-slate-500 text-xs leading-relaxed">
                {stream
                  ? "Awaiting detection feed... Align a traffic sign in the frame."
                  : "Start the camera. Identified signs will list here in real-time."}
              </div>
            )}

            {detections.map((d, i) => (
              <div key={i} className="card p-4 space-y-2.5 relative border-l-4 border-l-signal">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <AutoTranslateText text={d.label} />
                    <button
                      onClick={() => speak(`${d.label}. Meaning: ${d.meaning || ""}`)}
                      className="text-slate-400 hover:text-signal transition"
                      title="Read sign meaning aloud"
                    >
                      <Volume2 size={14} />
                    </button>
                  </h4>
                  <span className="bg-signal/15 text-signal text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {(d.confidence * 100).toFixed(0)}% Match
                  </span>
                </div>

                {d.meaning && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                    <AutoTranslateText text={d.meaning} />
                  </p>
                )}

                <div className="flex justify-between items-center text-[10px] pt-1.5 border-t border-slate-100 dark:border-asphalt-700">
                  <span className="text-slate-400">Source: Webcam</span>
                  <button
                    onClick={() => {
                      const correct = window.prompt(`What is the correct sign name for "${d.label}"?`);
                      if (correct) reportWrong(d.label, correct);
                    }}
                    className="text-alert font-semibold hover:underline"
                  >
                    Report Error
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Bandwidth Optimization Info */}
          <div className="card p-3 border-l-4 border-l-go bg-go/5 flex gap-2">
            <RefreshCw size={14} className="text-go shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-600 dark:text-slate-300 leading-normal">
              <strong>Bandwidth Saver:</strong> Processing interval can be configured. Increasing interval preserves battery life.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
