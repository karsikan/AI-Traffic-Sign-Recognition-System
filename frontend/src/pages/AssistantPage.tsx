import { useEffect, useRef, useState } from "react";
import { AssistantApi } from "@/services/api";
import { useLang } from "@/context/LanguageContext";
import { useSpeech } from "@/hooks/useSpeech";
import { Sparkles, MessageSquare, History } from "lucide-react";
import type { Lang } from "@/types";
import ChatBubble from "@/components/assistant/ChatBubble";
import ChatInput from "@/components/assistant/ChatInput";
import SuggestionChips from "@/components/assistant/SuggestionChips";

interface Msg {
  role: "user" | "assistant";
  text: string;
  timestamp: string;
}

// Dynamic context-aware quick suggestions
const SUGGESTIONS: Record<string, Record<Lang, string[]>> = {
  sign_help: {
    en: [
      "What does a red circular sign mean?",
      "Explain the mandatory roundabout sign requirements",
      "What is the difference between warning and prohibitory signs?",
      "Are warning signs always triangular?"
    ],
    ta: [
      "சிவப்பு வட்ட அடையாளம் என்ன குறிக்கிறது?",
      "வட்டச்சுற்று அடையாள தேவைகளை விளக்குங்கள்",
      "எச்சரிக்கை மற்றும் தடை அடையாளங்களுக்கு என்ன வித்தியாசம்?",
      "எச்சரிக்கை அடையாளங்கள் எப்போதும் முக்கோணமாக இருக்குமா?"
    ],
    si: [
      "රතු රවුම් සංඥාවෙන් අදහස් කරන්නේ කුමක්ද?",
      "වටරවුම් සංඥා නීති පැහැදිලි කරන්න",
      "එදිරිවාදි සහ අවවාදාත්මක සංඥා අතර වෙනස කුමක්ද?",
      "අවවාදාත්මක සංඥා සැමවිටම ත්‍රිකෝණාකාර වේද?"
    ]
  },
  road_rule: {
    en: [
      "What are roundabout rules in Sri Lanka?",
      "What is the speed limit on the Southern Expressway?",
      "What does a double continuous white center line mean?",
      "Sri Lankan traffic rules for overtaking on the left"
    ],
    ta: [
      "இலங்கையில் வட்டச்சுற்று விதிகள் என்ன?",
      "தெற்கு அதிவேக நெடுஞ்சாலையில் வேக வரம்பு என்ன?",
      "இரட்டை தொடர்ச்சியான வெள்ளை கோடு என்ன குறிக்கிறது?",
      "இடதுபுறத்தில் முந்துவதற்கான இலங்கை போக்குவரத்து விதிகள்"
    ],
    si: [
      "ශ්‍රී ලංකාවේ වටරවුම් නීති මොනවාද?",
      "දක්ෂිණ අධිවේගී මාර්ගයේ වේග සීමාව කොපමණද?",
      "ද්විත්ව නොකඩවා ඇඳි සුදු මැද ඉරෙන් අදහස් කරන්නේ කුමක්ද?",
      "වම්පසින් ඉස්සර කිරීම පිළිබඳ ශ්‍රී ලංකාවේ මාර්ග නීති"
    ]
  },
  emergency: {
    en: [
      "What to do immediately after a minor road accident?",
      "How do I request a breakdown vehicle garage?",
      "First aid safety guidance for road injuries",
      "What is the expressway emergency hotline number?"
    ],
    ta: [
      "சிறிய சாலை விபத்துக்குப் பிறகு உடனடியாக என்ன செய்ய வேண்டும்?",
      "பழுதுபார்க்கும் கேரேஜை எவ்வாறு கோருவது?",
      "சாலை காயங்களுக்கான முதலுதவி பாதுகாப்பு வழிகாட்டி",
      "அதிவேக நெடுஞ்சாலை அவசர உதவி எண் என்ன?"
    ],
    si: [
      "සුළු රිය අනතුරකින් පසු වහාම කළ යුත්තේ කුමක්ද?",
      "වාහන අලුත්වැඩියා ගරාජයක් ලබා ගන්නේ කෙසේද?",
      "මාර්ග අනතුරු තුවාල සඳහා ප්‍රථමාධාර මාර්ගෝපදේශය",
      "අධිවේගී මාර්ගයේ හදිසි ඇමතුම් අංකය කුමක්ද?"
    ]
  },
  tourist_help: {
    en: [
      "How do tourists get a driving license endorsement in Colombo?",
      "What is the speed limit for cars on Sri Lankan highways?",
      "Are there any expressway tolls for tourists?",
      "Tips for driving on the left-side in Sri Lanka"
    ],
    ta: [
      "சுற்றுலாப் பயணிகள் கொழும்பில் ஓட்டுநர் உரிம ஒப்புதல் பெறுவது எப்படி?",
      "இலங்கை நெடுஞ்சாலைகளில் கார்களுக்கான வேக வரம்பு என்ன?",
      "சுற்றுலாப் பயணிகளுக்கு அதிவேக நெடுஞ்சாலை சுங்கக் கட்டணம் உண்டா?",
      "இலங்கையில் இடதுபுறத்தில் வாகனம் ஓட்டுவதற்கான குறிப்புகள்"
    ],
    si: [
      "සංචාරකයින් කොළඹදී රියදුරු බලපත්‍ර අනුමැතිය ලබා ගන්නේ කෙසේද?",
      "ලංකාවේ මහාමාර්ගවල කාර් සඳහා වේග සීමාව කොපමණද?",
      "සංචාරකයින් සඳහා අධිවේගී මාර්ග ගාස්තු තිබේද?",
      "ශ්‍රී ලංකාවේ වම්පසින් රිය පැදවීමේදී සැලකිලිමත් විය යුතු කරුණු"
    ]
  }
};

export default function AssistantPage() {
  const { t, lang } = useLang();
  const { speak, listen, stop, listening } = useSpeech(lang);
  
  const [contextType, setContextType] = useState<string>("road_rule");
  const [msgs, setMsgs] = useState<Msg[]>(() => {
    const cached = sessionStorage.getItem("chat_history");
    return cached ? JSON.parse(cached) : [];
  });
  
  const [busy, setBusy] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Sync to session storage
  useEffect(() => {
    sessionStorage.setItem("chat_history", JSON.stringify(msgs));
  }, [msgs]);

  // Auto scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, busy]);

  const ask = async (question: string) => {
    if (!question.trim() || busy) return;
    
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMsgs((prev) => [...prev, { role: "user", text: question, timestamp }]);
    setBusy(true);

    try {
      const res = await AssistantApi.chat(question, lang, contextType);
      setMsgs((prev) => [
        ...prev,
        { role: "assistant", text: res.reply, timestamp },
      ]);
    } catch (err: any) {
      console.error(err);
      setMsgs((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Sorry, I am having trouble connecting to Gemini. Please try again.",
          timestamp,
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const handleStartListen = () => {
    listen((text) => {
      if (text.trim()) {
        ask(text);
      }
    });
  };

  const handleSpeak = (text: string) => {
    speak(text);
  };

  const currentSuggestions = SUGGESTIONS[contextType]?.[lang] || SUGGESTIONS.road_rule[lang] || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display">{t("assistant")}</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Ask Gemini about road regulations, driving laws, traffic signs, and emergency guidelines in Sri Lanka.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Quick Suggestions & Session History */}
        <div className="lg:col-span-4 space-y-4 flex flex-col">
          {/* Context Guide Box */}
          <div className="card space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5 border-b border-slate-100 dark:border-asphalt-700 pb-2">
              <Sparkles size={14} className="text-signal" /> Assistant Category Context
            </h2>
            <div className="space-y-2">
              <select
                className="input py-2.5 text-xs font-bold text-slate-700 dark:text-slate-350 cursor-pointer"
                value={contextType}
                onChange={(e) => setContextType(e.target.value)}
              >
                <option value="sign_help">🚦 Traffic Sign Meanings</option>
                <option value="road_rule">📖 Sri Lankan Highway Code</option>
                <option value="emergency">🚨 Emergency & First Aid Guide</option>
                <option value="tourist_help">✈️ Foreign Driver / Tourist Guide</option>
              </select>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal">
                Selecting a category updates the AI context prompts and dynamically re-loads suggested helper questions.
              </p>
            </div>
          </div>

          {/* Predefined Suggestions */}
          <div className="card space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <Sparkles size={14} className="text-signal" /> Suggested Questions
            </h2>
            <SuggestionChips onChipClick={ask} suggestions={currentSuggestions} />
          </div>

          {/* Quick Clear Card */}
          <div className="card space-y-3 flex-1 flex flex-col justify-between min-h-[140px]">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5 border-b border-slate-100 dark:border-asphalt-700 pb-2">
                <History size={14} /> Active Session Logs
              </h2>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Your conversations are stored locally on your device for privacy. No login data is recorded.
              </p>
            </div>
            {msgs.length > 0 && (
              <button
                onClick={() => setMsgs([])}
                className="btn-ghost text-xs w-full py-2 hover:bg-alert/10 hover:text-alert hover:border-alert/30"
              >
                Clear Conversation
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Live Chat Screen */}
        <div className="lg:col-span-8">
          <div className="card flex h-[70vh] flex-col p-4">
            {/* Header info */}
            <div className="border-b border-slate-100 dark:border-asphalt-700 pb-3 mb-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-signal/20 flex items-center justify-center text-signal">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 font-display">
                    Gemini AI Safety Assistant
                  </h3>
                  <p className="text-[10px] text-go font-medium">Ready</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-mono uppercase bg-slate-50 dark:bg-asphalt-750 px-2.5 py-1 rounded-full border border-slate-200 dark:border-asphalt-700">
                  {lang === "en" ? "English" : lang === "ta" ? "Tamil" : "Sinhala"}
                </span>
              </div>
            </div>

            {/* Chat Messages Log */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {msgs.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 dark:text-slate-500 p-8 space-y-3">
                  <MessageSquare size={36} className="text-slate-300 dark:text-asphalt-700" />
                  <div>
                    <p className="font-semibold text-slate-600 dark:text-slate-400 font-display">
                      Welcome to your Road Safety Copilot
                    </p>
                    <p className="text-xs max-w-sm mt-1 leading-relaxed">
                      Start dictating or type questions about traffic regulations, speed guidelines, licensing, or highway safety in Sri Lanka.
                    </p>
                  </div>
                </div>
              )}

              {msgs.map((m, i) => (
                <ChatBubble
                  key={i}
                  sender={m.role}
                  text={m.text}
                  timestamp={m.timestamp}
                  onSpeak={m.role === "assistant" ? () => handleSpeak(m.text) : undefined}
                />
              ))}

              {busy && (
                <div className="flex items-start gap-2.5">
                  <div className="h-7 w-7 rounded-full bg-slate-200 dark:bg-asphalt-750 flex items-center justify-center text-slate-500 shrink-0 text-xs font-bold mt-0.5 animate-pulse">
                    AI
                  </div>
                  <div className="bg-slate-100 dark:bg-asphalt-800 text-slate-500 dark:text-slate-400 rounded-2xl rounded-tl-none px-4 py-3 text-xs flex items-center gap-2 border border-slate-200 dark:border-asphalt-700">
                    <span className="flex h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" />
                    <span className="flex h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="flex h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                    <span>Thinking...</span>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input Bar */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-asphalt-700">
              <ChatInput
                onSendMessage={ask}
                listening={listening}
                onStartListen={handleStartListen}
                onStopListen={stop}
                placeholder={t("askQuestion")}
                disabled={busy}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
