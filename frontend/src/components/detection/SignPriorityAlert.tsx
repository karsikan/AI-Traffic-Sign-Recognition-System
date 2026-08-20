import { Volume2, ShieldAlert, Lightbulb } from "lucide-react";

// Critical signs that warrant a priority alert
const CRITICAL_SIGNS: Record<string, { level: "danger" | "warning"; tip: string }> = {
  "stop":                  { level: "danger",  tip: "Come to a complete stop. Check all directions before proceeding." },
  "no entry":              { level: "danger",  tip: "Entry is prohibited. Do not drive into this area — turn around safely." },
  "no u-turn":             { level: "warning", tip: "U-turns are prohibited here. Plan an alternative route." },
  "school zone":           { level: "danger",  tip: "Slow down immediately. Watch for children crossing — max 25 km/h." },
  "pedestrian crossing":   { level: "danger",  tip: "Yield to pedestrians. Stop if someone is on or approaching the crossing." },
  "give way":              { level: "warning", tip: "Yield right of way to crossing traffic before proceeding." },
  "speed limit":           { level: "warning", tip: "Stay within the posted speed limit. Speeding fines apply in Sri Lanka." },
  "speed limit 60":        { level: "warning", tip: "Maximum speed 60 km/h. Reduce speed if conditions are wet or hazardous." },
  "speed limit 80":        { level: "warning", tip: "Maximum speed 80 km/h. Maintain safe following distance." },
  "speed limit 100":       { level: "warning", tip: "Maximum speed 100 km/h. Only on expressways — stay in left lane." },
  "bumpy road":            { level: "warning", tip: "Road surface is rough ahead. Reduce speed to protect your vehicle." },
  "slippery road":         { level: "danger",  tip: "Road may be wet and slippery. Reduce speed and avoid sharp braking." },
  "sharp curve":           { level: "warning", tip: "Sharp bend ahead. Slow down before the curve, not during it." },
  "road narrows":          { level: "warning", tip: "Road narrows ahead. Move to the left and be ready to yield." },
  "no overtaking":         { level: "warning", tip: "Overtaking is prohibited. Stay in your lane." },
  "roundabout":            { level: "warning", tip: "Give way to traffic already in the roundabout. Signal when exiting." },
  "traffic signals ahead": { level: "warning", tip: "Traffic lights approaching. Be prepared to stop on red." },
};

// Generic tips for non-critical signs
const GENERIC_TIPS: Record<string, string> = {
  "one way":         "Follow the direction of travel only. Wrong-way entry is extremely dangerous.",
  "no parking":      "Parking is not permitted here. Violations result in vehicle impoundment in Sri Lanka.",
  "no horn":         "Honking is prohibited in this area. Drive silently past this zone.",
  "hospital":        "Hospital zone — reduce speed and noise. Emergency vehicles may exit at any time.",
  "railway crossing":"Stop and check both directions before crossing railway tracks.",
};

interface SignPriorityAlertProps {
  labels: string[];   // detected sign names
  onSpeak: (text: string) => void;
}

function matchSign(label: string): { key: string; data: { level: "danger" | "warning"; tip: string } } | null {
  const lower = label.toLowerCase().trim();
  for (const [key, data] of Object.entries(CRITICAL_SIGNS)) {
    if (lower.includes(key)) return { key, data };
  }
  return null;
}

function genericTip(label: string): string | null {
  const lower = label.toLowerCase().trim();
  for (const [key, tip] of Object.entries(GENERIC_TIPS)) {
    if (lower.includes(key)) return tip;
  }
  return null;
}

export default function SignPriorityAlert({ labels, onSpeak }: SignPriorityAlertProps) {
  if (!labels.length) return null;

  // Find the highest-priority match across all detected labels
  let topAlert: { label: string; level: "danger" | "warning"; tip: string } | null = null;
  const safeTips: { label: string; tip: string }[] = [];

  for (const label of labels) {
    const match = matchSign(label);
    if (match) {
      if (!topAlert || match.data.level === "danger") {
        topAlert = { label, level: match.data.level, tip: match.data.tip };
      }
    } else {
      const tip = genericTip(label);
      if (tip) safeTips.push({ label, tip });
    }
  }

  if (!topAlert && !safeTips.length) return null;

  return (
    <div className="space-y-3">
      {/* Priority Alert — critical signs */}
      {topAlert && (
        <div className={`rounded-2xl border-2 p-4 space-y-2 ${
          topAlert.level === "danger"
            ? "border-alert bg-alert/10 dark:bg-alert/10"
            : "border-signal bg-signal/10 dark:bg-signal/10"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert
                size={18}
                className={`${topAlert.level === "danger" ? "text-alert animate-pulse" : "text-signal"}`}
              />
              <span className={`text-xs font-bold uppercase tracking-wider ${
                topAlert.level === "danger" ? "text-alert" : "text-signal"
              }`}>
                {topAlert.level === "danger" ? "⚠ Critical Sign Detected" : "⚠ Warning Sign Detected"}
              </span>
            </div>
            <button
              onClick={() => onSpeak(`Warning: ${topAlert!.label}. ${topAlert!.tip}`)}
              className="text-slate-500 hover:text-signal transition p-1"
              title="Read alert aloud"
            >
              <Volume2 size={14} />
            </button>
          </div>

          <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">{topAlert.label}</p>
          <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">{topAlert.tip}</p>
        </div>
      )}

      {/* Safety Tips — non-critical but informative signs */}
      {safeTips.map((t, i) => (
        <div key={i} className="rounded-xl border border-go/30 bg-go/5 p-3 flex items-start gap-2">
          <Lightbulb size={14} className="text-go shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{t.label}</p>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-0.5">{t.tip}</p>
          </div>
          <button onClick={() => onSpeak(t.tip)} className="ml-auto text-slate-400 hover:text-go shrink-0">
            <Volume2 size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
