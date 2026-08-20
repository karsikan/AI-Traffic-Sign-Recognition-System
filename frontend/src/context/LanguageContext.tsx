import { createContext, useContext, useState, ReactNode } from "react";
import { getDict, TranslationKey } from "@/locales";
import type { Lang } from "@/types";

const Ctx = createContext<{
  lang: Lang; setLang: (l: Lang) => void; t: (k: TranslationKey) => string;
}>(null!);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(
    (localStorage.getItem("lang") as Lang) || "en"
  );
  const setLang = (l: Lang) => { setLangState(l); localStorage.setItem("lang", l); };
  const t = (k: TranslationKey) => getDict(lang)[k];
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}
export const useLang = () => useContext(Ctx);
