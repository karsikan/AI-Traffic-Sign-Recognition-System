import { useState } from "react";
import { AssistantApi } from "@/services/api";
import { useLang } from "@/context/LanguageContext";
import { useSpeech } from "@/hooks/useSpeech";
import { Languages, Volume2, Copy, RotateCcw, ArrowRight, CheckCircle } from "lucide-react";
import type { Lang } from "@/types";

const LANGUAGES: { code: Lang; label: string; native: string; flag: string }[] = [
  { code: "en", label: "English",  native: "English",  flag: "🇬🇧" },
  { code: "ta", label: "Tamil",    native: "தமிழ்",     flag: "🇱🇰" },
  { code: "si", label: "Sinhala",  native: "සිංහල",    flag: "🇱🇰" },
];

const QUICK_PHRASES = [
  { en: "Please slow down.", ta: "", si: "" },
  { en: "Where is the nearest hospital?", ta: "", si: "" },
  { en: "I need help. There has been an accident.", ta: "", si: "" },
  { en: "What does this traffic sign mean?", ta: "", si: "" },
  { en: "Speed limit is 60 km/h on this road.", ta: "", si: "" },
  { en: "No U-turn is allowed here.", ta: "", si: "" },
  { en: "Please call the police — 119.", ta: "", si: "" },
  { en: "I am a foreign driver. Please help me.", ta: "", si: "" },
];

export default function TranslationPage() {
  const { lang } = useLang();
  const { speak } = useSpeech(lang);

  const [inputText, setInputText] = useState("");
  const [sourceLang, setSourceLang] = useState<Lang>("en");
  const [targetLang, setTargetLang] = useState<Lang>("ta");
  const [translated, setTranslated] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick phrases translated on demand
  const [phraseResults, setPhraseResults] = useState<Record<number, string>>({});
  const [phraseLoading, setPhraseLoading] = useState<number | null>(null);

  const swap = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setInputText(translated || inputText);
    setTranslated("");
  };

  const doTranslate = async () => {
    if (!inputText.trim()) return;
    setBusy(true);
    setError(null);
    setTranslated("");
    try {
      const res = await AssistantApi.translate(inputText.trim(), targetLang);
      setTranslated(res.translated_text || inputText);
    } catch (err: any) {
      setError("Translation failed. Please try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(translated).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const translatePhrase = async (idx: number, phrase: string) => {
    if (phraseResults[idx]) return; // already translated
    setPhraseLoading(idx);
    try {
      const res = await AssistantApi.translate(phrase, targetLang);
      setPhraseResults(prev => ({ ...prev, [idx]: res.translated_text || phrase }));
    } catch {
      setPhraseResults(prev => ({ ...prev, [idx]: phrase }));
    } finally {
      setPhraseLoading(null);
    }
  };

  const translateAllPhrases = async () => {
    setPhraseLoading(-1);
    try {
      const texts = QUICK_PHRASES.map(p => p.en);
      const res = await AssistantApi.translateBatch(texts, targetLang);
      const map: Record<number, string> = {};
      res.translations.forEach((t, i) => { map[i] = t; });
      setPhraseResults(map);
    } catch {
      // fallback: translate individually
    } finally {
      setPhraseLoading(null);
    }
  };

  const targetLabel = LANGUAGES.find(l => l.code === targetLang)?.native || targetLang;

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold font-display flex items-center gap-2">
          <Languages className="text-signal" size={28} />
          Multilingual Translation
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Translate road safety information between English, Tamil, and Sinhala.
        </p>
      </div>

      {/* Main Translator */}
      <div className="card space-y-4">
        {/* Language selector row */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Source language */}
          <div className="flex gap-1">
            {LANGUAGES.map(l => (
              <button
                key={l.code}
                onClick={() => setSourceLang(l.code)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  sourceLang === l.code
                    ? "bg-signal text-asphalt-900"
                    : "bg-slate-100 dark:bg-asphalt-700 hover:bg-slate-200 dark:hover:bg-asphalt-600"
                }`}
              >
                {l.flag} {l.native}
              </button>
            ))}
          </div>

          {/* Swap button */}
          <button
            onClick={swap}
            className="btn-ghost p-2 rounded-full rotate-0 hover:rotate-180 transition-transform duration-300"
            title="Swap languages"
          >
            <ArrowRight size={18} className="text-signal" />
          </button>

          {/* Target language */}
          <div className="flex gap-1">
            {LANGUAGES.filter(l => l.code !== sourceLang).map(l => (
              <button
                key={l.code}
                onClick={() => { setTargetLang(l.code); setTranslated(""); setPhraseResults({}); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  targetLang === l.code
                    ? "bg-go text-white"
                    : "bg-slate-100 dark:bg-asphalt-700 hover:bg-slate-200 dark:hover:bg-asphalt-600"
                }`}
              >
                {l.flag} {l.native}
              </button>
            ))}
          </div>
        </div>

        {/* Text areas side by side */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {LANGUAGES.find(l => l.code === sourceLang)?.native}
            </label>
            <textarea
              className="input w-full h-36 resize-none text-sm leading-relaxed"
              placeholder="Type road safety text to translate..."
              value={inputText}
              onChange={e => { setInputText(e.target.value); setTranslated(""); }}
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">{inputText.length} chars</span>
              <button
                className="text-xs text-slate-400 hover:text-slate-600"
                onClick={() => { setInputText(""); setTranslated(""); }}
              >
                <RotateCcw size={12} className="inline mr-1" />Clear
              </button>
            </div>
          </div>

          {/* Output */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {targetLabel}
            </label>
            <div className={`relative w-full h-36 rounded-xl border p-3 text-sm leading-relaxed overflow-y-auto
              bg-slate-50 dark:bg-asphalt-800 border-slate-200 dark:border-asphalt-600
              ${busy ? "animate-pulse" : ""}`}
            >
              {busy && (
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <div className="animate-spin h-3 w-3 border-b-2 border-signal rounded-full" />
                  Translating...
                </div>
              )}
              {!busy && translated && (
                <p className="text-slate-800 dark:text-slate-100 whitespace-pre-wrap">{translated}</p>
              )}
              {!busy && !translated && (
                <p className="text-slate-300 dark:text-slate-600 italic">Translation will appear here</p>
              )}
            </div>

            {translated && (
              <div className="flex gap-2">
                <button
                  onClick={copyToClipboard}
                  className="btn-ghost text-xs flex items-center gap-1 py-1"
                >
                  {copied ? <CheckCircle size={12} className="text-go" /> : <Copy size={12} />}
                  {copied ? "Copied!" : "Copy"}
                </button>
                <button
                  onClick={() => speak(translated)}
                  className="btn-ghost text-xs flex items-center gap-1 py-1"
                >
                  <Volume2 size={12} /> Read aloud
                </button>
              </div>
            )}
          </div>
        </div>

        {error && (
          <p className="text-xs text-alert font-medium">{error}</p>
        )}

        <button
          className="btn-primary w-full flex items-center justify-center gap-2"
          onClick={doTranslate}
          disabled={busy || !inputText.trim()}
        >
          {busy ? (
            <><div className="animate-spin h-4 w-4 border-b-2 border-white rounded-full" /> Translating...</>
          ) : (
            <><Languages size={16} /> Translate to {targetLabel}</>
          )}
        </button>
      </div>

      {/* Quick Phrases Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold font-display">Road Safety Quick Phrases</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Common phrases for Sri Lankan road situations — translated to {targetLabel}
            </p>
          </div>
          <button
            className="btn-primary text-xs py-1.5 px-3"
            onClick={translateAllPhrases}
            disabled={phraseLoading !== null}
          >
            {phraseLoading === -1 ? "Translating..." : `Translate All to ${targetLabel}`}
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {QUICK_PHRASES.map((phrase, idx) => (
            <div
              key={idx}
              className="card p-4 space-y-2 hover:border-signal/40 transition-colors cursor-pointer"
              onClick={() => translatePhrase(idx, phrase.en)}
            >
              {/* English */}
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100 leading-snug flex-1">
                  🇬🇧 {phrase.en}
                </p>
                {phraseResults[idx] && (
                  <button
                    onClick={e => { e.stopPropagation(); speak(phraseResults[idx]); }}
                    className="text-slate-400 hover:text-signal shrink-0"
                  >
                    <Volume2 size={14} />
                  </button>
                )}
              </div>

              {/* Translation */}
              {phraseLoading === idx && (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <div className="animate-spin h-3 w-3 border-b-2 border-signal rounded-full" />
                  Translating...
                </div>
              )}
              {phraseResults[idx] && (
                <p className="text-sm text-signal font-medium leading-snug border-t border-slate-100 dark:border-asphalt-700 pt-2">
                  {LANGUAGES.find(l => l.code === targetLang)?.flag} {phraseResults[idx]}
                </p>
              )}
              {!phraseResults[idx] && phraseLoading !== idx && (
                <p className="text-xs text-slate-400 italic">Click to translate</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Language Info Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { flag: "🇬🇧", lang: "English", note: "Official language · Used in road signs, legal documents, and highway codes" },
          { flag: "🇱🇰", lang: "Tamil (தமிழ்)", note: "Official language · Widely spoken in Northern & Eastern Sri Lanka" },
          { flag: "🇱🇰", lang: "Sinhala (සිංහල)", note: "Official language · Spoken by the majority across Sri Lanka" },
        ].map((info, i) => (
          <div key={i} className="card text-center p-5 space-y-2">
            <div className="text-4xl">{info.flag}</div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100">{info.lang}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{info.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
