import { useEffect, useState } from "react";
import { NearbyApi } from "@/services/api";
import type { NearbyPlace } from "@/types";
import { useT } from "@/hooks/useT";
import {
  Fuel, Hospital, Shield, Wrench, Compass, AlertCircle,
  Utensils, Hotel, MailOpen, Settings, Navigation, Loader, MapPin,
} from "lucide-react";
import NearbyServiceCard from "@/components/nearby/NearbyServiceCard";
import MapPlaceholder from "@/components/nearby/MapPlaceholder";

const SERVICES = [
  { key: "hospital",        icon: Hospital,   labelEn: "Hospitals",         labelTa: "மருத்துவமனைகள்",  labelSi: "රෝහල්" },
  { key: "police",          icon: Shield,     labelEn: "Police Hubs",       labelTa: "பொலிஸ் நிலையம்", labelSi: "පොලිස් ස්ථාන" },
  { key: "petrol",          icon: Fuel,       labelEn: "Fuel Sheds",        labelTa: "எரிபொருள் நிலையம்", labelSi: "ඉන්ධන පෝළිය" },
  { key: "service_station", icon: Settings,   labelEn: "Service Stations",  labelTa: "சேவை நிலையம்",   labelSi: "සේවා මධ්‍යස්ථාන" },
  { key: "garage",          icon: Wrench,     labelEn: "Auto Garages",      labelTa: "வாகன ஓர்ப்படை",  labelSi: "මෝටර් ශාලා" },
  { key: "hotel",           icon: Hotel,      labelEn: "Hotels",            labelTa: "ஹோட்டல்கள்",     labelSi: "හෝටල්" },
  { key: "restaurant",      icon: Utensils,   labelEn: "Restaurants",       labelTa: "உணவகங்கள்",      labelSi: "රෙස්ටෝරන්ට්" },
  { key: "post_office",     icon: MailOpen,   labelEn: "Post Offices",      labelTa: "தபால் நிலையம்",  labelSi: "තැපැල් කාර්යාල" },
];

function getLabel(svc: typeof SERVICES[0], lang: string) {
  if (lang === "ta") return svc.labelTa;
  if (lang === "si") return svc.labelSi;
  return svc.labelEn;
}

export default function NearbyPage() {
  const { lang } = useT();
  const [places, setPlaces]           = useState<NearbyPlace[]>([]);
  const [coords, setCoords]           = useState<{ lat: number; lng: number } | null>(null);
  const [gpsState, setGpsState]       = useState<"loading" | "ok" | "fallback">("loading");
  const [selectedService, setSelected] = useState<string>("hospital");
  const [busy, setBusy]               = useState(false);
  const [errorMsg, setErrorMsg]       = useState("");
  // Where the results came from, so the page can say when it is falling back to the
  // short built-in list instead of live map data.
  const [source, setSource]           = useState<string | null>(null);
  const [warning, setWarning]         = useState<string | null>(null);

  // GPS acquisition
  useEffect(() => {
    if (!navigator.geolocation) {
      setCoords({ lat: 6.9271, lng: 79.8612 });
      setGpsState("fallback");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsState("ok");
      },
      () => {
        setCoords({ lat: 6.9271, lng: 79.8612 });
        setGpsState("fallback");
        setErrorMsg(
          lang === "ta" ? "GPS தடுக்கப்பட்டது; கொழும்பு இடம் காட்டப்படுகிறது." :
          lang === "si" ? "GPS අවහිරයි; කොළඹ ස්ථානය පෙන්වනු ලැබේ." :
          "GPS blocked — showing Colombo listings."
        );
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }, []);

  const handleSearch = async (type: string) => {
    if (!coords) return;
    setBusy(true);
    setErrorMsg("");
    setSelected(type);
    try {
      const res: any = await NearbyApi.search(coords.lat, coords.lng, type);
      const list = res.services || [];
      setSource(res.source ?? null);
      setWarning(res.warning ?? null);
      setPlaces(
        list
          // A place with no coordinates cannot be pinned. Previously a random position
          // near the driver was invented for it, which put fake pins on the map.
          .filter((s: any) => s.latitude != null && s.longitude != null)
          .map((s: any) => ({
            name:         s.name,
            address:      s.address,
            distance_km:  s.distance_km,
            latitude:     s.latitude,
            longitude:    s.longitude,
            rating:       s.rating,
            phone:        s.phone,
            open_now:     s.open_now,
          }))
      );
    } catch {
      setErrorMsg("Failed to fetch nearby services. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { if (coords) handleSearch("hospital"); }, [coords]);

  const activeSvc = SERVICES.find(s => s.key === selectedService);
  const mapPins   = places.map(p => ({ name: p.name, latitude: p.latitude, longitude: p.longitude }));

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold font-display flex items-center gap-2">
          <MapPin className="text-signal" size={28} />
          {lang === "ta" ? "அருகிலுள்ள சேவைகள்" : lang === "si" ? "ආසන්න සේවා" : "Nearby Services"}
        </h1>
        <div className="flex items-center gap-2 mt-1">
          {gpsState === "loading" && (
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <Loader size={12} className="animate-spin" />
              {lang === "ta" ? "GPS இடம் கண்டறிகிறது..." : lang === "si" ? "GPS ස්ථානය සොයමින්..." : "Acquiring GPS location..."}
            </span>
          )}
          {gpsState === "ok" && coords && (
            <span className="flex items-center gap-1.5 text-xs text-go bg-go/10 border border-go/20 rounded-full px-2 py-0.5">
              <Navigation size={10} />
              {lang === "ta" ? "நேரடி GPS இயங்குகிறது" : lang === "si" ? "සජීවී GPS සක්‍රීයයි" : "Live GPS active"}
              — {coords.lat.toFixed(4)}°N {coords.lng.toFixed(4)}°E
            </span>
          )}
          {gpsState === "fallback" && (
            <span className="flex items-center gap-1.5 text-xs text-signal bg-signal/10 border border-signal/20 rounded-full px-2 py-0.5">
              <MapPin size={10} />
              {lang === "ta" ? "கொழும்பு இயல்புநிலை" : lang === "si" ? "කොළඹ පෙරනිමිය" : "Colombo fallback"}
            </span>
          )}
        </div>
      </div>

      {/* Category grid — 4 columns on md+ */}
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
        {SERVICES.map(({ key, icon: Icon, ...svc }) => (
          <button key={key} onClick={() => handleSearch(key)}
            className={`card flex flex-col items-center justify-center p-3 text-center border-2 transition-all hover:scale-[1.03] cursor-pointer gap-1.5 ${
              selectedService === key
                ? "border-signal bg-signal/5 shadow-md"
                : "border-slate-200 dark:border-asphalt-700"
            }`}>
            <Icon className="text-signal" size={22} />
            <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-200 leading-tight">
              {getLabel({ key, icon: Icon, ...svc }, lang)}
            </span>
          </button>
        ))}
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-signal/30 bg-signal/5 px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
          <AlertCircle size={14} className="text-signal shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Say plainly when these are not live results — the built-in list can be a
          hundred kilometres out, and a driver in an emergency must know that. */}
      {warning && (
        <div className="flex items-start gap-2 rounded-xl border border-alert/40 bg-alert/5 px-4 py-3 text-xs text-slate-700 dark:text-slate-200">
          <AlertCircle size={14} className="text-alert shrink-0 mt-0.5" />
          <span>{warning}</span>
        </div>
      )}

      {source === "openstreetmap" && places.length > 0 && (
        <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
          <MapPin size={11} /> Live results from OpenStreetMap contributors.
        </p>
      )}

      {/* Map + results */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Map */}
        <div className="lg:col-span-7 space-y-3">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 font-display">
            <Compass size={18} className="text-signal" />
            {activeSvc
              ? `${getLabel(activeSvc, lang)} ${lang === "ta" ? "உங்களுக்கு அருகில்" : lang === "si" ? "ඔබ අසල" : "Near You"}`
              : "Interactive Locator"
            }
          </h3>
          {coords ? (
            <MapPlaceholder latitude={coords.lat} longitude={coords.lng} places={mapPins} />
          ) : (
            <div className="card h-[350px] flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader size={24} className="animate-spin text-signal" />
              <p className="text-xs">
                {lang === "ta" ? "GPS இடம் கண்டறிகிறது..." : lang === "si" ? "GPS ස්ථානය ලබා ගනිමින්..." : "Acquiring GPS coordinates..."}
              </p>
            </div>
          )}
        </div>

        {/* Results list */}
        <div className="lg:col-span-5 space-y-3 flex flex-col">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 font-display flex items-center gap-2">
            {lang === "ta" ? "முடிவுகள்" : lang === "si" ? "ප්‍රතිඵල" : "Results"}
            {places.length > 0 && (
              <span className="text-xs font-normal text-slate-400">({places.length} found)</span>
            )}
          </h3>

          {busy ? (
            <div className="card flex items-center justify-center gap-2 p-6">
              <Loader size={16} className="animate-spin text-signal" />
              <span className="text-xs text-slate-500">
                {lang === "ta" ? "சேவைகளை தேடுகிறது..." : lang === "si" ? "සේවා සොයමින්..." : "Searching nearby..."}
              </span>
            </div>
          ) : places.length === 0 ? (
            <div className="card p-8 text-center text-slate-400 text-xs">
              {lang === "ta" ? "அருகில் சேவைகள் இல்லை. வேறு வகையை தேர்வு செய்யவும்." :
               lang === "si" ? "ළඟ සේවා නොමැත. වෙනත් කාණ්ඩයක් තෝරන්න." :
               "No nearby services found. Try a different category."}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-3 max-h-[420px] pr-1">
              {places.map((p, i) => (
                <NearbyServiceCard key={i} name={p.name} address={p.address}
                  distance_km={p.distance_km} latitude={p.latitude} longitude={p.longitude}
                  rating={p.rating} phone={p.phone} open_now={p.open_now} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
