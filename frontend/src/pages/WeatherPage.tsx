import { useEffect, useState } from "react";
import { useT } from "@/hooks/useT";
import { Cloud, Wind, Droplets, Thermometer, RefreshCw, MapPin, Sun, CloudRain, Zap, CloudDrizzle, Eye, Navigation } from "lucide-react";

const CITIES = [
  // Western Province
  { name: "Colombo",        lat: 6.9271,  lon: 79.8612, province: "Western" },
  { name: "Negombo",        lat: 7.2095,  lon: 79.8386, province: "Western" },
  { name: "Sri Jayawardenepura", lat: 6.9108, lon: 79.8878, province: "Western" },
  { name: "Kalutara",       lat: 6.5854,  lon: 79.9607, province: "Western" },
  { name: "Panadura",       lat: 6.7134,  lon: 79.9075, province: "Western" },
  // Central Province
  { name: "Kandy",          lat: 7.2906,  lon: 80.6337, province: "Central" },
  { name: "Nuwara Eliya",   lat: 6.9497,  lon: 80.7891, province: "Central" },
  { name: "Matale",         lat: 7.4676,  lon: 80.6234, province: "Central" },
  { name: "Dambulla",       lat: 7.8731,  lon: 80.6517, province: "Central" },
  // Southern Province
  { name: "Galle",          lat: 6.0535,  lon: 80.2210, province: "Southern" },
  { name: "Matara",         lat: 5.9549,  lon: 80.5550, province: "Southern" },
  { name: "Hambantota",     lat: 6.1241,  lon: 81.1185, province: "Southern" },
  { name: "Tangalle",       lat: 6.0256,  lon: 80.7967, province: "Southern" },
  // Northern Province
  { name: "Jaffna",         lat: 9.6615,  lon: 80.0255, province: "Northern" },
  { name: "Vavuniya",       lat: 8.7514,  lon: 80.4971, province: "Northern" },
  { name: "Kilinochchi",    lat: 9.3803,  lon: 80.4036, province: "Northern" },
  { name: "Mannar",         lat: 8.9766,  lon: 79.9036, province: "Northern" },
  // Eastern Province
  { name: "Trincomalee",    lat: 8.5874,  lon: 81.2152, province: "Eastern" },
  { name: "Batticaloa",     lat: 7.7102,  lon: 81.6924, province: "Eastern" },
  { name: "Ampara",         lat: 7.2997,  lon: 81.6747, province: "Eastern" },
  { name: "Kalmunai",       lat: 7.4157,  lon: 81.8261, province: "Eastern" },
  // North Western Province
  { name: "Anuradhapura",   lat: 8.3114,  lon: 80.4037, province: "North Western" },
  { name: "Kurunegala",     lat: 7.4863,  lon: 80.3647, province: "North Western" },
  { name: "Puttalam",       lat: 8.0362,  lon: 79.8403, province: "North Western" },
  { name: "Chilaw",         lat: 7.5742,  lon: 79.7956, province: "North Western" },
  // Sabaragamuwa Province
  { name: "Ratnapura",      lat: 6.6828,  lon: 80.3992, province: "Sabaragamuwa" },
  { name: "Kegalle",        lat: 7.2513,  lon: 80.3464, province: "Sabaragamuwa" },
  // Uva Province
  { name: "Badulla",        lat: 6.9934,  lon: 81.0550, province: "Uva" },
  { name: "Monaragala",     lat: 6.8728,  lon: 81.3506, province: "Uva" },
  // North Central Province
  { name: "Polonnaruwa",    lat: 7.9403,  lon: 81.0188, province: "North Central" },
  { name: "Sigiriya",       lat: 7.9568,  lon: 80.7603, province: "North Central" },
];

const WMO: Record<number, { label: string; icon: string }> = {
  0:  { label: "Clear Sky",           icon: "☀️" },
  1:  { label: "Mainly Clear",        icon: "🌤️" },
  2:  { label: "Partly Cloudy",       icon: "⛅" },
  3:  { label: "Overcast",            icon: "☁️" },
  45: { label: "Foggy",               icon: "🌫️" },
  48: { label: "Rime Fog",            icon: "🌫️" },
  51: { label: "Light Drizzle",       icon: "🌦️" },
  53: { label: "Moderate Drizzle",    icon: "🌦️" },
  55: { label: "Dense Drizzle",       icon: "🌧️" },
  61: { label: "Slight Rain",         icon: "🌧️" },
  63: { label: "Moderate Rain",       icon: "🌧️" },
  65: { label: "Heavy Rain",          icon: "🌧️" },
  80: { label: "Rain Showers",        icon: "🌦️" },
  81: { label: "Moderate Showers",    icon: "🌦️" },
  82: { label: "Violent Showers",     icon: "⛈️" },
  95: { label: "Thunderstorm",        icon: "⛈️" },
  96: { label: "Thunderstorm + Hail", icon: "⛈️" },
  99: { label: "Severe Thunderstorm", icon: "⛈️" },
};

const PROVINCE_COLORS: Record<string, string> = {
  "Western":       "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "Central":       "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  "Southern":      "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  "Northern":      "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  "Eastern":       "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  "North Western": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  "Sabaragamuwa":  "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  "Uva":           "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  "North Central": "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
};

interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  visibility: number;
}

function getWeatherIcon(code: number, size = 40) {
  const cls = `text-signal`;
  if ([95, 96, 99].includes(code)) return <Zap size={size} className="text-purple-500" />;
  if ([61,63,65,80,81,82].includes(code)) return <CloudRain size={size} className="text-blue-400" />;
  if ([51,53,55].includes(code)) return <CloudDrizzle size={size} className="text-blue-300" />;
  if ([1,2,3,45,48].includes(code)) return <Cloud size={size} className="text-slate-400" />;
  return <Sun size={size} className={cls} />;
}

function getBg(code: number) {
  if ([95,96,99].includes(code)) return "from-purple-500/10 to-slate-500/5";
  if (code >= 51) return "from-blue-500/10 to-blue-300/5";
  if (code >= 1) return "from-slate-300/20 to-slate-100/5";
  return "from-signal/10 to-go/5";
}

const drivingAdvisory = (code: number) => {
  if ([95,96,99].includes(code)) return { msg: "⛈️ Thunderstorm — avoid driving if possible. Hazardous road conditions.", color: "border-alert/40 bg-alert/5 text-alert" };
  if (code >= 61) return { msg: "🌧️ Heavy rain — slow down, use headlights, increase following distance.", color: "border-signal/40 bg-signal/5 text-signal" };
  if (code >= 51) return { msg: "🌦️ Drizzle — roads may be slippery. Drive with extra care.", color: "border-signal/40 bg-signal/5 text-signal" };
  if (code >= 45) return { msg: "🌫️ Fog — use fog lights, reduce speed, maintain large following distance.", color: "border-blue-400/40 bg-blue-400/5 text-blue-500" };
  return { msg: "✅ Good driving conditions. Stay alert and follow speed limits.", color: "border-go/40 bg-go/5 text-go" };
};

const fetchCity = async (lat: number, lon: number): Promise<WeatherData> => {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,visibility&timezone=Asia%2FColombo`;
  const res = await fetch(url);
  // Open-Meteo rate-limits on bursts. Without this check a 429 body has no `current`
  // and the destructuring below throws a confusing TypeError instead.
  if (!res.ok) throw new Error(`Weather service returned ${res.status}`);
  const data = await res.json();
  const c = data.current;
  if (!c) throw new Error("Weather service returned no current readings");
  return {
    temperature: Math.round(c.temperature_2m),
    feelsLike:   Math.round(c.apparent_temperature),
    humidity:    c.relative_humidity_2m,
    windSpeed:   Math.round(c.wind_speed_10m),
    weatherCode: c.weather_code,
    visibility:  Math.round((c.visibility || 10000) / 1000),
  };
};

// Group cities by province
const byProvince = CITIES.reduce<Record<string, typeof CITIES>>((acc, c) => {
  (acc[c.province] ??= []).push(c); return acc;
}, {});

export default function WeatherPage() {
  const { t } = useT();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [selected, setSelected]       = useState<WeatherData | null>(null);
  const [busySelected, setBusySelected] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");
  const [allWeather, setAllWeather]   = useState<Record<string, WeatherData>>({});
  const [loadingAll, setLoadingAll]   = useState(true);
  const [provFilter, setProvFilter]   = useState<string>("All");
  const [nearestCity, setNearestCity] = useState<string | null>(null);

  // Detect nearest city using GPS
  const detectNearestCity = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude, longitude } = pos.coords;
      let minDist = Infinity, nearIdx = 0;
      CITIES.forEach((c, i) => {
        const d = Math.hypot(c.lat - latitude, c.lon - longitude);
        if (d < minDist) { minDist = d; nearIdx = i; }
      });
      setSelectedIdx(nearIdx);
      setNearestCity(CITIES[nearIdx].name);
    });
  };

  const loadSelected = async () => {
    setBusySelected(true);
    try {
      const city = CITIES[selectedIdx];
      const data = await fetchCity(city.lat, city.lon);
      setSelected(data);
      setLastUpdated(new Date().toLocaleTimeString("en-LK", { hour: "2-digit", minute: "2-digit" }));
    } catch { /* ignore */ }
    setBusySelected(false);
  };

  const loadAll = async () => {
    setLoadingAll(true);
    try {
      // Load in batches of 6 to avoid rate-limit. allSettled rather than all, so one
      // rate-limited city drops out on its own instead of taking the rest with it.
      const results: Record<string, WeatherData> = {};
      for (let i = 0; i < CITIES.length; i += 6) {
        const batch = CITIES.slice(i, i + 6);
        const batchData = await Promise.allSettled(batch.map(c => fetchCity(c.lat, c.lon)));
        batch.forEach((c, j) => {
          const r = batchData[j];
          if (r.status === "fulfilled") results[c.name] = r.value;
        });
      }
      setAllWeather(results);
    } catch { /* ignore */ }
    setLoadingAll(false);
  };

  useEffect(() => { loadSelected(); }, [selectedIdx]);
  useEffect(() => { loadAll(); }, []);

  const city = CITIES[selectedIdx];
  const wmo = selected ? (WMO[selected.weatherCode] ?? { label: "Unknown", icon: "🌡️" }) : null;

  const provinces = ["All", ...Object.keys(byProvince)];
  const filteredCities = provFilter === "All" ? CITIES : byProvince[provFilter] ?? [];

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold font-display flex items-center gap-2">
            <Cloud className="text-signal" size={28} /> {t("weatherTitle")}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {t("weatherSub")} — {CITIES.length} locations across all 9 provinces
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={detectNearestCity}
            className="btn-ghost flex items-center gap-2 py-2 text-sm text-signal border-signal/40">
            <Navigation size={14} /> Detect My Location
          </button>
          <button onClick={loadSelected} disabled={busySelected} className="btn-ghost flex items-center gap-2 py-2 text-sm">
            <RefreshCw size={13} className={busySelected ? "animate-spin" : ""} /> {t("refresh")}
          </button>
        </div>
      </div>

      {nearestCity && (
        <div className="flex items-center gap-2 text-xs text-go bg-go/10 border border-go/30 rounded-xl px-3 py-2">
          <Navigation size={12} /> Nearest city detected: <strong>{nearestCity}</strong>
        </div>
      )}

      {/* Province filter tabs */}
      <div className="flex flex-wrap gap-2">
        {provinces.map(p => (
          <button key={p} onClick={() => setProvFilter(p)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
              provFilter === p
                ? "bg-signal text-asphalt-900 border-signal"
                : "border-slate-200 dark:border-asphalt-700 text-slate-600 dark:text-slate-300 hover:border-signal/50"
            }`}>
            {p === "All" ? `🇱🇰 All (${CITIES.length})` : p}
          </button>
        ))}
      </div>

      {/* Selected city main card */}
      {busySelected ? (
        <div className="card flex items-center justify-center h-48 gap-3 text-slate-400">
          <div className="animate-spin h-6 w-6 rounded-full border-b-2 border-signal" /> {t("loading")}
        </div>
      ) : selected && wmo ? (
        <div className={`card bg-gradient-to-br ${getBg(selected.weatherCode)} space-y-5`}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
              <MapPin size={15} className="text-signal" />
              {city.name}, {city.province} Province, Sri Lanka
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${PROVINCE_COLORS[city.province] || ""}`}>
                {city.province}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>{wmo.icon} {wmo.label}</span>
              {lastUpdated && <span>· {lastUpdated}</span>}
            </div>
          </div>

          <div className="flex items-end gap-4">
            {getWeatherIcon(selected.weatherCode, 44)}
            <div>
              <div className="text-6xl font-bold font-display text-slate-800 dark:text-slate-100">{selected.temperature}°C</div>
              <div className="text-sm text-slate-500">{wmo.label}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: Thermometer, label: t("feels"),    value: `${selected.feelsLike}°C` },
              { icon: Droplets,    label: t("humidity"), value: `${selected.humidity}%` },
              { icon: Wind,        label: t("wind"),     value: `${selected.windSpeed} km/h` },
              { icon: Eye,         label: "Visibility",  value: `${selected.visibility} km` },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-white/60 dark:bg-asphalt-800/60 backdrop-blur rounded-xl p-3 text-center">
                <Icon size={18} className="text-signal mx-auto mb-1" />
                <div className="text-lg font-bold text-slate-800 dark:text-slate-100">{value}</div>
                <div className="text-[10px] text-slate-500">{label}</div>
              </div>
            ))}
          </div>

          <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${drivingAdvisory(selected.weatherCode).color}`}>
            <strong>Driving Advisory:</strong> {drivingAdvisory(selected.weatherCode).msg}
          </div>
        </div>
      ) : null}

      {/* All cities grid by province */}
      {provFilter === "All" ? (
        Object.entries(byProvince).map(([province, cities]) => (
          <div key={province} className="space-y-3">
            <h3 className="font-bold font-display flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PROVINCE_COLORS[province] || "bg-slate-100"}`}>
                {province} Province
              </span>
            </h3>
            <CityGrid
              cities={cities}
              allWeather={allWeather}
              loadingAll={loadingAll}
              selectedIdx={selectedIdx}
              allCities={CITIES}
              onSelect={(idx) => setSelectedIdx(idx)}
            />
          </div>
        ))
      ) : (
        <CityGrid
          cities={filteredCities}
          allWeather={allWeather}
          loadingAll={loadingAll}
          selectedIdx={selectedIdx}
          allCities={CITIES}
          onSelect={(idx) => setSelectedIdx(idx)}
        />
      )}
    </div>
  );
}

function CityGrid({ cities, allWeather, loadingAll, selectedIdx, allCities, onSelect }: {
  cities: typeof CITIES;
  allWeather: Record<string, WeatherData>;
  loadingAll: boolean;
  selectedIdx: number;
  allCities: typeof CITIES;
  onSelect: (idx: number) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {cities.map(city => {
        const realIdx = allCities.findIndex(c => c.name === city.name);
        const w = allWeather[city.name];
        const wmo = w ? (WMO[w.weatherCode] ?? { label: "—", icon: "🌡️" }) : null;
        return (
          <button key={city.name} onClick={() => onSelect(realIdx)}
            className={`card text-left hover:border-signal/40 transition-all ${realIdx === selectedIdx ? "border-signal/60 bg-signal/5" : ""}`}>
            {loadingAll || !w ? (
              <div className="animate-pulse space-y-2">
                <div className="h-3 bg-slate-200 dark:bg-asphalt-700 rounded w-2/3" />
                <div className="h-6 bg-slate-100 dark:bg-asphalt-700 rounded w-1/2 mt-2" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{city.name}</span>
                    <div className={`text-[9px] px-1 rounded ${PROVINCE_COLORS[city.province] || ""} inline-block ml-1`}>{city.province}</div>
                  </div>
                  <span className="text-lg">{wmo!.icon}</span>
                </div>
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{w.temperature}°C</div>
                <div className="text-[10px] text-slate-400">{wmo!.label}</div>
                <div className="flex gap-3 mt-2 text-[10px] text-slate-400">
                  <span><Droplets size={9} className="inline mr-0.5" />{w.humidity}%</span>
                  <span><Wind size={9} className="inline mr-0.5" />{w.windSpeed} km/h</span>
                </div>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
