import { useCallback, useRef, useState } from "react";
import type { Lang } from "@/types";

const LOCALE: Record<Lang, string> = { en: "en-US", ta: "ta-IN", si: "si-LK" };

export function useSpeech(lang: Lang) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);

  const speak = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = LOCALE[lang];
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }, [lang]);

  const listen = useCallback((onResult: (text: string) => void) => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition not supported in this browser."); return; }
    const rec = new SR();
    rec.lang = LOCALE[lang];
    rec.interimResults = false;
    rec.onresult = (e: any) => onResult(e.results[0][0].transcript);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }, [lang]);

  const stop = useCallback(() => { recRef.current?.stop(); setListening(false); }, []);

  return { speak, listen, stop, listening };
}
