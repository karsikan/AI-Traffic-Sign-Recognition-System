import { useState } from "react";
import { EmergencyApi } from "@/services/api";
import { useLang } from "@/context/LanguageContext";
import { useSpeech } from "@/hooks/useSpeech";
import { Volume2, Sparkles, Navigation, AlertCircle, Phone, MessageCircle, Send } from "lucide-react";
import EmergencyTypeCard, { type EmergencyType } from "@/components/emergency/EmergencyTypeCard";
import EmergencyServiceCard from "@/components/emergency/EmergencyServiceCard";
import EmergencyGuidancePanel from "@/components/emergency/EmergencyGuidancePanel";

function AlertButtons({ service }: { service: any }) {
  if (!service?.call_url) return null;
  return (
    <div className="flex gap-1.5 pt-1">
      <a href={service.call_url}
        className="flex-1 flex items-center justify-center gap-1 bg-go text-white text-[10px] font-bold py-1.5 rounded-lg hover:opacity-90">
        <Phone size={10} /> Call
      </a>
      <a href={service.whatsapp_url} target="_blank" rel="noopener noreferrer"
        className="flex-1 flex items-center justify-center gap-1 bg-[#25D366] text-white text-[10px] font-bold py-1.5 rounded-lg hover:opacity-90">
        <MessageCircle size={10} /> WhatsApp
      </a>
      <a href={service.sms_url}
        className="flex-1 flex items-center justify-center gap-1 bg-signal text-asphalt-900 text-[10px] font-bold py-1.5 rounded-lg hover:opacity-90">
        <Send size={10} /> SMS
      </a>
    </div>
  );
}

const SRILANKA_HOTLINES = [
  { name: "National Police", number: "119", description: "General security emergencies, accidents, or incidents" },
  { name: "Suwa Seriya Ambulance", number: "1990", description: "24/7 free medical paramedic response team" },
  { name: "Expressway Emergency", number: "1969", description: "Road assistance & crashes on expressway segments" },
  { name: "Fire & Rescue Service", number: "110", description: "Fire rescue, hazards, or entrapments" },
];

export default function EmergencyPage() {
  const { t, lang } = useLang();
  const { speak } = useSpeech(lang);
  
  const [selectedType, setSelectedType] = useState<EmergencyType | null>(null);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleReport = (type: EmergencyType) => {
    setSelectedType(type);
    setResult(null);
    setError(null);
    setBusy(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await EmergencyApi.report({
            emergency_type: type,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            description: description || `Emergency reported: ${type}`,
          });
          setResult(res);
        } catch (err: any) {
          console.error(err);
          setError(err.message || "Failed to contact emergency service. Please call 119 directly.");
        } finally {
          setBusy(false);
        }
      },
      (err) => {
        console.warn("Geolocation failed, falling back to Colombo coordinates", err);
        fallbackReport(type, 6.9271, 79.8612);
      },
      { timeout: 10000 }
    );
  };

  const fallbackReport = async (type: EmergencyType, lat: number, lon: number) => {
    try {
      const res = await EmergencyApi.report({
        emergency_type: type,
        latitude: lat,
        longitude: lon,
        description: description || `Emergency reported: ${type} (GPS Fallback)`,
      });
      setResult(res);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to contact emergency service. Please call 119 directly.");
    } finally {
      setBusy(false);
    }
  };

  const handleSpeakResults = () => {
    if (!result) return;
    const speechText = `Emergency logged for ${result.emergency_type}. Nearest hospital: ${
      result.nearest_hospital?.name || "unknown"
    }, distance: ${result.nearest_hospital?.distance_km || 0} kilometers. Nearest police: ${
      result.nearest_police?.name || "unknown"
    }. Guidance instruction: ${result.guidance || ""}`;
    speak(speechText);
  };

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="text-3xl font-bold font-display text-alert">{t("emergency")} Console</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Trigger emergency support, check direct hotline dialers, or retrieve AI first-aid safety guides.
        </p>
      </div>

      {/* Grid selector */}
      <div className="space-y-4">
        <h3 className="font-bold text-slate-800 dark:text-slate-100 font-display">1. Report Roadside Emergency</h3>
        
        {/* Description helper box */}
        <div className="max-w-xl">
          <input
            type="text"
            className="input text-xs"
            placeholder="Add details (e.g. Near highway km 24, vehicle model) - Optional"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <EmergencyTypeCard
            type="accident"
            selected={selectedType === "accident"}
            onClick={() => handleReport("accident")}
          />
          <EmergencyTypeCard
            type="breakdown"
            selected={selectedType === "breakdown"}
            onClick={() => handleReport("breakdown")}
          />
          <EmergencyTypeCard
            type="medical"
            selected={selectedType === "medical"}
            onClick={() => handleReport("medical")}
          />
          <EmergencyTypeCard
            type="tire"
            selected={selectedType === "tire"}
            onClick={() => handleReport("tire")}
          />
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="card border-alert/40 bg-alert/5 flex items-start gap-3 p-4">
          <AlertCircle className="text-alert shrink-0 mt-0.5" size={18} />
          <div>
            <p className="font-semibold text-alert text-sm">Request Failed</p>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{error}</p>
            <p className="text-xs text-slate-500 mt-1">
              For immediate help call <strong>National Police 119</strong> or <strong>Ambulance 1990</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Loading state */}
      {busy && (
        <div className="card flex items-center justify-center gap-3 p-8 border-alert/20 bg-alert/5">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-alert"></div>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Locating your GPS coordinates and parsing closest rescue centers...
          </span>
        </div>
      )}

      {/* Result box */}
      {result && (
        <div className="card border-alert/30 bg-alert/5 relative space-y-4">
          <button
            onClick={handleSpeakResults}
            className="absolute top-4 right-4 text-alert hover:bg-alert/10 transition p-2 rounded-xl"
            title="Read instructions aloud"
          >
            <Volume2 size={20} />
          </button>

          <div className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 bg-alert rounded-full animate-ping shrink-0" />
            <h3 className="font-bold text-lg text-alert font-display capitalize">
              Emergency Response Generated ({result.emergency_type})
            </h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 text-sm pt-2">
            {result.nearest_hospital && (
              <div className="bg-white dark:bg-asphalt-800 p-4 rounded-xl border border-slate-200 dark:border-asphalt-700 space-y-2">
                <h5 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Hospital</h5>
                <p className="font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                  {result.nearest_hospital.name}
                </p>
                <p className="text-xs text-go font-medium">{result.nearest_hospital.distance_km} km away</p>
                <a
                  href={result.nearest_hospital.maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-signal font-bold hover:underline"
                >
                  <Navigation size={10} /> Navigate Map
                </a>
                <AlertButtons service={result.nearest_hospital} />
              </div>
            )}

            {result.nearest_police && (
              <div className="bg-white dark:bg-asphalt-800 p-4 rounded-xl border border-slate-200 dark:border-asphalt-700 space-y-2">
                <h5 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Police Hub</h5>
                <p className="font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                  {result.nearest_police.name}
                </p>
                <p className="text-xs text-go font-medium">{result.nearest_police.distance_km} km away</p>
                <a
                  href={result.nearest_police.maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-signal font-bold hover:underline"
                >
                  <Navigation size={10} /> Navigate Map
                </a>
                <AlertButtons service={result.nearest_police} />
              </div>
            )}

            {result.nearest_petrol && (
              <div className="bg-white dark:bg-asphalt-800 p-4 rounded-xl border border-slate-200 dark:border-asphalt-700 space-y-2">
                <h5 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Petrol Station</h5>
                <p className="font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                  {result.nearest_petrol.name}
                </p>
                <p className="text-xs text-go font-medium">{result.nearest_petrol.distance_km} km away</p>
                <a
                  href={result.nearest_petrol.maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-signal font-bold hover:underline"
                >
                  <Navigation size={10} /> Navigate Map
                </a>
                <AlertButtons service={result.nearest_petrol} />
              </div>
            )}
          </div>

          {result.guidance && (
            <div className="pt-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-alert flex items-center gap-1 mb-2">
                <Sparkles size={12} className="animate-pulse" /> AI Immediate Safety Guidelines
              </h4>
              <div className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed bg-white dark:bg-asphalt-850 p-4 rounded-xl border border-alert/20 max-h-[250px] overflow-y-auto">
                {result.guidance}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Safety Instructions Checklist */}
      <div className="grid gap-6 md:grid-cols-2">
        <EmergencyGuidancePanel type={selectedType} />

        {/* Hotlines */}
        <div className="card space-y-4">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 font-display">Sri Lankan Road Hotlines</h3>
          <div className="space-y-3">
            {SRILANKA_HOTLINES.map((h, idx) => (
              <EmergencyServiceCard
                key={idx}
                name={h.name}
                number={h.number}
                description={h.description}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
