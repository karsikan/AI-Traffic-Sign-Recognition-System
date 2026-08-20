import { useEffect, useState } from "react";
// services/api.ts is the live API layer. The one in api/endpoints.ts is from an older
// build and points at /api/* paths this backend does not serve.
import { FineApi } from "@/services/api";
import { useLang } from "@/context/LanguageContext";

export default function FineCalculator() {
  const { t } = useLang();
  const [offences, setOffences] = useState<Record<string, number>>({});
  const [currencies, setCurrencies] = useState<string[]>([]);
  const [offence, setOffence] = useState("");
  const [amount, setAmount] = useState(0);
  const [currency, setCurrency] = useState("USD");
  const [res, setRes] = useState<any>(null);

  useEffect(() => {
    FineApi.offences().then((o) => { setOffences(o); const f = Object.keys(o)[0]; setOffence(f); setAmount(o[f]); });
    FineApi.currencies().then(setCurrencies);
  }, []);

  const calc = async () => setRes(await FineApi.calculate(offence, amount, currency));

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-3xl font-bold">{t("fines")}</h1>
      <div className="card space-y-4">
        <div><label className="label">Offence</label>
          <select className="input" value={offence}
            onChange={(e) => { setOffence(e.target.value); setAmount(offences[e.target.value]); }}>
            {Object.keys(offences).map((o) => <option key={o}>{o}</option>)}
          </select></div>
        <div><label className="label">Fine amount (LKR)</label>
          <input className="input" type="number" value={amount}
            onChange={(e) => setAmount(+e.target.value)} /></div>
        <div><label className="label">Convert to</label>
          <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {currencies.filter((c) => c !== "LKR").map((c) => <option key={c}>{c}</option>)}
          </select></div>
        <button className="btn-primary w-full" onClick={calc}>{t("calculate")}</button>
      </div>
      {res && (
        <div className="card text-center">
          <p className="text-sm text-slate-500">{res.offence}</p>
          <p className="display text-3xl font-bold text-signal">
            {res.amount_lkr.toLocaleString()} LKR
          </p>
          <p className="mt-1">= {res.converted_amount.toLocaleString()} {res.target_currency}</p>
          <p className="text-xs text-slate-400">Rate: 1 {res.target_currency} = {res.exchange_rate} LKR</p>
        </div>
      )}
    </div>
  );
}
