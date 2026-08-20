import { useEffect, useState } from "react";
import { FineApi, ForeignDriverApi, AssistantApi } from "@/services/api";
import { useLang } from "@/context/LanguageContext";
import { useSpeech } from "@/hooks/useSpeech";
import { Volume2, ArrowLeftRight, Sparkles, BookOpen, Info, Globe, HelpCircle, AlertCircle } from "lucide-react";

const FAQ_CHIPS = {
  en: [
    { title: "Licence Endorsement", q: "How do I get a Sri Lankan endorsement for my foreign driving licence?" },
    { title: "Left-side Traffic", q: "What should tourists watch out for when driving on the left in Sri Lanka?" },
    { title: "Toll Gates / Expressways", q: "What are the expressway speed limits and toll payment rules in Sri Lanka?" },
    { title: "Left Turn on Red", q: "Can I turn left on a red traffic signal in Sri Lanka?" },
  ],
  ta: [
    { title: "உரிம ஒப்புதல்", q: "எனது வெளிநாட்டு ஓட்டுநர் உரிமத்திற்கு இலங்கை ஒப்புதல் பெறுவது எப்படி?" },
    { title: "இடது பக்க போக்குவரத்து", q: "இலங்கையில் இடதுபுறத்தில் வாகனம் ஓட்டும்போது சுற்றுலாப் பயணிகள் எதை கவனிக்க வேண்டும்?" },
    { title: "சுங்கச்சாவடி / விரைவுச்சாலைகள்", q: "இலங்கையில் அதிவேக நெடுஞ்சாலை வேக வரம்புகள் மற்றும் சுங்க கட்டணம் செலுத்தும் விதிகள் என்ன?" },
    { title: "சிவப்பில் இடது திருப்பம்", q: "இலங்கையில் சிவப்பு டிராஃபிக் சிக்னலில் இடதுபுறம் திரும்பலாமா?" },
  ],
  si: [
    { title: "බලපත්‍ර අනුමැතිය", q: "මගේ විදේශීය රියදුරු බලපත්‍රය සඳහා ශ්‍රී ලංකා අනුමැතිය ලබා ගන්නේ කෙසේද?" },
    { title: "වම් පස රථවාහන ධාවනය", q: "ශ්‍රී ලංකාවේ වම්පසින් රිය පදවන විට සංචාරකයින් සැලකිලිමත් විය යුතු කරුණු මොනවාද?" },
    { title: "අධිවේගී මාර්ග නීති", q: "ශ්‍රී ලංකාවේ අධිවේගී මාර්ගවල වේග සීමාවන් සහ ගාස්තු ගෙවීමේ නීති මොනවාද?" },
    { title: "රතු එළියේදී වමට හැරවීම", q: "ශ්‍රී ලංකාවේ රතු සංඥා එළියක් තිබියදී වමට හැරවිය හැකිද?" },
  ],
};

const defaultTips = [
  { title: "Drive on the LEFT", body: "Sri Lanka drives on the left-hand side of the road. Keep left and overtake only from the right." },
  { title: "Licensing Requirements", body: "Ensure you have an International Driving Permit (IDP) endorsed by the Automobile Association of Ceylon (AAC) in Colombo." },
  { title: "Watch out for Tuks & Buses", body: "Three-wheelers and public buses frequently halt abruptly without signaling. Maintain extra gap distance." },
];

export default function ForeignDriverPage() {
  const { t, lang } = useLang();
  const { speak } = useSpeech(lang);

  const [offences, setOffences] = useState<Record<string, number>>({});
  const [currencies, setCurrencies] = useState<string[]>([]);
  const [convertError, setConvertError] = useState<string | null>(null);

  const [selectedOffence, setSelectedOffence] = useState("");
  const [lkrAmount, setLkrAmount] = useState<number>(0);
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [foreignAmount, setForeignAmount] = useState<number>(0);
  const [exchangeRate, setExchangeRate] = useState<number>(305.0);
  const [isToLkr, setIsToLkr] = useState<boolean>(true);
  const [busy, setBusy] = useState(false);

  const [aiExplain, setAiExplain] = useState("");
  const [explaining, setExplaining] = useState(false);
  const [customQuery, setCustomQuery] = useState("");
  const [customAnswer, setCustomAnswer] = useState("");
  const [askingCustom, setAskingCustom] = useState(false);

  const initData = async () => {
    try {
      const offs = await FineApi.offences();
      setOffences(offs);
      const firstOff = Object.keys(offs)[0] || "";
      setSelectedOffence(firstOff);

      const currs = await FineApi.currencies();
      setCurrencies(currs.filter((c) => c !== "LKR"));

      const defaultLkr = offs[firstOff] || 0;
      setLkrAmount(defaultLkr);

      const defaultRate = 305.0;
      setExchangeRate(defaultRate);
      setForeignAmount(Number((defaultLkr / defaultRate).toFixed(2)));
    } catch (err) {
      console.error("Failed to load foreign assistant settings:", err);
      setOffences({
        "Exceeding speed limit": 3000,
        "Not wearing seat belt": 1000,
        "Using mobile phone while driving": 2000,
        "Driving without licence": 25000,
      });
      setSelectedOffence("Exceeding speed limit");
      setLkrAmount(3000);
      setCurrencies(["USD", "EUR", "GBP", "INR", "AUD", "CAD"]);
      setForeignAmount(9.84);
      setExchangeRate(305.0);
    }
  };

  useEffect(() => {
    initData();
  }, []);

  const handleOffenceChange = (off: string) => {
    setSelectedOffence(off);
    const amount = offences[off] || 0;
    setLkrAmount(amount);
    setForeignAmount(Number((amount / exchangeRate).toFixed(2)));
    setAiExplain("");
    setConvertError(null);
  };

  const handleLkrChange = (val: number) => {
    setLkrAmount(val);
    if (exchangeRate > 0) {
      setForeignAmount(Number((val / exchangeRate).toFixed(2)));
    }
  };

  const handleForeignChange = (val: number) => {
    setForeignAmount(val);
    if (exchangeRate > 0) {
      setLkrAmount(Math.round(val * exchangeRate));
    }
  };

  const handleConvert = async () => {
    setBusy(true);
    setExplaining(true);
    setAiExplain("");
    setCustomAnswer("");
    setConvertError(null);
    try {
      const res = await ForeignDriverApi.fineConvert(
        selectedOffence,
        isToLkr ? foreignAmount : lkrAmount,
        selectedCurrency,
        isToLkr
      );
      setExchangeRate(res.exchange_rate);
      if (isToLkr) {
        setLkrAmount(res.converted_amount);
      } else {
        setForeignAmount(res.converted_amount);
      }
      setAiExplain(res.offence_explanation);
      setCustomAnswer(res.tourist_guidance);
    } catch (err: any) {
      console.error(err);
      setConvertError(err.message || "Currency conversion failed. Please try again.");
    } finally {
      setBusy(false);
      setExplaining(false);
    }
  };

  const askCustomQuestion = async (queryText: string) => {
    if (!queryText.trim()) return;
    setCustomQuery(queryText);
    setAskingCustom(true);
    setCustomAnswer("");

    try {
      const res = await AssistantApi.chat(`Foreign tourist driver in Sri Lanka asks: ${queryText}`, lang);
      setCustomAnswer(res.reply);
    } catch (err) {
      console.error(err);
      setCustomAnswer("Failed to load tourist advice from AI. Please try again.");
    } finally {
      setAskingCustom(false);
    }
  };

  const faqs = FAQ_CHIPS[lang] || FAQ_CHIPS.en;

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-bold font-display">{t("foreign") || "Tourist Guide"}</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Convert LKR fines from foreign currencies, explain traffic regulations, and fetch tourist driving safety tips.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Interactive Currency & Fine Calculator */}
        <div className="lg:col-span-6 space-y-4">
          <div className="card space-y-5">
            <h2 className="text-lg font-bold font-display tracking-tight flex items-center gap-2 border-b border-slate-100 dark:border-asphalt-700 pb-2">
              <ArrowLeftRight size={18} className="text-signal" /> Fine Currency Converter
            </h2>

            {/* Conversion Direction */}
            <div className="flex gap-4 border-b border-slate-50 dark:border-asphalt-750 pb-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-350 cursor-pointer">
                <input type="radio" name="direction" checked={isToLkr} onChange={() => setIsToLkr(true)} className="text-signal" />
                <span>Convert Foreign to LKR</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-350 cursor-pointer">
                <input type="radio" name="direction" checked={!isToLkr} onChange={() => setIsToLkr(false)} className="text-signal" />
                <span>Convert LKR to Foreign</span>
              </label>
            </div>

            {/* Offence Dropdown */}
            <div className="space-y-1.5">
              <label className="label">Select Local Traffic Offence</label>
              <select className="input py-2 text-sm" value={selectedOffence} onChange={(e) => handleOffenceChange(e.target.value)}>
                {Object.keys(offences).map((off) => (
                  <option key={off} value={off}>{off} (LKR {offences[off]})</option>
                ))}
              </select>
            </div>

            {/* Inputs: LKR and Foreign Amount */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="label">Fine Value (LKR)</label>
                <div className="relative">
                  <input type="number" className="input pr-10 text-sm font-semibold" value={lkrAmount || ""} onChange={(e) => handleLkrChange(Number(e.target.value))} disabled={isToLkr} />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">LKR</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="label">Foreign Amount</label>
                <div className="flex gap-2">
                  <select className="input w-[90px] py-2 text-xs font-bold shrink-0" value={selectedCurrency} onChange={(e) => setSelectedCurrency(e.target.value)}>
                    {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <div className="relative flex-1">
                    <input type="number" className="input pr-12 text-sm font-semibold" value={foreignAmount || ""} onChange={(e) => handleForeignChange(Number(e.target.value))} disabled={!isToLkr} />
                    <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">{selectedCurrency}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Exchange rate info */}
            <div className="bg-slate-50 dark:bg-asphalt-700/40 p-3 rounded-xl border border-slate-100 dark:border-asphalt-700 flex justify-between items-center text-xs text-slate-500">
              <span className="flex items-center gap-1"><Globe size={14} className="text-slate-400" /> Live Exchange Rate:</span>
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">1 {selectedCurrency} = {exchangeRate.toFixed(2)} LKR</span>
            </div>

            {/* Error banner */}
            {convertError && (
              <div className="flex items-start gap-2 rounded-xl border border-alert/30 bg-alert/5 px-3 py-2">
                <AlertCircle size={14} className="text-alert shrink-0 mt-0.5" />
                <p className="text-xs text-alert">{convertError}</p>
              </div>
            )}

            {/* Convert button */}
            <button onClick={handleConvert} className="btn-primary w-full flex items-center justify-center gap-2 py-2.5" disabled={busy || explaining}>
              <Sparkles size={16} /> Convert & Explain Regulation
            </button>
          </div>

          {/* Quick Drive tips */}
          <div className="grid gap-3 sm:grid-cols-3">
            {defaultTips.map((tip, idx) => (
              <div key={idx} className="card p-3.5 space-y-1 bg-white dark:bg-asphalt-800 border-l-4 border-l-signal">
                <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">{tip.title}</h4>
                <p className="text-[10px] text-slate-500 leading-relaxed">{tip.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: AI Explainer and FAQs */}
        <div className="lg:col-span-6 space-y-4 flex flex-col">
          {explaining && (
            <div className="card flex flex-col items-center justify-center p-8 space-y-3 flex-1 bg-white dark:bg-asphalt-800">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-signal"></div>
              <p className="text-xs text-slate-500">Consulting Sri Lankan driving codes...</p>
            </div>
          )}

          {!explaining && aiExplain && (
            <div className="card space-y-3 border-l-4 border-l-go flex-1 relative bg-go/5">
              <button onClick={() => speak(`${aiExplain}. ${customAnswer}`)} className="absolute top-4 right-4 text-go hover:text-go/70 transition p-2 rounded-xl" title="Read aloud">
                <Volume2 size={16} />
              </button>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 font-display text-lg">
                <BookOpen size={16} className="text-go" /> AI Offence Breakdown
              </h3>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Offence: {selectedOffence}</p>
              <div className="space-y-3">
                <div className="bg-white dark:bg-asphalt-800 p-3 rounded-xl border border-go/10">
                  <h4 className="font-bold text-xs text-slate-700 dark:text-slate-350 mb-1">Regulation Explanation</h4>
                  <p className="text-xs text-slate-650 dark:text-slate-350 whitespace-pre-line leading-relaxed">{aiExplain}</p>
                </div>
                {customAnswer && (
                  <div className="bg-white dark:bg-asphalt-800 p-3 rounded-xl border border-go/10">
                    <h4 className="font-bold text-xs text-slate-700 dark:text-slate-350 mb-1">Tourist Safe Road Guidance</h4>
                    <p className="text-xs text-slate-650 dark:text-slate-350 whitespace-pre-line leading-relaxed">{customAnswer}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {!explaining && !aiExplain && (
            <div className="card flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500 text-xs">
              <Info size={24} className="text-slate-300 dark:text-asphalt-700 mb-2" />
              Click "Convert & Explain Regulation" to calculate the fine and pull detailed road rules, safety penalties, and tourist advice for the selected Sri Lankan violation.
            </div>
          )}

          {/* Tourist FAQs */}
          <div className="card space-y-3 bg-white dark:bg-asphalt-800">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5 border-b border-slate-100 dark:border-asphalt-700 pb-2 font-display">
              <HelpCircle size={14} /> Tourist FAQ Copilot
            </h2>
            <div className="flex flex-wrap gap-2">
              {faqs.map((faq, idx) => (
                <button key={idx} onClick={() => askCustomQuestion(faq.q)}
                  className="bg-slate-50 dark:bg-asphalt-700/50 hover:bg-signal/15 hover:text-signal dark:hover:bg-signal/15 text-[10px] font-medium text-slate-650 dark:text-slate-350 px-3 py-1.5 rounded-full border border-slate-200 dark:border-asphalt-700 transition">
                  {faq.title}
                </button>
              ))}
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-asphalt-700">
              <div className="flex gap-2">
                <input type="text" className="input text-xs py-2" placeholder="Ask a custom tourist driving rule..." value={customQuery}
                  onChange={(e) => setCustomQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && askCustomQuestion(customQuery)} />
                <button onClick={() => askCustomQuestion(customQuery)} className="btn-primary py-2 px-3 text-xs shrink-0" disabled={askingCustom || !customQuery.trim()}>Ask</button>
              </div>

              {askingCustom && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-signal"></div>
                  Generating safety tips...
                </div>
              )}

              {!askingCustom && customAnswer && !aiExplain && (
                <div className="bg-slate-50 dark:bg-asphalt-900/50 p-3 rounded-xl border border-slate-100 dark:border-asphalt-700 space-y-2 relative">
                  <button onClick={() => speak(customAnswer)} className="absolute top-2 right-2 text-slate-450 hover:text-signal transition" title="Read aloud">
                    <Volume2 size={14} />
                  </button>
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">AI Safety Copilot Answer</h4>
                  <p className="text-xs text-slate-650 dark:text-slate-350 whitespace-pre-line leading-relaxed pr-6">{customAnswer}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
