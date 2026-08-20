import { useLang } from "@/context/LanguageContext";
import { translations, type TranslationKey } from "@/i18n/translations";

export function useT() {
  const { lang } = useLang();
  const t = (key: TranslationKey): string => {
    return (translations[lang] as Record<string, string>)[key]
      ?? (translations.en as Record<string, string>)[key]
      ?? key;
  };
  return { t, lang };
}
