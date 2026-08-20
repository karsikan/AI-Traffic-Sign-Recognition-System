import { ExternalLink, Star } from "lucide-react";
import { useLang } from "@/context/LanguageContext";

/**
 * The list of places a spot fine can be paid, with a real link where the channel has one.
 *
 * GovPay serves the same page in all three languages, so the button follows whichever
 * language the site is in rather than always sending the driver to English.
 */

const L = {
  payHere: { en: "Pay here", ta: "இங்கே செலுத்து", si: "මෙතැනින් ගෙවන්න" },
  best:    { en: "Fastest", ta: "விரைவானது", si: "වේගවත්ම" },
};

export interface PaymentChannel {
  channel: string;
  detail: string;
  url?: string | null;
  urls?: Record<string, string>;
  note?: string | null;
  recommended?: boolean;
}

export default function PaymentChannels({ channels, note }: {
  channels: PaymentChannel[];
  note?: string;
}) {
  const { lang } = useLang();
  const key = lang as "en" | "ta" | "si";
  const tr = (k: keyof typeof L) => L[k][key] ?? L[k].en;

  return (
    <div className="space-y-2.5">
      {channels.map((c) => {
        const href = c.urls?.[key] ?? c.url ?? null;
        return (
          <div
            key={c.channel}
            className={`rounded-xl border p-3 space-y-2 ${
              c.recommended
                ? "border-go/40 bg-go/5"
                : "border-slate-200 bg-slate-50 dark:border-asphalt-700 dark:bg-asphalt-700/40"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold flex items-center gap-1.5 min-w-0">
                {c.channel}
                {c.recommended && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border bg-go/10 text-go border-go/30 shrink-0 flex items-center gap-1">
                    <Star size={9} /> {tr("best")}
                  </span>
                )}
              </p>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300">{c.detail}</p>
            {c.note && <p className="text-[11px] text-slate-500 italic">{c.note}</p>}
            {href && (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost w-full py-1.5 text-xs"
              >
                <ExternalLink size={13} /> {tr("payHere")}
              </a>
            )}
          </div>
        );
      })}
      {note && <p className="text-[11px] text-slate-500 italic">{note}</p>}
    </div>
  );
}
