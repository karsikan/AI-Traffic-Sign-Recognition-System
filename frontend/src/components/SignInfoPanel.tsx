import type { TrafficSign } from "@/types";
import { ShieldAlert, Info, BookText, Volume2 } from "lucide-react";
import AutoTranslateText from "./AutoTranslateText";
import { useLang } from "@/context/LanguageContext";
import { useSpeech } from "@/hooks/useSpeech";

export default function SignInfoPanel({ sign }: { sign: TrafficSign }) {
  const { lang } = useLang();
  const { speak } = useSpeech(lang);

  const handleSpeak = () => {
    speak(`${sign.name}. Meaning: ${sign.meaning}. Safety guideline: ${sign.safety_instruction}. Traffic rule: ${sign.traffic_rule}`);
  };

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-1.5">
          <AutoTranslateText text={sign.name} />
          <button
            onClick={handleSpeak}
            className="text-slate-400 hover:text-signal transition p-1"
            title="Read sign meaning and rules aloud"
          >
            <Volume2 size={16} />
          </button>
        </h3>
        <span className="rounded-full bg-signal/15 px-3 py-1 text-xs font-medium text-signal capitalize">
          <AutoTranslateText text={sign.category} />
        </span>
      </div>
      <p className="flex gap-2 text-sm">
        <Info size={16} className="mt-0.5 shrink-0 text-go" />
        <AutoTranslateText text={sign.meaning} />
      </p>
      <p className="flex gap-2 text-sm">
        <ShieldAlert size={16} className="mt-0.5 shrink-0 text-alert" />
        <AutoTranslateText text={sign.safety_instruction} />
      </p>
      <p className="flex gap-2 text-sm">
        <BookText size={16} className="mt-0.5 shrink-0 text-signal" />
        <AutoTranslateText text={sign.traffic_rule} />
      </p>
    </div>
  );
}
