import { useEffect, useMemo, useState } from "react";
import { useLang } from "@/context/LanguageContext";
import { ExpresswayApi } from "@/services/api";
import {
  Route, ArrowRight, CreditCard, AlertTriangle, Phone,
  ArrowLeftRight, CheckCircle2, ShieldQuestion,
} from "lucide-react";

const UI = {
  en: {
    title: "Expressway Assistant",
    sub: "What the toll will be before you reach the gate, and how the ETC card works.",
    expressway: "Expressway", entry: "Entering at", exit: "Leaving at",
    vehicle: "Vehicle class", swap: "Swap",
    toll: "Toll", distance: "Distance", allClasses: "All vehicle classes",
    fareBoard: "Every fare from here", to: "To",
    etcTitle: "ETC card", rulesTitle: "Expressway rules",
    emergency: "Expressway emergency", confidence: "About this figure",
    dataNote: "How the fare is worked out",
    loading: "Loading…",
    failed: "Could not reach the backend on port 8000.",
    pickBoth: "Choose an entry and an exit.",
  },
  ta: {
    title: "நெடுஞ்சாலை உதவியாளர்",
    sub: "நுழைவாயிலை அடையும் முன்பே கட்டணம் எவ்வளவு, ETC card எப்படி வேலை செய்யுது.",
    expressway: "நெடுஞ்சாலை", entry: "நுழையும் இடம்", exit: "வெளியேறும் இடம்",
    vehicle: "வாகன வகை", swap: "மாற்று",
    toll: "கட்டணம்", distance: "தூரம்", allClasses: "அனைத்து வாகன வகைகள்",
    fareBoard: "இங்கிருந்து அனைத்துக் கட்டணங்கள்", to: "வரை",
    etcTitle: "ETC அட்டை", rulesTitle: "நெடுஞ்சாலை விதிகள்",
    emergency: "நெடுஞ்சாலை அவசரம்", confidence: "இந்த எண் பற்றி",
    dataNote: "கட்டணம் எப்படிக் கணக்கிடப்படுகிறது",
    loading: "ஏற்றப்படுகிறது…",
    failed: "Backend port 8000-ஐ அணுக முடியவில்லை.",
    pickBoth: "நுழைவு & வெளியேறும் இடத்தைத் தேர்ந்தெடுங்கள்.",
  },
  si: {
    title: "අධිවේගී මාර්ග සහායක",
    sub: "ගේට්ටුවට යාමට පෙර ගාස්තුව කීයද, ETC කාඩ්පත ක්‍රියා කරන ආකාරය.",
    expressway: "අධිවේගී මාර්ගය", entry: "ඇතුළු වන ස්ථානය", exit: "පිටවන ස්ථානය",
    vehicle: "වාහන පන්තිය", swap: "මාරු කරන්න",
    toll: "ගාස්තුව", distance: "දුර", allClasses: "සියලු වාහන පන්ති",
    fareBoard: "මෙතැනින් සියලු ගාස්තු", to: "දක්වා",
    etcTitle: "ETC කාඩ්පත", rulesTitle: "අධිවේගී මාර්ග නීති",
    emergency: "අධිවේගී මාර්ග හදිසි", confidence: "මෙම අගය ගැන",
    dataNote: "ගාස්තුව ගණනය කරන ආකාරය",
    loading: "පූරණය වෙමින්…",
    failed: "Backend port 8000 වෙත ළඟා විය නොහැක.",
    pickBoth: "ඇතුළු වන සහ පිටවන ස්ථාන තෝරන්න.",
  },
};

type LabelKey = keyof typeof UI.en;

const CONFIDENCE_STYLE: Record<string, { label: string; cls: string }> = {
  verified:       { label: "Verified", cls: "bg-go/10 text-go border-go/30" },
  endpoints_only: { label: "End-to-end verified", cls: "bg-signal/10 text-signal border-signal/30" },
  assumed:        { label: "Estimate", cls: "bg-alert/10 text-alert border-alert/30" },
};

export default function ExpresswayPage() {
  const { lang } = useLang();
  const tr = (k: LabelKey): string => UI[(lang as "en" | "ta" | "si")]?.[k] ?? UI.en[k];

  const [info, setInfo] = useState<any>(null);
  const [error, setError] = useState(false);
  const [code, setCode] = useState("E01");
  const [entry, setEntry] = useState("");
  const [exit, setExit] = useState("");
  const [vehicleClass, setVehicleClass] = useState("class1");
  const [result, setResult] = useState<any>(null);
  const [board, setBoard] = useState<any>(null);

  useEffect(() => {
    ExpresswayApi.info().then((d) => {
      setInfo(d);
      const first = d.expressways.find((e: any) => e.code === "E01") ?? d.expressways[0];
      setCode(first.code);
      setEntry(first.interchanges[0].key);
      setExit(first.interchanges[first.interchanges.length - 1].key);
    }).catch(() => setError(true));
  }, []);

  const current = useMemo(
    () => info?.expressways.find((e: any) => e.code === code),
    [info, code]
  );

  // Recalculate whenever any input changes — no button needed
  useEffect(() => {
    if (!entry || !exit || entry === exit) { setResult(null); return; }
    ExpresswayApi.toll(code, entry, exit, vehicleClass).then(setResult).catch(() => setResult(null));
    ExpresswayApi.fareTable(code, entry, vehicleClass).then(setBoard).catch(() => setBoard(null));
  }, [code, entry, exit, vehicleClass]);

  const switchExpressway = (next: string) => {
    const spec = info.expressways.find((e: any) => e.code === next);
    setCode(next);
    setEntry(spec.interchanges[0].key);
    setExit(spec.interchanges[spec.interchanges.length - 1].key);
  };

  if (error) {
    return (
      <div className="card border-alert/30 bg-alert/5 flex items-start gap-3">
        <AlertTriangle className="text-alert shrink-0 mt-0.5" size={18} />
        <p className="text-sm text-slate-600 dark:text-slate-300">{tr("failed")}</p>
      </div>
    );
  }
  if (!info || !current) {
    return (
      <div className="card flex flex-col items-center justify-center p-10 space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-signal" />
        <p className="text-slate-600 dark:text-slate-300 font-medium">{tr("loading")}</p>
      </div>
    );
  }

  const conf = result ? CONFIDENCE_STYLE[result.confidence] ?? CONFIDENCE_STYLE.assumed : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display">{tr("title")}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">{tr("sub")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-4">
          {/* Route picker */}
          <div className="card space-y-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                {tr("expressway")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {info.expressways.map((e: any) => (
                  <button key={e.code} onClick={() => switchExpressway(e.code)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${
                      code === e.code
                        ? "bg-signal text-asphalt-900 border-signal"
                        : "border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-asphalt-700 dark:text-slate-300 dark:hover:bg-asphalt-700"
                    }`}>
                    {e.code}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">{current.name} · {current.route}</p>
            </div>

            <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] items-end">
              <div>
                <label className="label text-xs">{tr("entry")}</label>
                <select className="input py-2 text-sm" value={entry} onChange={(e) => setEntry(e.target.value)}>
                  {current.interchanges.map((i: any) => (
                    <option key={i.key} value={i.key}>{i.name}</option>
                  ))}
                </select>
              </div>
              <button className="btn-ghost px-2.5 py-2 mb-0.5" title={tr("swap")}
                onClick={() => { const a = entry; setEntry(exit); setExit(a); }}>
                <ArrowLeftRight size={15} />
              </button>
              <div>
                <label className="label text-xs">{tr("exit")}</label>
                <select className="input py-2 text-sm" value={exit} onChange={(e) => setExit(e.target.value)}>
                  {current.interchanges.map((i: any) => (
                    <option key={i.key} value={i.key}>{i.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                {tr("vehicle")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {info.vehicle_classes.map((c: any) => (
                  <button key={c.key} onClick={() => setVehicleClass(c.key)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${
                      vehicleClass === c.key
                        ? "bg-signal text-asphalt-900 border-signal"
                        : "border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-asphalt-700 dark:text-slate-300 dark:hover:bg-asphalt-700"
                    }`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Result */}
          {result ? (
            <div className="card border-signal/40 bg-signal/5 space-y-4">
              <div className="flex items-center justify-center gap-3 text-sm font-medium">
                <span>{result.entry}</span>
                <ArrowRight size={15} className="text-signal shrink-0" />
                <span>{result.exit}</span>
              </div>
              <div className="text-center">
                <p className="display text-5xl font-bold text-signal">
                  {result.toll_lkr.toLocaleString()}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                  LKR · {result.distance_km} km · {result.vehicle_class_label}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {info.vehicle_classes.map((c: any) => (
                  <div key={c.key}
                    className={`rounded-xl p-2.5 text-center ${
                      c.key === vehicleClass
                        ? "bg-signal/15 border border-signal/40"
                        : "bg-white/60 dark:bg-asphalt-800/60"}`}>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
                      {c.label.split(" ")[0]}
                    </p>
                    <p className="text-sm font-bold">
                      {result.all_classes[c.key].toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>

              {conf && (
                <div className="flex items-start gap-2 border-t border-signal/20 pt-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${conf.cls}`}>
                    {conf.label}
                  </span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    {result.confidence_note}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="card text-center p-6 text-sm text-slate-500">{tr("pickBoth")}</div>
          )}

          {/* Fare board */}
          {board && board.rows.length > 0 && (
            <div className="card p-0 overflow-hidden">
              <p className="font-bold font-display text-sm p-4 pb-3">
                {tr("fareBoard")} — {board.from}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-asphalt-700/40 text-left">
                      <th className="px-4 py-2 font-bold text-slate-500">{tr("to")}</th>
                      <th className="px-4 py-2 font-bold text-slate-500">{tr("distance")}</th>
                      <th className="px-4 py-2 font-bold text-slate-500 text-right">{tr("toll")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {board.rows.map((r: any) => (
                      <tr key={r.to_key}
                        className={`border-t border-slate-100 dark:border-asphalt-700 ${
                          r.to_key === exit ? "bg-signal/5 font-semibold" : ""}`}>
                        <td className="px-4 py-2">{r.to}</td>
                        <td className="px-4 py-2 text-slate-500">{r.distance_km} km</td>
                        <td className="px-4 py-2 text-right font-bold text-signal">
                          {r.toll_lkr.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Side */}
        <div className="lg:col-span-5 space-y-4">
          <div className="card space-y-3">
            <p className="font-bold font-display text-sm flex items-center gap-2">
              <CreditCard size={15} className="text-signal" /> {tr("etcTitle")}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300">{info.etc.what}</p>
            <ol className="space-y-2.5">
              {info.etc.steps.map((s: any) => (
                <li key={s.step} className="flex gap-2.5">
                  <span className="shrink-0 h-[18px] w-[18px] rounded-full bg-signal/20 text-signal text-[10px] font-bold flex items-center justify-center">
                    {s.step}
                  </span>
                  <div>
                    <p className="text-xs font-medium">{s.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{s.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="text-[11px] text-slate-500 italic border-t border-slate-100 dark:border-asphalt-700 pt-2">
              {info.etc.note}
            </p>
          </div>

          <div className="card space-y-2">
            <p className="font-bold font-display text-sm flex items-center gap-2">
              <Route size={15} className="text-signal" /> {tr("rulesTitle")}
            </p>
            <ul className="space-y-1.5">
              {info.rules.map((r: string) => (
                <li key={r} className="flex gap-2 text-xs">
                  <CheckCircle2 size={12} className="text-go shrink-0 mt-0.5" />
                  <span className="text-slate-600 dark:text-slate-300">{r}</span>
                </li>
              ))}
            </ul>
          </div>

          <a href={`tel:${info.emergency_number}`}
            className="card border-alert/40 bg-alert/5 flex items-center gap-3 hover:bg-alert/10 transition">
            <Phone size={18} className="text-alert shrink-0" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {tr("emergency")}
              </p>
              <p className="display text-xl font-bold text-alert">{info.emergency_number}</p>
            </div>
          </a>

          <div className="card border-slate-200 dark:border-asphalt-700 flex gap-3">
            <ShieldQuestion className="text-slate-400 shrink-0 mt-0.5" size={16} />
            <div>
              <p className="text-xs font-bold mb-1">{tr("dataNote")}</p>
              <p className="text-xs text-slate-500">{info.note}</p>
              <p className="text-[10px] text-slate-400 mt-1">
                Rates checked {info.rates_verified_on}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
