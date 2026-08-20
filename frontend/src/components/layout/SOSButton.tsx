import { useState } from "react";
import { Siren, X, Phone, MessageCircle, Send, Loader, Navigation, AlertTriangle } from "lucide-react";
import { EmergencyApi } from "@/services/api";
import { useLang } from "@/context/LanguageContext";

type Stage = "idle" | "confirm" | "locating" | "result" | "error";

export default function SOSButton() {
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const reset = () => {
    setOpen(false);
    setStage("idle");
    setResult(null);
    setError("");
  };

  const trigger = () => {
    setOpen(true);
    setStage("confirm");
  };

  const confirmSend = () => {
    setStage("locating");
    const send = (lat: number, lon: number) => {
      EmergencyApi.report({ emergency_type: "accident", latitude: lat, longitude: lon, description: "SOS one-click alert" })
        .then((res: any) => { setResult(res); setStage("result"); })
        .catch((err: any) => { setError(err.message || "Failed to reach emergency service. Call 119 directly."); setStage("error"); });
    };
    if (!navigator.geolocation) { send(6.9271, 79.8612); return; }
    navigator.geolocation.getCurrentPosition(
      pos => send(pos.coords.latitude, pos.coords.longitude),
      () => send(6.9271, 79.8612),
      { timeout: 8000 }
    );
  };

  const T = {
    title: lang === "ta" ? "அவசர SOS" : lang === "si" ? "හදිසි SOS" : "Emergency SOS",
    confirmQ: lang === "ta" ? "அவசரநிலையை உறுதிப்படுத்தவா? அருகிலுள்ள மருத்துவமனை/போலீஸுக்கு alert போகும்." : lang === "si" ? "හදිසි අවස්ථාව තහවුරු කරන්නද? ආසන්න රෝහල/පොලිසියට අනතුරු ඇඟවීමක් යනු ඇත." : "Confirm emergency? This alerts the nearest hospital and police.",
    confirmBtn: lang === "ta" ? "ஆம், அனுப்பு" : lang === "si" ? "ඔව්, යවන්න" : "Yes, Send Alert",
    cancel: lang === "ta" ? "ரத்து செய்" : lang === "si" ? "අවලංගු කරන්න" : "Cancel",
    locating: lang === "ta" ? "GPS இடம் கண்டறிந்து அருகிலுள்ள உதவியை தேடுகிறது..." : lang === "si" ? "GPS පිහිටීම සොයමින් ආසන්න සහාය සොයමින්..." : "Locating GPS and finding nearest help...",
  };

  return (
    <>
      <button
        onClick={trigger}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-alert text-white font-bold px-4 py-3.5 rounded-full shadow-lg shadow-alert/30 hover:scale-105 active:scale-95 transition-transform"
        title="Emergency SOS"
      >
        <Siren size={20} className="animate-pulse" />
        <span className="hidden sm:inline text-sm">SOS</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={reset}>
          <div onClick={e => e.stopPropagation()} className="bg-white dark:bg-asphalt-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl border border-alert/20">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-alert flex items-center gap-2">
                <Siren size={20} /> {T.title}
              </h3>
              <button onClick={reset} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>

            {stage === "confirm" && (
              <div className="space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-300">{T.confirmQ}</p>
                <div className="flex gap-2">
                  <button onClick={confirmSend} className="flex-1 bg-alert text-white font-bold py-2.5 rounded-xl hover:opacity-90">{T.confirmBtn}</button>
                  <button onClick={reset} className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-asphalt-600 text-sm font-medium">{T.cancel}</button>
                </div>
              </div>
            )}

            {stage === "locating" && (
              <div className="flex flex-col items-center gap-3 py-6">
                <Loader className="animate-spin text-alert" size={28} />
                <p className="text-xs text-slate-500 text-center">{T.locating}</p>
              </div>
            )}

            {stage === "error" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-alert"><AlertTriangle size={16} /><span className="text-sm font-semibold">Failed</span></div>
                <p className="text-xs text-slate-500">{error}</p>
                <p className="text-xs">Call <a href="tel:119" className="font-bold text-alert">119</a> or <a href="tel:1990" className="font-bold text-alert">1990</a> directly.</p>
              </div>
            )}

            {stage === "result" && result && (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {["nearest_hospital", "nearest_police"].map(key => {
                  const svc = result[key];
                  if (!svc) return null;
                  return (
                    <div key={key} className="bg-slate-50 dark:bg-asphalt-700 rounded-xl p-3 space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{key === "nearest_hospital" ? "Hospital" : "Police"}</p>
                      <p className="font-semibold text-sm">{svc.name}</p>
                      <p className="text-xs text-go">{svc.distance_km} km away</p>
                      <div className="flex gap-1.5">
                        <a href={svc.call_url} className="flex-1 flex items-center justify-center gap-1 bg-go text-white text-[10px] font-bold py-1.5 rounded-lg"><Phone size={10}/>Call</a>
                        <a href={svc.whatsapp_url} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-1 bg-[#25D366] text-white text-[10px] font-bold py-1.5 rounded-lg"><MessageCircle size={10}/>WhatsApp</a>
                        <a href={svc.sms_url} className="flex-1 flex items-center justify-center gap-1 bg-signal text-asphalt-900 text-[10px] font-bold py-1.5 rounded-lg"><Send size={10}/>SMS</a>
                        <a href={svc.maps_url} target="_blank" rel="noreferrer" className="flex items-center justify-center px-2 bg-slate-200 dark:bg-asphalt-600 rounded-lg"><Navigation size={12}/></a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
