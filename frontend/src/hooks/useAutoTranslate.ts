import { useState, useEffect } from "react";
import { AssistantApi } from "@/services/api";
import type { Lang } from "@/types";

export function useAutoTranslate(text: string, targetLang: Lang) {
  const [translated, setTranslated] = useState(text);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!text || !text.trim()) {
      setTranslated("");
      return;
    }

    if (targetLang === "en") {
      setTranslated(text);
      return;
    }

    const cacheKey = `tr:${targetLang}:${text}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      setTranslated(cached);
      return;
    }

    setLoading(true);
    AssistantApi.translate(text, targetLang)
      .then((res) => {
        let finalTranslation = res.translated_text || text;
        if (finalTranslation.startsWith("[Translation offline]") || finalTranslation.startsWith("[Translation error]")) {
          finalTranslation = text;
        }
        setTranslated(finalTranslation);
        sessionStorage.setItem(cacheKey, finalTranslation);
      })
      .catch(() => {
        setTranslated(text);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [text, targetLang]);

  return { translated, loading };
}
