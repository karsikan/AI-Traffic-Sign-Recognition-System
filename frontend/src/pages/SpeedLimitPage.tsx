import { useState } from "react";
import { useT } from "@/hooks/useT";
import { Gauge, AlertTriangle, Info, Navigation, Loader, MapPin, CheckCircle } from "lucide-react";

// ── Speed Zones with GPS coordinates ─────────────────────────────────────────
// Each zone has center lat/lon + radius (km) + speed limit + type
interface SpeedZone {
  name: string;
  type: string;
  limitKph: number;
  lat: number;
  lon: number;
  radiusKm: number;
  notes: string;
}

const SPEED_ZONES: SpeedZone[] = [
  // Expressways (corridor zones — wide radius since roads are long)
  { name: "Southern Expressway (E01)", type: "Expressway",      limitKph: 110, lat: 6.5000,  lon: 80.0500, radiusKm: 80, notes: "Cars & light vehicles" },
  { name: "Colombo–Katunayake (E03)", type: "Expressway",       limitKph: 110, lat: 7.1000,  lon: 79.9200, radiusKm: 30, notes: "Cars & light vehicles" },
  { name: "Central Expressway (E04)", type: "Expressway",       limitKph: 100, lat: 7.3500,  lon: 80.2800, radiusKm: 60, notes: "All vehicles" },
  { name: "Outer Circular (E02)",     type: "Expressway",       limitKph: 80,  lat: 6.9500,  lon: 79.9300, radiusKm: 15, notes: "All vehicles" },
  // Urban areas (city center zones — tight radius)
  { name: "Colombo City Centre",      type: "Urban Area",       limitKph: 50,  lat: 6.9271,  lon: 79.8612, radiusKm: 5,  notes: "Municipal boundary" },
  { name: "Kandy City",               type: "Urban Area",       limitKph: 50,  lat: 7.2906,  lon: 80.6337, radiusKm: 4,  notes: "Municipal boundary" },
  { name: "Galle City",               type: "Urban Area",       limitKph: 50,  lat: 6.0535,  lon: 80.2210, radiusKm: 4,  notes: "Municipal boundary" },
  { name: "Jaffna City",              type: "Urban Area",       limitKph: 50,  lat: 9.6615,  lon: 80.0255, radiusKm: 4,  notes: "Municipal boundary" },
  { name: "Negombo City",             type: "Urban Area",       limitKph: 50,  lat: 7.2095,  lon: 79.8386, radiusKm: 4,  notes: "Municipal boundary" },
  { name: "Kurunegala City",          type: "Urban Area",       limitKph: 50,  lat: 7.4863,  lon: 80.3647, radiusKm: 4,  notes: "Municipal boundary" },
  { name: "Anuradhapura City",        type: "Urban Area",       limitKph: 50,  lat: 8.3114,  lon: 80.4037, radiusKm: 4,  notes: "Municipal boundary" },
  { name: "Trincomalee City",         type: "Urban Area",       limitKph: 50,  lat: 8.5874,  lon: 81.2152, radiusKm: 4,  notes: "Municipal boundary" },
  { name: "Batticaloa City",          type: "Urban Area",       limitKph: 50,  lat: 7.7102,  lon: 81.6924, radiusKm: 4,  notes: "Municipal boundary" },
  { name: "Matara City",              type: "Urban Area",       limitKph: 50,  lat: 5.9549,  lon: 80.5550, radiusKm: 4,  notes: "Municipal boundary" },
  { name: "Ratnapura City",           type: "Urban Area",       limitKph: 50,  lat: 6.6828,  lon: 80.3992, radiusKm: 4,  notes: "Municipal boundary" },
  { name: "Badulla City",             type: "Urban Area",       limitKph: 50,  lat: 6.9934,  lon: 81.0550, radiusKm: 4,  notes: "Municipal boundary" },
  { name: "Nuwara Eliya Town",        type: "Urban Area",       limitKph: 40,  lat: 6.9497,  lon: 80.7891, radiusKm: 3,  notes: "Hill city — reduced limit" },
  { name: "Sri Jayawardenepura",      type: "Urban Area",       limitKph: 50,  lat: 6.9108,  lon: 79.8878, radiusKm: 4,  notes: "Capital zone" },
  // School zones (very tight radius)
  { name: "School Zone — Colombo",    type: "School Zone",      limitKph: 25,  lat: 6.9150,  lon: 79.8600, radiusKm: 0.5, notes: "Active school hours" },
  { name: "School Zone — Kandy",      type: "School Zone",      limitKph: 25,  lat: 7.2950,  lon: 80.6400, radiusKm: 0.5, notes: "Active school hours" },
  // National highways (large radius)
  { name: "A1 — Colombo to Kandy",    type: "National Highway", limitKph: 70,  lat: 7.1000,  lon: 80.2500, radiusKm: 60, notes: "General road" },
  { name: "A2 — Galle Road",          type: "National Highway", limitKph: 70,  lat: 6.4000,  lon: 80.0500, radiusKm: 60, notes: "General road" },
  { name: "A3 — Colombo–Negombo",     type: "National Highway", limitKph: 70,  lat: 7.0800,  lon: 79.8700, radiusKm: 20, notes: "General road" },
  { name: "A9 — Kandy to Jaffna",     type: "National Highway", limitKph: 70,  lat: 8.5000,  lon: 80.5000, radiusKm: 120, notes: "General road" },
  { name: "A6 — Colombo–Trinco",      type: "National Highway", limitKph: 70,  lat: 7.8000,  lon: 81.0000, radiusKm: 100, notes: "General road" },
];

const TYPE_COLORS: Record<string, string> = {
  "Expressway":       "bg-go/10 text-go border-go/30",
  "National Highway": "bg-signal/10 text-signal border-signal/30",
  "Urban Area":       "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200",
  "School Zone":      "bg-alert/10 text-alert border-alert/30",
};

const LIMIT_COLOR = (v: number) =>
  v >= 100 ? "text-go" : v >= 70 ? "text-signal" : v >= 50 ? "text-blue-500" : "text-alert";

const LIMIT_BG = (v: number) =>
  v >= 100 ? "bg-go text-white" : v >= 70 ? "bg-signal text-asphalt-900" : v >= 50 ? "bg-blue-500 text-white" : "bg-alert text-white";

// Haversine distance in km
function distKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface GPSResult {
  matched: SpeedZone[];
  nearest: SpeedZone;
  nearestDist: number;
  lat: number;
  lon: number;
}

const SPEED_TABLE = [
  { type: "Expressway",       zone: "Southern Expressway (E01)",    limit: 110, notes: "Cars & light vehicles" },
  { type: "Expressway",       zone: "Colombo–Katunayake (E03)",     limit: 110, notes: "Cars & light vehicles" },
  { type: "Expressway",       zone: "Central Expressway (E04)",     limit: 100, notes: "All vehicles" },
  { type: "Expressway",       zone: "Outer Circular (E02)",         limit: 80,  notes: "All vehicles" },
  { type: "National Highway", zone: "A1 – Colombo to Kandy",        limit: 70,  notes: "General road" },
  { type: "National Highway", zone: "A2 – Galle Road",              limit: 70,  notes: "General road" },
  { type: "National Highway", zone: "A3 – Colombo to Negombo",      limit: 70,  notes: "General road" },
  { type: "National Highway", zone: "A6 – Colombo to Trincomalee",  limit: 70,  notes: "General road" },
  { type: "National Highway", zone: "A9 – Kandy to Jaffna",         limit: 70,  notes: "General road" },
  { type: "Urban Area",       zone: "All Sri Lankan city centres",   limit: 50,  notes: "Municipal boundary" },
  { type: "Urban Area",       zone: "Nuwara Eliya",                  limit: 40,  notes: "Hill city — reduced" },
  { type: "School Zone",      zone: "Near any school (active hours)",limit: 25,  notes: "When children present" },
  { type: "Heavy Vehicle",    zone: "National roads",                limit: 60,  notes: "Buses, lorries, trucks" },
  { type: "Heavy Vehicle",    zone: "Expressways",                   limit: 80,  notes: "Buses & coaches only" },
  { type: "Three-Wheeler",    zone: "National highways",             limit: 50,  notes: "Tuk-tuks" },
  { type: "Three-Wheeler",    zone: "Urban areas",                   limit: 40,  notes: "Tuk-tuks in city" },
];

const grouped = SPEED_TABLE.reduce<Record<string, typeof SPEED_TABLE>>((acc, row) => {
  (acc[row.type] ??= []).push(row); return acc;
}, {});

export default function SpeedLimitPage() {
  const { t } = useT();
  const [gpsState, setGpsState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [gpsResult, setGpsResult] = useState<GPSResult | null>(null);
  const [gpsError, setGpsError] = useState<string>("");

  const detectLocation = () => {
    if (!navigator.geolocation) { setGpsError("Geolocation not supported by this browser."); return; }
    setGpsState("loading");
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lon } = pos.coords;
        // Find all zones that contain this location
        const matched = SPEED_ZONES.filter(z => distKm(lat, lon, z.lat, z.lon) <= z.radiusKm);
        // Nearest zone regardless of match
        let minDist = Infinity, nearest = SPEED_ZONES[0];
        SPEED_ZONES.forEach(z => {
          const d = distKm(lat, lon, z.lat, z.lon);
          if (d < minDist) { minDist = d; nearest = z; }
        });
        setGpsResult({ matched, nearest, nearestDist: Math.round(minDist * 10) / 10, lat, lon });
        setGpsState("done");
      },
      err => {
        setGpsError(err.message || "Location access denied.");
        setGpsState("error");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Priority zone — school > expressway > urban > national
  const topZone = gpsResult?.matched.length
    ? gpsResult.matched.sort((a, b) => {
        const priority: Record<string, number> = { "School Zone": 0, "Urban Area": 1, "Expressway": 2, "National Highway": 3 };
        return (priority[a.type] ?? 9) - (priority[b.type] ?? 9);
      })[0]
    : null;

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="text-3xl font-bold font-display flex items-center gap-2">
          <Gauge className="text-signal" size={28} /> {t("speedTitle")}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">{t("speedSub")}</p>
      </div>

      {/* ── GPS Live Detection ────────────────────────── */}
      <div className="card space-y-4 border-l-4 border-l-signal">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-bold font-display flex items-center gap-2 text-base">
              <Navigation size={16} className="text-signal" /> Live Speed Limit — My Location
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Uses GPS to detect which speed zone you are currently in</p>
          </div>
          <button onClick={detectLocation} disabled={gpsState === "loading"}
            className="btn-primary flex items-center gap-2 py-2 text-sm">
            {gpsState === "loading"
              ? <><Loader size={14} className="animate-spin" /> Detecting...</>
              : <><Navigation size={14} /> Detect My Speed Zone</>
            }
          </button>
        </div>

        {gpsState === "error" && (
          <div className="rounded-xl border border-alert/30 bg-alert/5 px-4 py-3 text-sm text-alert flex items-center gap-2">
            <AlertTriangle size={14} /> {gpsError}
          </div>
        )}

        {gpsState === "done" && gpsResult && (
          <div className="space-y-4">
            {/* Location info */}
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <MapPin size={12} className="text-signal" />
              Your coordinates: {gpsResult.lat.toFixed(4)}°N, {gpsResult.lon.toFixed(4)}°E
            </div>

            {/* Primary speed limit display */}
            {topZone ? (
              <div className={`rounded-2xl p-5 text-center space-y-2 ${LIMIT_BG(topZone.limitKph)}`}>
                <div className="text-[10px] font-bold uppercase tracking-widest opacity-80">Current Speed Limit</div>
                <div className="text-7xl font-black font-display">{topZone.limitKph}</div>
                <div className="text-base font-bold opacity-90">km/h</div>
                <div className="text-sm opacity-80 font-medium">{topZone.name}</div>
                <div className="text-xs opacity-70">{topZone.notes}</div>
                <div className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 mt-1`}>
                  Zone type: {topZone.type}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-signal text-asphalt-900 p-5 text-center space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-widest opacity-80">Nearest Zone</div>
                <div className="text-7xl font-black font-display">{gpsResult.nearest.limitKph}</div>
                <div className="text-base font-bold">km/h</div>
                <div className="text-sm font-medium opacity-90">{gpsResult.nearest.name}</div>
                <div className="text-xs opacity-70">{gpsResult.nearestDist} km away · {gpsResult.nearest.notes}</div>
              </div>
            )}

            {/* All matched zones */}
            {gpsResult.matched.length > 1 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">All active zones at your location</p>
                {gpsResult.matched.map((z, i) => (
                  <div key={i} className={`flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm ${TYPE_COLORS[z.type] || ""}`}>
                    <div>
                      <span className="font-semibold">{z.name}</span>
                      <span className="ml-2 text-xs opacity-70">{z.notes}</span>
                    </div>
                    <span className="text-xl font-black">{z.limitKph} <span className="text-xs font-normal">km/h</span></span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-start gap-2 text-xs text-slate-400 border-t border-slate-100 dark:border-asphalt-700 pt-3">
              <CheckCircle size={12} className="text-go shrink-0 mt-0.5" />
              Always obey posted road signs — GPS detection is approximate. School zones apply during active hours (7–9 AM, 12–1 PM, 2–4 PM).
            </div>
          </div>
        )}

        {gpsState === "idle" && (
          <div className="text-center py-8 text-slate-400 text-sm">
            <Navigation size={28} className="mx-auto mb-2 opacity-30" />
            Click "Detect My Speed Zone" to get the speed limit for your current location
          </div>
        )}
      </div>

      {/* ── Summary cards ─────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Expressway",     limit: "110 km/h", color: "bg-go text-white" },
          { label: "National Roads", limit: "70 km/h",  color: "bg-signal text-asphalt-900" },
          { label: "Urban Areas",    limit: "50 km/h",  color: "bg-blue-500 text-white" },
          { label: "School Zones",   limit: "25 km/h",  color: "bg-alert text-white" },
        ].map(({ label, limit, color }) => (
          <div key={label} className={`rounded-2xl p-4 text-center ${color}`}>
            <div className="text-2xl font-bold font-display">{limit}</div>
            <div className="text-xs font-semibold mt-0.5 opacity-90">{label}</div>
          </div>
        ))}
      </div>

      <div className="card border-l-4 border-l-signal flex gap-3 items-start">
        <Info size={16} className="text-signal shrink-0 mt-0.5" />
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Speed limits are prescribed under the <strong>Motor Traffic Act (Cap. 203)</strong> of Sri Lanka.
          Exceeding limits may result in fines of LKR 2,500–25,000 and licence suspension.
        </p>
      </div>

      {/* ── Full speed table ─────────────────────────── */}
      {Object.entries(grouped).map(([type, rows]) => (
        <div key={type} className="space-y-2">
          <h3 className="font-bold font-display flex items-center gap-2 text-base">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${TYPE_COLORS[type] || "bg-slate-100"}`}>{type}</span>
          </h3>
          <div className="card p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-asphalt-800 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-3 text-left">{t("zone")}</th>
                  <th className="p-3 text-center">{t("limit")}</th>
                  <th className="p-3 text-left hidden sm:table-cell">{t("notes")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-asphalt-700">
                {rows.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-asphalt-750/20">
                    <td className="p-3 text-slate-700 dark:text-slate-200">{row.zone}</td>
                    <td className="p-3 text-center">
                      <span className={`text-lg font-bold ${LIMIT_COLOR(row.limit)}`}>{row.limit}</span>
                      <span className="text-xs text-slate-400 ml-1">km/h</span>
                    </td>
                    <td className="p-3 text-slate-500 text-xs hidden sm:table-cell">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <div className="card border-l-4 border-l-alert flex gap-3 items-start">
        <AlertTriangle size={16} className="text-alert shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
          <p className="font-bold text-slate-800 dark:text-slate-100">Speeding Penalties — Sri Lanka</p>
          <p>1–10 km/h over limit: LKR 2,500</p>
          <p>11–20 km/h over limit: LKR 5,000</p>
          <p>21–30 km/h over limit: LKR 10,000 + licence points</p>
          <p>30+ km/h over limit: LKR 25,000 + possible suspension</p>
        </div>
      </div>
    </div>
  );
}
