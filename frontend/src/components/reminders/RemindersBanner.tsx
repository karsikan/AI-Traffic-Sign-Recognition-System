import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, ChevronRight, XCircle, AlertTriangle, Clock } from "lucide-react";
import { useLang } from "@/context/LanguageContext";
import { ComputeApi } from "@/services/api";
import { localStore, onStoreChange } from "@/services/localStore";

/**
 * Everything falling due, shown the moment the app is opened.
 *
 * This is the delivery channel that actually works without a paid gateway: the driver
 * sees it on arrival. Renders nothing at all when there is nothing to say.
 */

const L = {
  title:   { en: "Needs your attention", ta: "உங்கள் கவனம் தேவை", si: "ඔබේ අවධානය අවශ්‍යයි" },
  open:    { en: "Open", ta: "திற", si: "විවෘත කරන්න" },
  more:    { en: "and {n} more", ta: "மேலும் {n}", si: "තවත් {n}" },
};

const URGENCY_STYLE: Record<string, { box: string; tone: string; icon: any }> = {
  overdue:  { box: "border-alert/40 bg-alert/5",           tone: "text-alert",       icon: XCircle },
  critical: { box: "border-orange-500/40 bg-orange-500/5", tone: "text-orange-500",  icon: AlertTriangle },
  warning:  { box: "border-signal/40 bg-signal/5",         tone: "text-signal",      icon: Clock },
};

export default function RemindersBanner({ limit = 3 }: { limit?: number }) {
  const { lang } = useLang();
  const tr = (k: keyof typeof L) => L[k][lang as "en" | "ta" | "si"] ?? L[k].en;

  const [data, setData] = useState<any>(null);

  // Reminders are worked out from the records on this device, not from a server copy.
  const load = () => {
    ComputeApi.reminders(localStore.list("fines"), localStore.list("documents"))
      .then(setData)
      .catch(() => setData(null));
  };

  useEffect(() => {
    load();
    return onStoreChange(load);
  }, []);

  if (!data || data.count === 0) return null;

  const shown = data.reminders.slice(0, limit);
  const rest = data.count - shown.length;

  return (
    <section className="space-y-2.5">
      <p className="font-bold font-display text-sm flex items-center gap-2">
        <Bell size={15} className="text-signal" /> {tr("title")}
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-alert/10 text-alert border-alert/30">
          {data.count}
        </span>
      </p>

      {shown.map((r: any, i: number) => {
        const style = URGENCY_STYLE[r.urgency] ?? URGENCY_STYLE.warning;
        const Icon = style.icon;
        return (
          <Link
            key={`${r.kind}-${r.ref_id}-${i}`}
            to={r.action_url}
            className={`card flex items-center gap-3 p-3.5 hover:shadow-md transition-shadow ${style.box}`}
          >
            <Icon size={17} className={`${style.tone} shrink-0`} />
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-semibold ${style.tone}`}>{r.title}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300 truncate">{r.message}</p>
            </div>
            <ChevronRight size={16} className="text-slate-400 shrink-0" />
          </Link>
        );
      })}

      {rest > 0 && (
        <p className="text-xs text-slate-500 pl-1">{tr("more").replace("{n}", String(rest))}</p>
      )}
    </section>
  );
}
