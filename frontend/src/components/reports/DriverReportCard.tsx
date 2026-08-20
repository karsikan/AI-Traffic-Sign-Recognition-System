import { useEffect, useState } from "react";
import { FileDown, FileText, Info } from "lucide-react";
import { useLang } from "@/context/LanguageContext";
import { DetectionApi } from "@/services/api";
import { localStore, onStoreChange } from "@/services/localStore";

/**
 * Everything this device holds about the driver, as one PDF.
 *
 * The records are posted to the backend, the PDF comes straight back, and nothing is
 * stored there. The download is triggered from the returned blob rather than a link,
 * because the request has to carry a body.
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const L = {
  title:  { en: "Driver report (PDF)", ta: "சாரதி அறிக்கை (PDF)", si: "රියදුරු වාර්තාව (PDF)" },
  sub:    { en: "Fines, demerit points, documents and recent detections in one document.",
            ta: "அபராதங்கள், குறைப் புள்ளிகள், ஆவணங்கள், சமீபத்திய detections — ஒரே ஆவணத்தில்.",
            si: "දඩ, දඩ ලකුණු, ලේඛන සහ මෑත හඳුනාගැනීම් එක ලේඛනයක." },
  name:   { en: "Name to print (optional)", ta: "அச்சிட வேண்டிய பெயர் (விருப்பம்)", si: "මුද්‍රණය කළ යුතු නම (විකල්ප)" },
  download: { en: "Download PDF", ta: "PDF பதிவிறக்கு", si: "PDF බාගන්න" },
  working:  { en: "Building…", ta: "உருவாக்கப்படுகிறது…", si: "සාදමින්…" },
  failed:   { en: "Could not build the report.", ta: "அறிக்கையை உருவாக்க முடியவில்லை.", si: "වාර්තාව සෑදිය නොහැකි විය." },
  fines:    { en: "Fines", ta: "அபராதங்கள்", si: "දඩ" },
  documents:{ en: "Documents", ta: "ஆவணங்கள்", si: "ලේඛන" },
  demerit:  { en: "Demerit records", ta: "குறைப் புள்ளிகள்", si: "දඩ ලකුණු" },
  detections:{ en: "Detections", ta: "Detections", si: "හඳුනාගැනීම්" },
  localNote:{ en: "Built from the records on this device. Nothing is stored on the server.",
              ta: "இந்த சாதனத்தில் உள்ள பதிவுகளில் இருந்து உருவாக்கப்படுகிறது. Server-ல் எதுவும் சேமிக்கப்படுவதில்லை.",
              si: "මෙම උපාංගයේ ඇති වාර්තා වලින් සාදනු ලැබේ. සේවාදායකයේ කිසිවක් ගබඩා නොවේ." },
};

export default function DriverReportCard() {
  const { lang } = useLang();
  const key = lang as "en" | "ta" | "si";
  const tr = (k: keyof typeof L) => L[k][key] ?? L[k].en;

  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [counts, setCounts] = useState({ fines: 0, documents: 0, demerit: 0, detections: 0 });

  const refresh = () => {
    setCounts((c) => ({
      ...c,
      fines: localStore.count("fines"),
      documents: localStore.count("documents"),
      demerit: localStore.count("demerit"),
    }));
  };

  useEffect(() => {
    refresh();
    // Detections are the one part still held server-side — they are AI predictions,
    // not personal records, and the history page already lists them publicly.
    DetectionApi.history({ limit: 15 })
      .then((r: any) => setCounts((c) => ({ ...c, detections: r.predictions?.length ?? 0 })))
      .catch(() => {});
    return onStoreChange(refresh);
  }, []);

  const download = async () => {
    setBusy(true);
    setError("");
    try {
      let detections: any[] = [];
      try {
        const history: any = await DetectionApi.history({ limit: 15 });
        detections = (history.predictions ?? []).map((p: any) => ({
          sign_name: p.sign_name, confidence: p.confidence,
          source_type: p.source_type, created_at: p.created_at,
        }));
      } catch { /* the report is still worth having without them */ }

      const res = await fetch(`${API_BASE}/reports/driver.pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driver_name: name.trim() || undefined,
          fines: localStore.list("fines"),
          documents: localStore.list("documents"),
          demerit: localStore.list("demerit"),
          detections,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `roadsafety-report-${(name.trim() || "driver").toLowerCase().replace(/\s+/g, "-")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch {
      setError(tr("failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card space-y-3">
      <div>
        <p className="font-bold font-display text-sm flex items-center gap-2">
          <FileText size={15} className="text-signal" /> {tr("title")}
        </p>
        <p className="text-[11px] text-slate-500 mt-0.5">{tr("sub")}</p>
      </div>

      <dl className="grid grid-cols-2 gap-2">
        {([
          ["fines", counts.fines],
          ["demerit", counts.demerit],
          ["documents", counts.documents],
          ["detections", counts.detections],
        ] as const).map(([labelKey, n]) => (
          <div key={labelKey} className="rounded-xl bg-slate-50 dark:bg-asphalt-700/40 p-2.5">
            <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {tr(labelKey)}
            </dt>
            <dd className="text-sm font-bold">{n}</dd>
          </div>
        ))}
      </dl>

      <input
        className="input py-2 text-sm"
        placeholder={tr("name")}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <button className="btn-primary w-full py-2 text-sm" onClick={download} disabled={busy}>
        <FileDown size={15} /> {busy ? tr("working") : tr("download")}
      </button>

      {error && <p className="text-[11px] text-alert">{error}</p>}

      <p className="text-[10px] text-slate-400 flex items-start gap-1.5">
        <Info size={11} className="shrink-0 mt-0.5" /> {tr("localNote")}
      </p>
    </div>
  );
}
