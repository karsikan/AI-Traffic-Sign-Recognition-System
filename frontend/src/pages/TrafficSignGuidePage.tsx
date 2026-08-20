import { useEffect, useState } from "react";
import { SignsApi } from "@/services/api";
import type { TrafficSign } from "@/types";
import SignInfoPanel from "@/components/SignInfoPanel";
import { useLang } from "@/context/LanguageContext";
import { mockTrafficSigns } from "@/data/mockData";

const cats = ["", "warning", "prohibitory", "mandatory", "info"];

export default function TrafficSignGuidePage() {
  const { t } = useLang();
  const [signs, setSigns] = useState<TrafficSign[]>([]);
  const [cat, setCat] = useState("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  const loadSigns = async () => {
    setBusy(true);
    try {
      const data = await SignsApi.list(cat || undefined);
      if (data.length === 0) {
        // Fallback to mock data if DB is empty
        setSigns(mockTrafficSigns);
      } else {
        setSigns(data);
      }
    } catch (err) {
      console.error("Failed to load signs", err);
      // Fallback
      setSigns(mockTrafficSigns);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    loadSigns();
  }, [cat]);

  const filtered = signs.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-bold font-display">{t("signs")}</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Explore standard road traffic signs categories, rules, and guidelines used in Sri Lanka.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="input max-w-xs text-xs py-2"
          placeholder="Search signs…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="flex flex-wrap gap-1.5 ml-2">
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`btn text-xs py-1.5 px-3 capitalize ${
                cat === c
                  ? "bg-signal text-asphalt-900 font-bold"
                  : "bg-slate-100 hover:bg-slate-200 dark:bg-asphalt-700 dark:hover:bg-asphalt-600 text-slate-700 dark:text-slate-300"
              }`}
            >
              {c || "all"}
            </button>
          ))}
        </div>
      </div>

      {busy && (
        <div className="card text-center p-8 text-slate-500 text-xs">
          Loading sign guide database...
        </div>
      )}

      {!busy && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <SignInfoPanel key={s.id} sign={s} />
          ))}
        </div>
      )}

      {!busy && filtered.length === 0 && (
        <div className="card text-center p-8 text-slate-500 text-xs">
          No signs matched your search criteria.
        </div>
      )}
    </div>
  );
}
