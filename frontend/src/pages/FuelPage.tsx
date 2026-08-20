import { useEffect, useState } from "react";
import { useLang } from "@/context/LanguageContext";
import { FuelApi } from "@/services/api";
import {
  Fuel, Calculator, AlertTriangle, Info, ExternalLink,
  ArrowLeftRight, TrendingDown, Gauge,
} from "lucide-react";

const UI = {
  en: {
    title: "Fuel & Trip Cost",
    sub: "What a journey actually costs in fuel — and prices that tell you honestly how old they are.",
    board: "Price board", checked: "Last checked", perLitre: "per litre",
    source: "Check the current price",
    estimator: "Trip cost estimator",
    distance: "Distance (km)", mileage: "Your mileage (km per litre)",
    fuelType: "Fuel", pumpPrice: "Today's pump price (optional)",
    returnTrip: "Return trip", calc: "Calculate",
    litres: "Fuel needed", cost: "Cost", perKm: "Per km",
    compare: "Compare grades", cheapest: "Cheapest",
    routes: "Common routes", typical: "Typical mileage",
    useRoute: "Use", dataNote: "About these prices", mileageNote: "Finding your own mileage",
    loading: "Loading…",
    failed: "Could not reach the backend on port 8000.",
  },
  ta: {
    title: "எரிபொருள் & பயணச் செலவு",
    sub: "ஒரு பயணத்துக்கு உண்மையா எவ்வளவு எரிபொருள் செலவு — விலை எவ்வளவு பழையதுன்னும் நேர்மையா சொல்லும்.",
    board: "விலைப் பட்டியல்", checked: "கடைசியா சரிபார்த்தது", perLitre: "லிட்டருக்கு",
    source: "இன்றைய விலையைப் பாருங்கள்",
    estimator: "பயணச் செலவுக் கணிப்பான்",
    distance: "தூரம் (கி.மீ)", mileage: "உங்கள் மைலேஜ் (கி.மீ / லிட்டர்)",
    fuelType: "எரிபொருள்", pumpPrice: "இன்றைய pump விலை (விருப்பம்)",
    returnTrip: "போய் வர", calc: "கணக்கிடு",
    litres: "தேவையான எரிபொருள்", cost: "செலவு", perKm: "கி.மீ-க்கு",
    compare: "வகைகளை ஒப்பிடு", cheapest: "மலிவானது",
    routes: "பொதுவான பாதைகள்", typical: "வழக்கமான மைலேஜ்",
    useRoute: "பயன்படுத்து", dataNote: "இந்த விலைகள் பற்றி", mileageNote: "உங்கள் மைலேஜைக் கண்டறிய",
    loading: "ஏற்றப்படுகிறது…",
    failed: "Backend port 8000-ஐ அணுக முடியவில்லை.",
  },
  si: {
    title: "ඉන්ධන සහ ගමන් වියදම",
    sub: "ගමනකට ඇත්තටම ඉන්ධන කීයක් යනවාද — මිල කොපමණ පැරණිද යන්නත් අවංකව කියයි.",
    board: "මිල පුවරුව", checked: "අවසන් පරීක්ෂාව", perLitre: "ලීටරයකට",
    source: "වත්මන් මිල බලන්න",
    estimator: "ගමන් වියදම් ගණකය",
    distance: "දුර (කි.මී)", mileage: "ඔබේ ධාවන දුර (කි.මී / ලීටර්)",
    fuelType: "ඉන්ධන", pumpPrice: "අද pump මිල (විකල්ප)",
    returnTrip: "ගොස් ඒම", calc: "ගණනය",
    litres: "අවශ්‍ය ඉන්ධන", cost: "වියදම", perKm: "කි.මී එකකට",
    compare: "වර්ග සසඳන්න", cheapest: "අඩුම",
    routes: "සුලභ මාර්ග", typical: "සාමාන්‍ය ධාවන දුර",
    useRoute: "භාවිතා", dataNote: "මෙම මිල ගැන", mileageNote: "ඔබේ ධාවන දුර සොයාගැනීම",
    loading: "පූරණය වෙමින්…",
    failed: "Backend port 8000 වෙත ළඟා විය නොහැක.",
  },
};

type LabelKey = keyof typeof UI.en;

export default function FuelPage() {
  const { lang } = useLang();
  const tr = (k: LabelKey): string => UI[(lang as "en" | "ta" | "si")]?.[k] ?? UI.en[k];

  const [board, setBoard] = useState<any>(null);
  const [reference, setReference] = useState<any>(null);
  const [error, setError] = useState(false);

  const [distance, setDistance] = useState("115");
  const [mileage, setMileage] = useState("14");
  const [fuel, setFuel] = useState("petrol_92");
  const [price, setPrice] = useState("");
  const [returnTrip, setReturnTrip] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [comparison, setComparison] = useState<any>(null);

  useEffect(() => {
    FuelApi.prices().then(setBoard).catch(() => setError(true));
    FuelApi.reference().then(setReference).catch(() => {});
  }, []);

  const run = async () => {
    const d = Number(distance), m = Number(mileage);
    if (!d || !m) return;
    try {
      const [est, cmp] = await Promise.all([
        FuelApi.estimate(d, m, fuel, price ? Number(price) : null, returnTrip),
        FuelApi.compare(d, m, returnTrip),
      ]);
      setResult(est);
      setComparison(cmp);
    } catch {
      setResult(null);
    }
  };

  if (error) {
    return (
      <div className="card border-alert/30 bg-alert/5 flex items-start gap-3">
        <AlertTriangle className="text-alert shrink-0 mt-0.5" size={18} />
        <p className="text-sm text-slate-600 dark:text-slate-300">{tr("failed")}</p>
      </div>
    );
  }
  if (!board) {
    return (
      <div className="card flex flex-col items-center justify-center p-10 space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-signal" />
        <p className="text-slate-600 dark:text-slate-300 font-medium">{tr("loading")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display">{tr("title")}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">{tr("sub")}</p>
      </div>

      {/* Staleness banner — the honest bit */}
      <div className={`card flex items-start gap-3 ${
        board.stale ? "border-alert/40 bg-alert/5" : "border-signal/40 bg-signal/5"}`}>
        <AlertTriangle className={`shrink-0 mt-0.5 ${board.stale ? "text-alert" : "text-signal"}`} size={18} />
        <div className="flex-1">
          <p className="text-sm text-slate-700 dark:text-slate-200">{board.staleness_message}</p>
          <a href={board.source_url} target="_blank" rel="noopener noreferrer"
            className="text-xs text-signal font-semibold hover:underline inline-flex items-center gap-1 mt-1">
            <ExternalLink size={11} /> {tr("source")}
          </a>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-4">
          {/* Price board */}
          <div className="card space-y-3">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-bold font-display text-sm flex items-center gap-2">
                <Fuel size={15} className="text-signal" /> {tr("board")}
              </p>
              <span className="text-[10px] text-slate-400">
                {tr("checked")} {board.checked_on}
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {board.fuels.map((f: any) => (
                <div key={f.key} className="rounded-xl bg-slate-50 dark:bg-asphalt-700/40 p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-xs font-semibold min-w-0 truncate">{f.label}</p>
                    <p className="display text-lg font-bold text-signal shrink-0">
                      {f.price_lkr}
                    </p>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">{f.note}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Estimator */}
          <div className="card space-y-3">
            <p className="font-bold font-display text-sm flex items-center gap-2">
              <Calculator size={15} className="text-signal" /> {tr("estimator")}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label text-xs">{tr("distance")}</label>
                <input className="input py-2 text-sm" type="number" value={distance}
                  onChange={(e) => setDistance(e.target.value)} />
              </div>
              <div>
                <label className="label text-xs">{tr("mileage")}</label>
                <input className="input py-2 text-sm" type="number" value={mileage}
                  onChange={(e) => setMileage(e.target.value)} />
              </div>
              <div>
                <label className="label text-xs">{tr("fuelType")}</label>
                <select className="input py-2 text-sm" value={fuel} onChange={(e) => setFuel(e.target.value)}>
                  {board.fuels.filter((f: any) => f.key !== "kerosene").map((f: any) => (
                    <option key={f.key} value={f.key}>{f.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label text-xs">{tr("pumpPrice")}</label>
                <input className="input py-2 text-sm" type="number" placeholder="—" value={price}
                  onChange={(e) => setPrice(e.target.value)} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="h-4 w-4 accent-[#f5a623]"
                checked={returnTrip} onChange={(e) => setReturnTrip(e.target.checked)} />
              <ArrowLeftRight size={13} className="text-slate-400" /> {tr("returnTrip")}
            </label>
            <button className="btn-primary w-full py-2 text-sm" onClick={run}>{tr("calc")}</button>

            {result && (
              <div className="space-y-3 border-t border-slate-100 dark:border-asphalt-700 pt-3">
                <div className="text-center">
                  <p className="display text-4xl font-bold text-signal">
                    {result.cost_lkr.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                    LKR · {result.distance_km} km · {result.fuel_label}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    [tr("litres"), `${result.litres_needed} L`],
                    [tr("perKm"), `${result.cost_per_km_lkr}`],
                    [tr("perLitre"), `${result.price_per_litre_lkr}`],
                  ].map(([k, v]) => (
                    <div key={String(k)} className="rounded-xl bg-slate-50 dark:bg-asphalt-700/40 p-2.5 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{k}</p>
                      <p className="text-sm font-bold">{v}</p>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500">{result.note}</p>
                {result.warning && (
                  <p className="text-[11px] text-signal flex items-start gap-1.5">
                    <AlertTriangle size={12} className="shrink-0 mt-0.5" /> {result.warning}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Grade comparison */}
          {comparison && (
            <div className="card space-y-2">
              <p className="font-bold font-display text-sm flex items-center gap-2">
                <TrendingDown size={15} className="text-go" /> {tr("compare")}
              </p>
              {comparison.rows.map((r: any, i: number) => (
                <div key={r.fuel}
                  className={`flex items-center justify-between gap-3 rounded-xl p-2.5 ${
                    i === 0 ? "bg-go/10 border border-go/30" : "bg-slate-50 dark:bg-asphalt-700/40"}`}>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">
                      {r.label}
                      {i === 0 && <span className="text-go ml-1.5">· {tr("cheapest")}</span>}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {r.litres_needed} L @ {r.price_per_litre_lkr}
                    </p>
                  </div>
                  <p className="display text-base font-bold shrink-0">
                    {r.cost_lkr.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Side */}
        <div className="lg:col-span-5 space-y-4">
          {reference && (
            <>
              <div className="card space-y-1.5">
                <p className="font-bold font-display text-sm">{tr("routes")}</p>
                {reference.common_routes.map((r: any) => (
                  <button key={`${r.from}-${r.to}`}
                    onClick={() => setDistance(String(r.distance_km))}
                    className="w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5
                        text-xs hover:bg-slate-100 dark:hover:bg-asphalt-700 transition text-left">
                    <span className="min-w-0 truncate">{r.from} → {r.to}</span>
                    <span className="text-slate-400 shrink-0">{r.distance_km} km</span>
                  </button>
                ))}
              </div>

              <div className="card space-y-1.5">
                <p className="font-bold font-display text-sm flex items-center gap-2">
                  <Gauge size={15} className="text-signal" /> {tr("typical")}
                </p>
                {reference.typical_mileage.map((m: any) => (
                  <button key={m.vehicle}
                    onClick={() => setMileage(String(m.km_per_litre))}
                    className="w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5
                        text-xs hover:bg-slate-100 dark:hover:bg-asphalt-700 transition text-left">
                    <span className="min-w-0 truncate">{m.vehicle}</span>
                    <span className="text-slate-400 shrink-0">{m.km_per_litre} km/L</span>
                  </button>
                ))}
                <p className="text-[11px] text-slate-500 border-t border-slate-100 dark:border-asphalt-700 pt-2 mt-1">
                  <span className="font-semibold">{tr("mileageNote")}: </span>
                  {reference.mileage_note}
                </p>
              </div>
            </>
          )}

          <div className="card border-slate-200 dark:border-asphalt-700 flex gap-3">
            <Info className="text-slate-400 shrink-0 mt-0.5" size={16} />
            <div>
              <p className="text-xs font-bold mb-1">{tr("dataNote")}</p>
              <p className="text-xs text-slate-500">{board.data_note}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
