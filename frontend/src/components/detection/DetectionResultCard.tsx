import { CheckCircle2, Volume2, AlertTriangle } from "lucide-react";
import { getSignTranslation } from "@/i18n/signTranslations";
import { useLang } from "@/context/LanguageContext";
import AutoTranslateText from "@/components/AutoTranslateText";

interface DetectionResultCardProps {
  label: string;
  category?: string;
  confidence: number;
  meaning?: string;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onSpeak: () => void;
  onReportWrong: () => void;
}

const LANG_FLAGS: Record<string, string> = { en: "🇬🇧", ta: "🇮🇳", si: "🇱🇰" };
const LANG_LABELS: Record<string, string> = { en: "English", ta: "தமிழ்", si: "සිංහල" };

export default function DetectionResultCard({
  label, category, confidence, meaning, isHovered, onMouseEnter, onMouseLeave, onSpeak, onReportWrong,
}: DetectionResultCardProps) {
  const { t, lang } = useLang();
  const trans = getSignTranslation(label);

  // Category label localized (falls back to raw value for unknown categories)
  const catKey = category ? `cat${category.charAt(0).toUpperCase()}${category.slice(1).toLowerCase()}` : "";
  const catDict = t as (k: string) => string;
  const catLabel = category
    ? (["catGeneral", "catProhibitory", "catMandatory", "catWarning", "catInformation"].includes(catKey)
        ? catDict(catKey)
        : category)
    : "";

  return (
    <div
      className={`card transition-all border-l-4 ${
        isHovered ? "border-l-signal bg-signal/5 shadow-md translate-x-1" : "border-l-go"
      }`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Header row */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            {trans ? trans[lang].name : <AutoTranslateText text={label} />}
            <button onClick={onSpeak} className="text-slate-400 hover:text-signal transition p-1" title={t("readAloud")}>
              <Volume2 size={16} />
            </button>
            {confidence > 0.8 && <CheckCircle2 size={16} className="text-go shrink-0" />}
          </h3>
          {category && (
            <span className="text-[10px] font-semibold tracking-wider uppercase bg-slate-100 dark:bg-asphalt-700 text-slate-500 px-1.5 py-0.5 rounded mt-1 inline-block">
              {catLabel}
            </span>
          )}
        </div>
        <span className="rounded-full bg-go/10 px-2.5 py-1 text-xs font-bold text-go shrink-0">
          {(confidence * 100).toFixed(1)}%
        </span>
      </div>

      {/* Meaning — auto-translated to the current language */}
      {meaning && !trans && (
        <AutoTranslateText
          as="p"
          text={meaning}
          className="mt-3 text-sm text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-asphalt-700 pt-2.5 leading-relaxed"
        />
      )}

      {/* 3-Language translation block */}
      {trans && (
        <div className="mt-3 border-t border-slate-100 dark:border-asphalt-700 pt-3 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t("signIn3Lang")}</p>
          {(["en", "ta", "si"] as const).map(lang => (
            <div key={lang} className="rounded-xl bg-slate-50 dark:bg-asphalt-700/60 px-3 py-2 space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-base">{LANG_FLAGS[lang]}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{LANG_LABELS[lang]}</span>
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{trans[lang].name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">{trans[lang].meaning}</p>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-asphalt-700 pt-2 text-xs">
        <span className="text-slate-400">{t("highwayCompliant")}</span>
        <button onClick={onReportWrong} className="text-alert font-medium hover:underline flex items-center gap-1">
          <AlertTriangle size={12} /> {t("correctPrediction")}
        </button>
      </div>
    </div>
  );
}
